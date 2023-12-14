import os

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.core.files.base import ContentFile

from PIL import Image
from io import BytesIO

from django.utils.translation import gettext_lazy as _
from .managers import *
from .utils import get_upload_path


class CustomUser(AbstractBaseUser):
    user_id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=255, null=False, unique=True, default=f"unknown_user__{user_id}")
    email = models.EmailField(null=False, default='example@gmail.com', unique=True)
    First_Name = models.CharField(max_length=255, null=False, default='Иван')
    Second_Name = models.CharField(max_length=255, null=False, default='Иванов')
    Patronymic = models.CharField(null=True, max_length=255)
    Date_of_birth = models.DateField(auto_now_add=True, null=False)
    Avatar = models.ImageField(upload_to=get_upload_path, null=True, default=settings.DEFAULT_USER_IMAGE_PATH)
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

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._old_Avatar = instance.Avatar
        return instance

    def save(self, *args, **kwargs):
        if self.Avatar:
            if hasattr(self, "_old_Avatar") and self._old_Avatar != self.Avatar:
                self.Avatar = compress(self.Avatar)
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        if self.Avatar:
            self.Avatar.storage.delete(self.Avatar.name)
        super().delete(using=using, keep_parents=keep_parents)


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
    image = models.ImageField(upload_to=get_upload_path, null=True, default=settings.DEFAULT_ROOM_IMAGE_PATH)
    created_at = models.DateTimeField(auto_now_add=True, null=False)
    type = models.CharField(choices=Type.choices, default=Type.DIRECT, max_length=6)
    objects = RoomManager()

    def __str__(self):
        return f'{self.type}__{self.pk}__{self.name}'

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._old_image = instance.image
        return instance

    def save(self, *args, **kwargs):
        if self.image:
            if hasattr(self, "_old_image") and self._old_image != self.image:
                self.image = compress(self.image)
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        if self.image:
            self.image.storage.delete(self.image.name)
        super().delete(using=using, keep_parents=keep_parents)


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
    body = models.TextField(max_length=1600, null=True)
    voice_file = models.FileField(null=True, upload_to=get_upload_voice_path)
    sent_at = models.DateTimeField(auto_now_add=True, null=False)
    users_read = models.ManyToManyField(CustomUser, related_name='users_read')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='room_message')
    objects = MessageManager()

    class Meta:
        ordering = ("sent_at", )

    def __str__(self):
        return f'Message__({self.sender} - {self.room})'


def compress(image):

    if os.path.exists(image.name):
        return image

    im = Image.open(image)
    im_io = BytesIO()
    im.save(im_io, format='PNG', quality=70)

    new_image = ContentFile(im_io.getvalue(), name=image.name)
    logger.debug(f"Image compressed: {image.name}")
    return new_image
