import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.files import File
from django.db.models import Q

from .utils import *
from .models import Room, CustomUser, Message
from .serializers import MessageSerialize, UserSerialize, RoomSerialize
from notifications.core import notify

room: Room
logger = logging.getLogger(__name__)
users_in_groups = {}


class ChatConsumer(WebsocketConsumer):

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user_notif_room = None
        self.room_subscribe = None
        self.room_group_name = None
        self.room_name = None

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
        global room
        if bytes_data is not None:

            message = self.create_message()
            with open(os.path.join(settings.MEDIA_ROOT, "voice-message.wav"), "wb") as file:
                file.write(bytes_data)
                file_name = file.name

            comp_file = compress_audio(file_name)
            with open(comp_file, 'rb') as compressed_file:
                message.voice_file = File(compressed_file)
                message.save()
            os.remove(file_name)
            os.remove(comp_file)

            self.send_message_to_all(message)
            return

        text_data_json = json.loads(text_data)
        if text_data_json['action'] == 'connect':
            self.room_name = text_data_json['roomName']
            self.room_subscribe = text_data_json['pk']
            room = self.get_room(self.room_subscribe)
            self.send(json.dumps({
                'user': UserSerialize(self.scope['user']).data,
                'action': 'connect',
                'room': RoomSerialize(room).data,
                'chat_messages': MessageSerialize(
                    Message.objects.filter(
                        room=self.room_subscribe
                    ),
                    many=True
                ).data,
            }))
            return
        elif text_data_json['action'] == "add-member":
            members = text_data_json['members']
            new_users = CustomUser.objects.filter(username__in=members)
            for user in new_users:
                if room.members.filter(~Q(username=user.username)):
                    room.members.add(user)
            room.save()
            self.send(json.dumps({
                "action": "chat-notify",
                "message": f' {", ".join(members)} joined to our chat!'
            }))
            return
        elif text_data_json['action'] == 'mark_msg_as_read':
            try:
                self.mark_msg_as_read(text_data_json['chat_messages'])
                self.send(text_data=json.dumps({
                    'action': 'mark_as_read',
                    'message': 'success',
                }))
                return
            except KeyError as err:
                logger.error(err)
                self.send(text_data=json.dumps({
                    'action': 'mark_as_read',
                    'message': 'failed',
                }))
            return
        self.send_message_to_all(self.create_message(text_data_json['message']))

    def send_message_to_all(self, message: Message):
        message = MessageSerialize(message)

        for user in room.members.filter(~Q(user_id=self.scope['user'].pk)):
            if user not in users_in_groups[self.room_group_name]:
                notify(
                    user=user,
                    title="Message from chat %s" % room.name,
                    message=f'You got a new message from chat {room.name}: "{message.data["body"]}"'
                )

        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    def chat_message(self, event):
        message = event['message']

        self.send(text_data=json.dumps({
            'room': self.room_subscribe,
            'message': message.data,
            'action': 'receive',
        }))

    def mark_msg_as_read(self, msgs: list):
        for item in msgs:
            msg = self.get_message(item['id'])
            msg.users_read.add(self.scope['user'])

    def create_message(self, message=None, voice_file=None, **kwargs):
        global room
        message = Message.objects.create(
            room=room,
            sender=self.scope['user'],
            body=message,
            voice_file=voice_file
        )
        for user in users_in_groups[self.room_group_name]:
            message.users_read.add(user)
        return message

    @staticmethod
    def get_room(pk: int) -> Room:
        return Room.objects.get(pk=pk)

    @staticmethod
    def get_message(pk: int) -> Message:
        return Message.objects.get(pk=pk)
