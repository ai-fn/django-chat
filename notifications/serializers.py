from rest_framework import serializers

from .models import Notification


class NotifSerializer(serializers.ModelSerializer):

    class Meta:
        model = Notification
        exclude = []
