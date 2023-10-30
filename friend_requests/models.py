import logging

from django.db import models
from django.utils.translation import gettext_lazy as _

from chat_api.models import CustomUser
from .managers import FriendRequestManager

logger = logging.getLogger(__name__)


class FriendRequest(models.Model):
    FRIEND_REQUEST_MAX_PER_USER_DEFAULT = 100
    FRIEND_REQUEST_REFRESH_TIME_DEFAULT = 50

    class Status(models.TextChoices):

        DECLINED = 'declined', _('declined')
        ACCEPTED = 'accepted', _('accepted')
        SENT = 'sent', _('sent')

        @classmethod
        def from_old_name(cls, name: str) -> object:
            """Map old name to enum
            Return ValueError for invalid names"""
            name_map = {
                'DECLINED': cls.DECLINED,
                'ACCEPTED': cls.ACCEPTED,
                'SENT': cls.SENT,
                'POSTED': cls.SENT,
            }
            try:
                return name_map[name.upper()]
            except KeyError:
                raise ValueError(f"Unknown name: %s" % name) from None

    user_from = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='req_from')
    user_to = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='req_to')
    status = models.CharField(choices=Status.choices, max_length=8, default=Status.SENT)
    timestamp = models.DateTimeField(auto_now_add=1)
    objects = FriendRequestManager()

    def __str__(self):
        return f"from {self.user_from} to {self.user_to}"

    def save(self, *args, **kwargs) -> None:
        logger.info("Friend request %s saved", self)
        super().save(*args, **kwargs)
        FriendRequest.objects.invalidate_user_friend_request_cache(self.user_from.pk)
        FriendRequest.objects.invalidate_user_friend_request_cache(self.user_to.pk)
        pass

    def delete(self, *args, **kwargs) -> None:
        super().delete(*args, **kwargs)
        logger.info("Friend request %s deleted", self)
        FriendRequest.objects.invalidate_user_friend_request_cache(self.user_from.pk)
        FriendRequest.objects.invalidate_user_friend_request_cache(self.user_to.pk)

    def set_status(self, status_name: str) -> None:
        logger.info("Friend request %s: status changed to %s", self, status_name)
        self.status = self.Status.from_old_name(status_name)
        self.save()
