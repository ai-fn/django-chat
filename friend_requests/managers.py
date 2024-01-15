import logging

from django.core.cache import cache
from django.db import models

from chat_api.models import CustomUser
from django.conf import settings
from django.db.models import Q

logger = logging.getLogger(__name__)


class FriendRequestQuerySet(models.QuerySet):
    def update(self, **kwargs):
        super().update(**kwargs)
        users_from_pks = set(self.select_related("user_from").values_list("pk", flat=True))
        for user_pk in users_from_pks:
            FriendRequestManager.invalidate_user_friend_request_cache(user_pk)


class FriendRequestManager(models.Manager):
    USER_FRIEND_REQUEST_COUNT_PREFIX = "USER_FRIEND_REQUEST_COUNT"
    USER_SENT_FRIEND_REQUEST_COUNT_PREFIX = "USER_SENT_FRIEND_REQUEST_COUNT"
    USER_FRIEND_REQUEST_COUNT_CACHE_DURATION = 86_400

    def get_queryset(self):
        return FriendRequestQuerySet(self.model, using=self._db)

    def send_fried_request(
            self, user_from: object, user_to: object
    ) -> object:
        """
        Sent friend request from user_from to user_to. Returns newly created friend_request object
        """
        from notifications.core import notify

        user_from = CustomUser.objects.get(pk=user_from)
        user_to = CustomUser.objects.get(pk=user_to)

        username_from = f"{user_from.First_Name} {user_from.Second_Name}"

        if user_to == user_from:
            raise ValueError(f"Cannot send friend request to yourself: user_from - {user_from}, user_to - {user_to}")

        if self.filter(user_from=user_from, user_to=user_to).exists():
            raise ValueError("Request already sent")

        max_friend_request = self._max_friend_requests_per_user()
        if self.filter(user_to=user_to).count() >= max_friend_request:
            to_be_deleted_qs = self.filter(user_to=user_to).order_by("-timestamp")[max_friend_request - 1:]
            for friend_request in to_be_deleted_qs:
                friend_request.delete()

        obj = self.create(user_from=user_from, user_to=user_to)
        notify(user=user_to, title='Friend Request', message='You got a new friend request from %s' % username_from)
        logger.info("Created friend_request %s", obj)
        return obj

    def _max_friend_requests_per_user(self) -> int:
        """Maximum number of friend_requests allowed per user"""
        max_friend_requests = getattr(
            settings,
            "FRIEND_REQUEST_MAX_PER_USER",
            self.model.FRIEND_REQUEST_MAX_PER_USER_DEFAULT
        )
        try:
            max_friend_requests = int(max_friend_requests)
        except ValueError:
            max_friend_requests = None
        if max_friend_requests is None or max_friend_requests < 0:
            logger.warning(
                "FRIEND_REQUEST_MAX_PER_USER setting is invalid. Using default"
            )
            max_friend_requests = self.model.FRIEND_REQUEST_MAX_PER_USER_DEFAULT
        return max_friend_requests

    @classmethod
    def _user_friend_request_cache_key(cls, user_pk: int) -> str:
        return f"{cls.USER_FRIEND_REQUEST_COUNT_PREFIX}_{user_pk}"

    @classmethod
    def _user_sent_requests_cache_key(cls, user_pk: int) -> str:
        return f"{cls.USER_SENT_FRIEND_REQUEST_COUNT_PREFIX}_{user_pk}"

    @classmethod
    def invalidate_user_friend_request_cache(cls, user_pk: int) -> None:
        cache.delete(key=cls._user_friend_request_cache_key(user_pk))
        cache.delete(key=cls._user_sent_requests_cache_key(user_pk))
        logger.debug("Invalidate friend request cache for user %s" % user_pk)

    def user_sent_count(self, user_pk: int) -> int:
        """returns the cached sent count for a user given by user_pk"""
        cache_key = self._user_friend_request_cache_key(user_pk)
        sent_count = cache.get(pk=user_pk)
        if not sent_count:
            try:
                user = CustomUser.objects.get(pk=user_pk)
            except CustomUser.DoesNotExist:
                sent_count = -1
            else:
                logger.debug(
                    "Updating friend requests for user %s" % user_pk
                )
                sent_count = self.filter(user_to=user, status=self.model.Status.SENT).count()
                cache.set(
                    key=cache_key,
                    value=sent_count,
                    timeout=self.USER_FRIEND_REQUEST_COUNT_CACHE_DURATION
                )
        else:
            logger.debug(
                "Returning friend request sent count from cache for user %s" % user_pk
            )
        return sent_count

    def requests_sent_for(self, user_pk: int):
        """returns user sent requests by given user_pk"""
        cache_key = self._user_sent_requests_cache_key(user_pk)
        sent_req = cache.get(key=cache_key)
        if not sent_req:
            try:
                user = CustomUser.objects.get(pk=user_pk)
            except CustomUser.DoesNotExist:
                logger.warning("User with pk %s not found" % user_pk)
                sent_req = []
            else:
                logger.debug("Updating sent requests for user with pk %s " % user_pk)
                sent_req = set(self.filter(
                    (Q(user_from=user) | Q(user_to=user)) & Q(status=self.model.Status.SENT)
                                  ).select_related("user_to").values_list('user_to__pk', flat=1))
                cache.set(
                    key=cache_key,
                    value=sent_req,
                    timeout=self.USER_FRIEND_REQUEST_COUNT_CACHE_DURATION
                )
        else:
            logger.debug(
                "Returning sent requests from cache for user with pk %s " % user_pk
            )
        return sent_req
