import os
from django.contrib.auth.base_user import AbstractBaseUser
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import models

from PIL import Image
from io import BytesIO

from django.utils.translation import gettext_lazy as _
from .managers import *

DEFAULT_ROOM_IMAGE_PATH = 'images/room-images/base-room.png'
DEFAULT_USER_IMAGE_PATH = 'images/users-avatars/base-user.png'


def get_upload_path(instance, filename: str):
    logger.debug(instance, filename)

    if filename.replace("_compressed", "") in [DEFAULT_USER_IMAGE_PATH, DEFAULT_ROOM_IMAGE_PATH]:
        return os.path.join(instance.__class__.__name__.lower(), filename)

    if instance.pk:
        return os.path.join(instance.__class__.__name__.lower(), instance.pk, "images",  filename)

    return os.path.join(instance.__class__.__name__.lower(), "images",  filename)


class CustomUser(AbstractBaseUser):
    user_id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=255, null=False, unique=True, default=f"unknown_user__{user_id}")
    email = models.EmailField(null=False, default='example@gmail.com', unique=True)
    First_Name = models.CharField(max_length=255, null=False, default='Иван')
    Second_Name = models.CharField(max_length=255, null=False, default='Иванов')
    Patronymic = models.CharField(null=True, max_length=255)
    Date_of_birth = models.DateField(auto_now_add=True, null=False)
    Avatar = models.ForeignKey("BaseImage", on_delete=models.SET_NULL, null=True)
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


    def save(self, *args, **kwargs):
        if not self.Avatar:
            self.Avatar, created = BaseImage.objects.get_or_create(
                image=f"baseimage/{DEFAULT_USER_IMAGE_PATH}", defaults={"image": DEFAULT_USER_IMAGE_PATH}
            )
        super().save(*args, **kwargs)


class Room(models.Model):

    class Type(models.TextChoices):

        CHAT = 'chat', _('chat')
        DIRECT = 'direct', _('direct')

        @classmethod
        def get_from_old_name(cls, name: str) -> object:
            """
                Map old name to enum

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
    image = models.ForeignKey("BaseImage", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True, null=False)
    type = models.CharField(choices=Type.choices, default=Type.DIRECT, max_length=6)
    objects = RoomManager()

    def __str__(self):
        return f'{self.type}__{self.pk}__{self.name}'

    def save(self, *args, **kwargs):
        if not self.image:
            self.image, created = BaseImage.objects.get_or_create(
                image=f"baseimage/{DEFAULT_ROOM_IMAGE_PATH}", defaults={"image": DEFAULT_ROOM_IMAGE_PATH}
            )
        super().save(*args, **kwargs)


class Folder(models.Model):
    name = models.CharField(max_length=20, default='new_folder')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_folder')
    rooms = models.ManyToManyField(Room, related_name='folder_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    objects = FolderManager()

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
        ordering = ("-sent_at", )

    def __str__(self):
        return f'Message__({self.sender} - {self.room})'


class BaseImage(models.Model):
    image = models.ImageField(upload_to=get_upload_path, verbose_name='Image')
    objects = BaseImageManager()

    def save(self, *args, **kwargs):
        if not self.pk:
            self.image = compress(self.image)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        default_storage.delete(self.image.name)
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"BaseImage__{self.pk}__{self.image.name}"


def compress(image):
    im = Image.open(image)
    im_io = BytesIO()
    im.save(im_io, format='PNG', quality=70)

    filename, extension = os.path.splitext(image.name)
    new_filename = f"{filename}_compressed{extension}"
    new_image = ContentFile(im_io.getvalue(), name=new_filename)
    return new_image
