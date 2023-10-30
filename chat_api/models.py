import os
from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models

from django.utils.translation import gettext_lazy as _
from .managers import *
from chat.settings import MEDIA_ROOT


def get_upload_path(instance, filename):
    users_img = f'images/users-avatars/User_{instance.pk}/'
    if os.path.exists(os.path.join(MEDIA_ROOT, users_img + filename)):
        return filename
    return os.path.join(users_img, filename)


class CustomUser(AbstractBaseUser):
    user_id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=255, null=False, unique=True, default=f"unknown_user__{user_id}")
    email = models.EmailField(null=False, default='example@gmail.com', unique=True)
    First_Name = models.CharField(max_length=255, null=False, default='Иван')
    Second_Name = models.CharField(max_length=255, null=False, default='Иванов')
    Patronymic = models.CharField(null=True, max_length=255)
    Date_of_birth = models.DateField(auto_now_add=True, null=False)
    Avatar = models.ImageField(upload_to=get_upload_path, default='images/users-avatars/base-user.png', null=True)
    Friends = models.ManyToManyField('self')
    is_deactivated = models.BooleanField(null=False, default=False)
    is_email_confirmed = models.BooleanField(null=False, default=False)
    is_staff = models.BooleanField(null=False, default=False)
    is_superuser = models.BooleanField(null=False, default=False)
    objects = CustomUserManager()

    def __str__(self):
        return f'User__{self.username}'

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = (
        'username',
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'


def room_directory_path(instance, filename):
    return f"images/room-images/Room_{instance.pk}/{filename}"


class Room(models.Model):

    class Type(models.TextChoices):

        CHAT = 'chat', _('chat')
        DIRECT = 'direct', _('direct')

        @classmethod
        def get_from_old_name(cls, name: str) -> object:
            """ Map old name to enum

                Raises ValueError for invalid names.
            """
            name_map = {
                'CHAT': cls.CHAT,
                'ROOM': cls.CHAT,
                'DIRECT': cls.DIRECT,
            }
            try:
                return name_map[name]
            except KeyError:
                raise ValueError(f"Unknown name: %s" % name) from None

    name = models.CharField(null=False, default='unknown_room')
    members = models.ManyToManyField(CustomUser, related_name='Room_User')
    image = models.ImageField(upload_to=room_directory_path, default='images/room-images/base-room.png', null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=False)
    type = models.CharField(choices=Type.choices, default=Type.DIRECT, max_length=6)
    objects = RoomManager()

    class Meta:
        verbose_name = 'Room'
        verbose_name_plural = 'Rooms'

    def __str__(self):
        return f'{self.type}__{self.pk}__{self.name}'


class Folder(models.Model):
    name = models.CharField(max_length=20, default='new_folder')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_folder')
    rooms = models.ManyToManyField(Room, related_name='folder_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    objects = FolderManager()

    class Meta:
        verbose_name = 'Folder'
        verbose_name_plural = 'Folder'

    def __str__(self):
        return f"Folder__{self.pk}"


class Message(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sender_message')
    body = models.TextField(max_length=1600, null=False)
    sent_at = models.DateTimeField(auto_now_add=True, null=False)
    users_read = models.ManyToManyField(CustomUser, related_name='users_read')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='room_message')
    objects = MessageManager()

    class Meta:
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ("-sent_at", )

    def __str__(self):
        return f'Message__({self.sender} - {self.room})'
