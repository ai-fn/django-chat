import logging

from django.contrib.auth.base_user import BaseUserManager
from django.db import models

logger = logging.getLogger(__name__)


class CustomUserManager(BaseUserManager):

    def create_user(self,  email, password=None, username: str = None, **extra_fields):
        """
        Creates and saves User with the given email and password
        """

        if not email:
            raise ValueError("The email field is required")

        if username is None:
            username = email

        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save()
        logger.info("%s user, base folders and 'Favorites' room are created" % user)
        return user

    def create_superuser(self, email, password=None, username=None, **extra_fields):
        """
        Creates and saves superuser with the given email and password
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        user = self.create_user(email, username, password, **extra_fields)
        logger.info("%s superuser created" % user)
        return user


class RoomManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset()

    def create(self, **kwargs):
        obj = self.model(**kwargs)
        obj.save()
        logger.info("Room %s created" % obj)
        return obj


class FolderManager(models.Manager):

    def create(self, **kwargs):
        obj = self.model(**kwargs)
        obj.save()
        logger.info("Folder %s created" % obj)
        return obj


class MessageManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset()

    def create(self, **kwargs):
        obj = self.model(**kwargs)
        obj.save()
        logger.info("Message %s created" % obj)
        return obj


class BaseImageManager(models.Manager):

    def create(self, **kwargs):
        obj = self.model(**kwargs)
        obj.save()
        logger.info("BaseImage %s created" % obj)
        return obj
