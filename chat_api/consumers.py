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
        }

    def connect(self):
        self.room_name = "room_name"
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

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )
        if self.room_group_name in users_in_groups:
            users_in_groups[self.room_group_name].discard(self.scope['user'])

    def receive(self, text_data=None, bytes_data=None):
        text_data_json = json.loads(text_data)
        action = text_data_json['action']
        try:
            self.actions[action](text_data_json)
            return
        except KeyError:
            logger.debug("Unknown action: '%s'" % action)
            if text_data_json.get("message") is not None:
                self.send_message_to_all(self.create_message(text_data_json['message']))

    def edit_message(self, text_data_json) -> None:
        msg_id = text_data_json['messageId']
        msg_body = text_data_json['messageBody']
        message = self.get_message(msg_id)
        if message is None:
            logger.debug("Requested for edit message with pk %s not found" % msg_id)
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
        }))

    def receive_txt_message(self, text_data_json):
        body = text_data_json['message']
        msg = self.create_message(body)
        self.send_message_to_all(msg)

    def audio_message(self, text_data_json) -> None:
        message = self.create_message(msg_type=Message.Type.VOICE)
        base64_file = text_data_json['audioFile']
        bytes_file = base64.b64decode(base64_file)
        with open(os.path.join(settings.MEDIA_ROOT, "voice-message.ogg"), "wb") as file:
            file.write(bytes_file)
            file_name = file.name
        compress_audio(input_file=file_name, instance=message)
        self.send_message_to_all(message)

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
        logger.debug("Message with id %s %s", msg_id, result)
        self.send(json.dumps({
            "action": "msg-deletion",
            "message": "Message " + result,
            "msg_id": msg_id,
            "deleted": deleted
        }))

    def attach_message(self, text_data_json) -> None:
        message = self.create_message()
        files = map(lambda x: base64.b64decode(x), text_data_json['attachments'])
        attachments = map(lambda x: Attachments.objects.create(file=x, message=message), list(files))
        message.attachments.set(*attachments)

    def send_message_to_all(self, message: Message) -> None:
        message = MessageSerialize(message)

        for user in self.room.members.exclude(user_id=self.scope['user'].pk):
            if user not in users_in_groups[self.room_group_name]:
                notify(
                    user=user,
                    title="Message from chat %s" % self.room.name,
                    message=f'You got a new message from chat {self.room.name}: "{message.data["body"]}"'
                )

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    def chat_message(self, event) -> None:
        message = event['message']

        self.send(text_data=json.dumps({
            'room': self.room_subscribe,
            'message': message.data,
            'action': 'receive',
        }))

    def mark_msg_as_read(self, msgs: list) -> None:
        for item in msgs:
            msg = self.get_message(item['id'])
            msg.users_read.add(self.scope['user'])
        logger.debug("Mark messages as read")

    def create_message(self, message=None, voice_file=None, msg_type=Message.Type.TEXT, **kwargs) -> Message:
        message = Message.objects.create(
            room=self.room,
            sender=self.scope['user'],
            body=message,
            voice_file=voice_file,
            msg_type=msg_type,
        )
        logger.debug(f"Created new message by {self.scope['user']}")
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
