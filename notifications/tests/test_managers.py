from unittest.mock import patch

from tests.utils import Utils
from django.test import TestCase, override_settings
from django.conf import settings

from ..models import Notification
from chat_api.models import CustomUser

MODULE_PATH = 'notifications.models'

NOTIFICATIONS_MAX_PER_USER_DEFAULT = 42


class TestNotifyQuerySet(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user.username = 'qwerty'
        cls.title = 'test_title'
        cls.message = 'test_message'

    @patch(MODULE_PATH + ".Notification.objects.invalidate_user_notification_cache")
    def tet_update_will_invalidate_cache(self, mock_invalidate_user_notification_cache):
        Notification.objects.notify_user(user=self.user, title=self.title, message=self.message)
        Notification.objects.notify_user(user=self.user, title=self.title, message=self.message)
        Notification.objects.update(viewed=True)
        self.assertTrue(mock_invalidate_user_notification_cache.call_count, 2)


class TestUserNotify(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user.username = 'qwerty'
        cls.title = 'test_title'
        cls.message = 'test_message'
        cls.level = 'danger'

    def test_can_notify(self):

        Notification.objects.notify_user(self.user, self.title, self.message, self.level)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        obj = Notification.objects.first()
        self.assertEqual(self.user, obj.user)
        self.assertEqual(self.title, obj.title)
        self.assertEqual(self.message, obj.message)
        self.assertEqual(self.level, obj.level)

    def test_should_use_default_level_when_not_specified(self):
        Notification.objects.notify_user(self.user, message=self.message, title=self.title)
        obj = Notification.objects.first()
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self.user, obj.user)
        self.assertEqual(self.title, obj.title)
        self.assertEqual(self.message, obj.message)
        self.assertEqual(Notification.Level.INFO, obj.level)

    def test_should_use_default_level_when_invalid_given(self):
        Notification.objects.notify_user(self.user, message=self.message, title=self.title, level='invalid')
        obj = Notification.objects.first()
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self.user, obj.user)
        self.assertEqual(self.title, obj.title)
        self.assertEqual(self.message, obj.message)
        self.assertEqual(Notification.Level.INFO, obj.level)

    @override_settings(NOTIFICATIONS_MAX_PER_USER=3)
    def test_remove_when_too_many_notifications(self):
        Notification.objects.notify_user(self.user, 'test')
        obj_2 = Notification.objects.notify_user(self.user, 'test')
        obj_3 = Notification.objects.notify_user(self.user, 'test')
        obj_4 = Notification.objects.notify_user(self.user, 'test')
        expected = {obj_2.pk, obj_3.pk, obj_4.pk}
        result = set(
            Notification.objects.filter(user=self.user).values_list("pk", flat=True)
        )
        self.assertSetEqual(result, expected)
        obj_5 = Notification.objects.notify_user(self.user, 'test')
        expected = {obj_3.pk, obj_4.pk, obj_5.pk}
        result = set(
            Notification.objects.filter(user=self.user).values_list("pk", flat=True)
        )
        self.assertSetEqual(result, expected)


@patch('notifications.managers.logger')
@patch(
    MODULE_PATH + ".Notification.NOTIFICATIONS_MAX_PER_USER_DEFAULT",
    NOTIFICATIONS_MAX_PER_USER_DEFAULT
)
class TestMaxNotificationsPerUser(TestCase):
    @override_settings(NOTIFICATIONS_MAX_PER_USER=42)
    def test_should_user_custom_integer_setting(self, mock_logger):
        result = Notification.objects._max_notifications_per_user()
        self.assertEqual(result, 42)
        self.assertFalse(mock_logger.warning.called)

    @override_settings(NOTIFICATIONS_MAX_PER_USER="42")
    def test_should_use_custom_string_setting(self, mock_logger):
        result = Notification.objects._max_notifications_per_user()
        self.assertEqual(result, 42)
        self.assertFalse(mock_logger.warning.called)

    @override_settings()
    def test_should_user_default_if_not_defined(self, mock_logger):
        del settings.NOTIFICATIONS_MAX_PER_USER
        result = Notification.objects._max_notifications_per_user()
        self.assertEqual(result, NOTIFICATIONS_MAX_PER_USER_DEFAULT)
        self.assertFalse(mock_logger.warning.called)

    @override_settings(NOTIFICATIONS_MAX_PER_USER='abc')
    def test_should_reset_to_default_if_not_int(self, mock_logger):
        result = Notification.objects._max_notifications_per_user()
        self.assertEqual(result, NOTIFICATIONS_MAX_PER_USER_DEFAULT)
        self.assertTrue(mock_logger.warning.called)

    @override_settings(NOTIFICATIONS_MAX_PER_USER=-1)
    def test_should_reset_to_default_if_it_lt_zero(self, mock_logger):
        result = Notification.objects._max_notifications_per_user()
        self.assertEqual(result, NOTIFICATIONS_MAX_PER_USER_DEFAULT)
        self.assertTrue(mock_logger.warning.called)


@patch('notifications.managers.cache')
class TestUnreadCount(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        Notification.objects.all().delete()
        Notification.objects.create(
            user=cls.user,
            level="INFO",
            title="TEST_TITLE_1",
            message="TEST_MESSAGE_1"
        )
        Notification.objects.create(
            user=cls.user,
            level="INFO",
            title="TEST_TITLE_2",
            message="TEST_MESSAGE_2"
        )

    def test_update_cache_when_not_in_cache(self, mock_cache):
        mock_cache.get.return_value = None

        result = Notification.objects.user_unread_count(self.user.pk)
        expected = 2
        self.assertEqual(result, expected)
        args, kwargs = mock_cache.set.call_args
        self.assertEqual(
            kwargs['key'],
            Notification.objects._user_notification_cache_key(self.user.pk)
        )
        self.assertEqual(kwargs['value'], expected)

    def test_return_from_cache_when_in_cache(self, mock_cache):
        mock_cache.get.return_value = 42
        result = Notification.objects.user_unread_count(self.user.pk)
        expected = 42
        self.assertEqual(result, expected)
        self.assertFalse(mock_cache.set.called)

    def test_return_error_when_user_not_found(self, mock_cache):
        mock_cache.get.return_value = None
        invalid_user_id = max(user.pk for user in CustomUser.objects.all()) + 1
        result = Notification.objects.user_unread_count(invalid_user_id)
        expected = -1
        self.assertEqual(result, expected)
        self.assertFalse(mock_cache.set.called)

    def test_can_invalidate_cache(self, mock_cache):
        Notification.objects.invalidate_user_notification_cache(self.user.pk)
        self.assertTrue(mock_cache.delete)
        args, kwargs = mock_cache.delete.call_args
        self.assertEqual(
            kwargs['key'],
            Notification.objects._user_notification_cache_key(self.user.pk)
        )
