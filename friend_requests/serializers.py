from rest_framework import serializers
from .models import FriendRequest
from chat_api.serializers import UserSerialize


class RequestSerializer(serializers.ModelSerializer):
    user_from = UserSerialize()
    user_to = UserSerialize()
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = FriendRequest
        exclude = []

    @staticmethod
    def get_timestamp(obj: FriendRequest):
        return obj.timestamp.strftime("%H:%M %d-%m-%Y")
