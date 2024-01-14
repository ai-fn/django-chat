import datetime
from datetime import datetime as dt
from datetime import timezone as tz
from django.db.models import Q
from rest_framework import serializers
from rest_framework.utils.serializer_helpers import ReturnDict

from .models import *
from chat import settings


base_user_img = settings.MEDIA_URL + 'images/users-avatars/base-user.png'


class UserSerialize(serializers.ModelSerializer):

    class Meta:
        model = CustomUser
        exclude = ['password', ]


class AttachmentsSerialize(serializers.ModelSerializer):
    class Meta:
        model = Attachments
        exclude = []


class MessageSerialize(serializers.ModelSerializer):
    sender = UserSerialize()
    created_at_formatted = serializers.SerializerMethodField()
    sent_at = serializers.SerializerMethodField()
    edited_at = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    attachments = AttachmentsSerialize(many=True, read_only=True)

    class Meta:
        model = Message
        exclude = []

    @staticmethod
    def get_created_at_formatted(obj: Message):
        if (dt.now(obj.sent_at.tzinfo) - obj.sent_at).days > 0:
            return obj.sent_at.strftime("%d.%m")
        return obj.sent_at.strftime("%H:%M")

    @staticmethod
    def get_sent_at(obj: Message):
        return obj.sent_at.strftime("%b %d, %Y, %H:%M:%S")

    @staticmethod
    def get_edited_at(obj: Message):
        if obj.edited_at is not None:
            return obj.edited_at.strftime("%b %d, %Y, %H:%M:%S")

    @staticmethod
    def get_time(obj: Message):
        return obj.sent_at.strftime("%H:%M")


class RoomSerialize(serializers.ModelSerializer):
    members = UserSerialize(many=True)
    last_message = serializers.SerializerMethodField()
    messages = MessageSerialize(many=True, read_only=True)
    unread_messages = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = Room
        exclude = []
        read_only_fields = ["messages", "last_message"]

    def get_image(self, obj: Room) -> str:
        req = self.context.get('request')
        if req:
            if obj.type == 'direct' and obj.name != 'Favorites':
                res = settings.MEDIA_URL + str(obj.members.exclude(pk=req.user.pk)[0].Avatar)
                return res
        return settings.MEDIA_URL + str(obj.image) if obj.image else None

    def get_name(self, obj: Room) -> str:
        req = self.context.get('request')
        if req:
            if obj.type == 'direct':
                try:
                    usr = obj.members.exclude(pk=req.user.pk)[0]
                    name = f"{usr.First_Name} {usr.Second_Name}"
                except IndexError:
                    name = obj.name
                return name
        return obj.name

    def get_unread_messages(self, obj: Room) -> int:
        req = self.context.get('request')
        if req:
            user = req.user
            return obj.room_message.exclude(users_read=user).count()
        return 0

    @staticmethod
    def get_last_message(obj: Room) -> ReturnDict | None:
        last_message = Message.objects.filter(room=obj).order_by('sent_at').last()
        return MessageSerialize(last_message).data if last_message is not None else None


class FolderSerialize(serializers.ModelSerializer):

    user = UserSerialize()
    rooms = RoomSerialize(many=True)

    class Meta:
        model = Folder
        exclude = []


