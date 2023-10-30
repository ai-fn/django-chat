from chat_api.models import *


class Utils:
    """Utilities for making it easier to create tests"""

    @staticmethod
    def _create_user(email, password, username):
        return CustomUser.objects.create(email=email, password=password, username=username)

    @classmethod
    def create_user(cls, email, password, username='qwerty'):
        user = cls._create_user(email=email, password=password, username=username)
        return user

    @staticmethod
    def _create_room(name: str):
        return Room.objects.create(name=name)

    @classmethod
    def create_room(cls, name: str):
        room: Room = cls._create_room(name)
        return room
