import logging

from django.utils.translation import gettext_lazy as _
from django.db import models

from chat_api.models import CustomUser
from .managers import NotificationManager

# Create your models here.

logger = logging.getLogger(__name__)


class Notification(models.Model):

    NOTIFICATIONS_MAX_PER_USER_DEFAULT = 50
    NOTIFICATIONS_REFRESH_TIME_DEFAULT = 30

    class Level(models.TextChoices):
        """ A Notification level"""

        DANGER = 'danger', _('danger')
        WARNING = 'warning', _('warning')
        INFO = 'info', _('info')
        SUCCESS = 'success', _('success')

        @classmethod
        def from_old_name(cls, name: str) -> object:
            """ Map old name to enum

            Raises ValueError for invalid names.
            """
            name_map = {
                "CRITICAL": cls.DANGER,
                "DANGER": cls.DANGER,
                "WARN": cls.WARNING,
                "INFO": cls.INFO,
                "DEBUG": cls.SUCCESS,
            }
            try:
                return name_map[name]
            except KeyError:
                raise ValueError(f"Unknown name: {name}") from None

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    level = models.CharField(choices=Level.choices, max_length=10, default=Level.INFO)
    title = models.CharField(max_length=254)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=1, db_index=1)
    viewed = models.BooleanField(default=0, db_index=1)
    objects = NotificationManager()

    def __str__(self):
        return f"{self.user}: {self.title}"

    def save(self, *args, **kwargs):
        # overriden save to ensure cache is invalidated on very call
        super().save(*args, **kwargs)
        Notification.objects.invalidate_user_notification_cache(self.user.user_id)

    def delete(self, *args, **kwargs):
        # overriden delete to ensure cache is invalidated on very call
        super().delete(*args, **kwargs)
        Notification.objects.invalidate_user_notification_cache(self.user.user_id)

    def mark_viewed(self) -> None:
        """Mark notification as viewed."""
        logger.info("Marking notification as viewed: %s" % self)
        self.viewed = True
        self.save()

    def set_level(self, level_name: str) -> None:
        self.level = self.Level.from_old_name(level_name)
        self.save()
