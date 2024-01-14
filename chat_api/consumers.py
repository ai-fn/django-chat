import base64
import datetime
import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.files import File
from django.db.models import Q

from .utils import *
from .models import Room, CustomUser, Message, Attachments
from .serializers import MessageSerialize, UserSerialize, RoomSerialize
from notifications.core import notify

logger = logging.getLogger(__name__)
users_in_groups = {}

file_extensions = {
    "audio": "ogg",
    "video": "mp4",
}


class ChatConsumer(WebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user_notif_room = None
        self.room_subscribe = None
        self.room_group_name = None
        self.room_name = None
        self.room = None
        self.actions = {
            'connect': self.connect_action,
            'add-member': self.add_member,
            'audio-message': self.audio_message,
            'attach-message': self.attach_message,
            'mark_msg_as_read': self.mark_msg_action,
            'msg-deletion': self.delete_message,
            'message': self.receive_txt_message,
            'edit-message': self.edit_message,
            'pin-message': self.pin_action,
            'unpin-message': self.unpin_action,
        }

    def connect(self) -> None:
        self.room_name = self.scope['url_route']['kwargs']['room_pk']
        self.user_notif_room = 'user_%s' % self.scope['user']
        self.room_group_name = 'chat_%s' % self.room_name
        if self.room_group_name not in users_in_groups:
            users_in_groups[self.room_group_name] = set()
        users_in_groups[self.room_group_name].add(self.scope['user'])

        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code) -> None:
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )
        if self.room_group_name in users_in_groups:
            users_in_groups[self.room_group_name].discard(self.scope['user'])

    def receive(self, text_data=None, bytes_data=None) -> None:
        text_data_json = json.loads(text_data)
        action = text_data_json['action']
        try:
            self.actions[action](text_data_json)
            return
        except KeyError:
            logger.info("Unknown action: '%s'" % action)
            if text_data_json.get("message") is not None:
                self.send_message_to_all(self.create_message(text_data_json['message']))

    def edit_message(self, text_data_json) -> None:
        msg_id = text_data_json['messageId']
        msg_body = text_data_json['messageBody']
        message = self.get_message(msg_id)
        if message is None:
            logger.info("Requested for edit message with pk %s not found" % msg_id)
            self.send(json.dumps({
                'action': 'notif',
                'message': 'Message not fount'
            }))
            return
        message.body = msg_body
        message.edited = True
        message.edited_at = datetime.datetime.now()
        message.save()
        logger.info("Message with pk %s successfully edited" % msg_id)

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'message_edition',
                'message': MessageSerialize(message).data,
            }
        )

    def message_edition(self, event):
        message = event['message']

        self.send(
            json.dumps({
                "action": "edit-message",
                "message": message
            })
        )

    def mark_msg_action(self, text_data_json) -> None:
        err = None
        try:
            self.mark_msg_as_read(text_data_json['chat_messages'])
        except KeyError as error:
            err = error
            logger.error(err)
        self.send(json.dumps({
            'action': 'mark_as_read',
            'message': 'failed' if err else 'success',
        }))

    def connect_action(self, text_data_json) -> None:
        self.room_name = text_data_json['roomName']
        self.room_subscribe = text_data_json['pk']
        self.room = self.get_room(self.room_subscribe)
        self.send(json.dumps({
            'user': UserSerialize(self.scope['user']).data,
            'action': 'connect',
            'room': RoomSerialize(self.room).data,
            'chat_messages': MessageSerialize(
                Message.objects.filter(
                    room=self.room_subscribe
                ),
                many=True
            ).data,
            'pinned_messages': MessageSerialize(
                Message.objects.filter(
                    room=self.room_subscribe, pinned=True
                ),
                many=True
            ).data,
        }))

    def pin_message(self, event):
        message = event['message']

        self.send(
            json.dumps({
                'action': 'pin-message',
                'message': message
            })
        )

    def pin_action(self, text_data_json) -> None:
        msg_id = text_data_json['messageId']
        message = self.get_message(msg_id)
        if message is not None:
            message.pinned = True
            message.save()

            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name,
                {
                    'type': 'pin_message',
                    'message': MessageSerialize(message).data
                }
            )
        else:
            self.send(json.dumps({
                'action': 'notif',
                'message': 'Message not found'
            }))

    def unpin_message(self, event):
        message = event["message"]
        user = event["user"]

        self.send(json.dumps({
            "action": "unpin-message",
            "message": message,
            "user": user
        }))

    def unpin_action(self, text_data_json):
        message_id = text_data_json['messageId']
        message = self.get_message(message_id)
        if message is not None:
            message.pinned = False
            message.save()

            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name,
                {
                    "type": "unpin_message",
                    "message": MessageSerialize(message).data,
                    "user": UserSerialize(self.scope['user']).data
                }
            )
        else:
            self.send(json.dumps({
                'action': 'notif',
                'message': 'Message not found'
            }))

    def add_member(self, text_data_json) -> None:
        members = text_data_json['members']
        new_users = CustomUser.objects.filter(username__in=members)
        for user in new_users:
            if self.room.members.exclude(username=user.username):
                self.room.members.add(user)
        self.room.save()
        self.send(json.dumps({
            "action": "chat-notify",
            "message": f' {", ".join(members)} joined to our chat!'
        }))

    def receive_txt_message(self, text_data_json) -> None:
        body = text_data_json['message']
        msg = self.create_message(body)
        self.send_message_to_all(msg)

    def delete_message(self, text_data_json) -> None:
        msg_id = text_data_json['msg_id']
        msg = Message.objects.filter(pk=msg_id)
        result = "not found, deletion failed"
        deleted = False
        if msg.exists():
            msg.first().delete()
            result = "successfully deleted"
            deleted = True
        logger.info("Message with id %s %s", msg_id, result)

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                "type": "message_deletion",
                "message": "Message " + result,
                "msg_id": msg_id,
                "deleted": deleted
            }
        )

    def message_deletion(self, event) -> None:
        message = event['message']
        msg_id = event['msg_id']
        deleted = event['deleted']

        self.send(
            json.dumps({
                'deleted': deleted,
                'message': message,
                'msg_id': msg_id,
                'action': "msg-deletion"
            })
        )

    def chat_message(self, event) -> None:
        message = event['message']
        as_file = event['as_file']

        self.send(
            json.dumps({
                'room': self.room_subscribe,
                'message': message,
                'as_file': as_file,
                'action': 'receive'
            })
        )

    def attach_message(self, text_data_json) -> None:
        message = self.create_message()
        body = text_data_json['description']
        as_file = text_data_json['asFiles']
        as_compress = text_data_json['asCompressed']
        message.body = body
        message.as_file = as_file
        for file in text_data_json['attachments']:
            attach = Attachments(message=message)
            base64_string = base64.b64decode(file['base64'].split(",")[1])
            attach.file_size = file['fileSize']
            attach.file_type = file['fileType']
            file_id = file['id']
            attach.name = file['name']
            name, ext = os.path.splitext(file['name'])
            temp_file_name = os.path.join(settings.MEDIA_ROOT, f"{name}_{file_id}{ext}")
            with open(temp_file_name, "wb") as attach_file:
                attach_file.write(base64_string)
                file_name = attach_file.name
            with open(temp_file_name, "rb") as attach_file:
                attach_name = os.path.basename(attach_file.name)
                attach.file.save(attach_name, File(attach_file), save=True)
            if as_compress:
                compress(file_name, attach)
            else:
                dest = os.path.join(
                    settings.MEDIA_ROOT, 'room',
                    str(attach.message.room.id), "attachments", f"FILE_{file_id}.{file['ext']}"
                )
                basename = os.path.basename(dest)
                os.makedirs(dest.rstrip(basename), exist_ok=True)
                os.rename(file_name, dest)
            attach.save()
            message.attachments.add(attach)
        message.save()
        self.send_message_to_all(message)

    def audio_message(self, text_data_json) -> None:
        message = self.create_message(msg_type=Message.Type.VOICE)
        base64_file = text_data_json['audioFile']
        file_type = text_data_json['fileType']

        ext = file_extensions.get(file_type)

        if ext is None:
            err = "Got an unexpected file type %s" % file_type
            logger.warning(err)
            self.send(json.dumps({
                "action": "notif",
                "message": err
            }))
            return

        bytes_file = base64.b64decode(base64_file)
        with open(os.path.join(settings.MEDIA_ROOT, f"{file_type}-message.{ext}"), "wb") as file:
            file.write(bytes_file)
            file_name = file.name
        compress_audio(input_file=file_name, instance=message)
        self.send_message_to_all(message)

    def send_message_to_all(self, message: Message, as_file=False) -> None:
        serialized_message = MessageSerialize(message).data

        for user in self.room.members.exclude(user_id=self.scope['user'].pk):
            if user not in users_in_groups[self.room_group_name]:
                notify(
                    user=user,
                    title="Message from chat %s" % self.room.name,
                    message=f'You got a new message from chat {self.room.name}: "{message.body}"'
                )

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': serialized_message,
                'as_file': message.as_file
            }
        )

    def mark_msg_as_read(self, msgs: list) -> None:
        for item in msgs:
            msg = self.get_message(item['id'])
            if msg is not None:
                msg.users_read.add(self.scope['user'])
        logger.info("Mark messages as read")

    def create_message(self, message=None, voice_file=None, msg_type=Message.Type.TEXT, **kwargs) -> Message:
        message = Message.objects.create(
            room=self.room,
            sender=self.scope['user'],
            body=message,
            voice_file=voice_file,
            msg_type=msg_type,
        )
        logger.info(f"Created new message by {self.scope['user']}")
        for user in users_in_groups[self.room_group_name]:
            message.users_read.add(user)
        return message

    @staticmethod
    def get_room(pk: int) -> Room:
        return Room.objects.get(pk=pk)

    @staticmethod
    def get_message(pk: int) -> Message | None:
        message = Message.objects.filter(pk=pk)
        if message.exists():
            message = message[0]
        else:
            message = None
        return message
