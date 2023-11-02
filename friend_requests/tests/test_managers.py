from unittest.mock import patch

from django.test import TestCase, override_settings
from django.conf import settings

from ..core import FriendRequestApiWrapper
from ..models import FriendRequest
from tests.utils import Utils

from notifications.models import Notification

from chat_api.models import CustomUser

MODULE_PATH = 'friend_requests.models'

FRIEND_REQUEST_MAX_PER_USER_DEFAULT = 42


class TestFriendRequestsQuerySet(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user_1 = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user_2 = Utils.create_user('test2@mail.ru', 'qwert', username='qwerty2')
        cls.title = 'test_title'

    @patch(MODULE_PATH + ".FriendRequest.objects.invalidate_user_friend_request_cache")
    def tet_update_will_invalidate_cache(self, mock_invalidate_user_friend_request_cache):
        FriendRequest.objects.send_fried_request(user_from=self.user_1, user_to=self.user_2)
        FriendRequest.objects.update(status=FriendRequest.Status.ACCEPTED)
        self.assertTrue(mock_invalidate_user_friend_request_cache.call_count, 2)


class TestFriendRequestManager(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty', 'qwerty')
        cls.user_2 = Utils.create_user('test2@mail.ru', 'qwert', username='qwerty2')
        cls.user_3 = Utils.create_user('test3@mail.ru', 'qwert', username='qwerty3')
        cls.user_4 = Utils.create_user('test4@mail.ru', 'qwert', username='qwerty4')
        cls.user_5 = Utils.create_user('test5@mail.ru', 'qwert', username='qwerty5')
        cls.user_6 = Utils.create_user('test6@mail.ru', 'qwert', username='qwerty6')

    def test_send_notify_via_callable(self):
        FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_2.pk)

        obj = Notification.objects.first()
        self.assertEqual(obj.user, self.user)
        self.assertEqual(obj.level, Notification.Level.INFO)
        self.assertEqual(obj.title, 'Friend Request')
        FriendRequest.objects.invalidate_user_friend_request_cache(self.user.pk)

    def test_can_send_req(self):
        FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_2.pk)

        obj = FriendRequest.objects.first()
        self.assertEqual(FriendRequest.objects.filter(user_to=self.user, user_from=self.user_2).count(), 1)
        self.assertEqual(obj.user_to, self.user)
        self.assertEqual(obj.status, FriendRequest.Status.SENT)

    @override_settings(FRIEND_REQUEST_MAX_PER_USER=3)
    def test_remove_when_too_many_requests(self):
        FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_2.pk)
        obj_2 = FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_3.pk)
        obj_3 = FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_4.pk)
        obj_4 = FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_5.pk)
        expected = {obj_2.pk, obj_3.pk, obj_4.pk}
        result = set(
            FriendRequest.objects.filter(user_to=self.user).values_list("pk", flat=True)
        )
        self.assertSetEqual(result, expected)
        obj_5 = FriendRequest.objects.send_fried_request(user_to=self.user.pk, user_from=self.user_6.pk)
        expected = {obj_3.pk, obj_4.pk, obj_5.pk}
        result = set(
            FriendRequest.objects.filter(user_to=self.user).values_list("pk", flat=True)
        )
        self.assertSetEqual(result, expected)


@patch('friend_requests.managers.logger')
@patch(
    MODULE_PATH + ".FriendRequest.FRIEND_REQUEST_MAX_PER_USER_DEFAULT",
    FRIEND_REQUEST_MAX_PER_USER_DEFAULT
)
class TestMaxFriendRequestsPerUser(TestCase):
    @override_settings(FRIEND_REQUEST_MAX_PER_USER=42)
    def test_should_user_custom_integer_setting(self, mock_logger):
        result = FriendRequest.objects._max_friend_requests_per_user()
        self.assertEqual(result, 42)
        self.assertFalse(mock_logger.warning.called)

    @override_settings(FRIEND_REQUEST_MAX_PER_USER="42")
    def test_should_use_custom_string_setting(self, mock_logger):
        result = FriendRequest.objects._max_friend_requests_per_user()
        self.assertEqual(result, 42)
        self.assertFalse(mock_logger.warning.called)

    @override_settings()
    def test_should_user_default_if_not_defined(self, mock_logger):
        del settings.FRIEND_REQUEST_MAX_PER_USER
        result = FriendRequest.objects._max_friend_requests_per_user()
        self.assertEqual(result, FRIEND_REQUEST_MAX_PER_USER_DEFAULT)
        self.assertFalse(mock_logger.warning.called)

    @override_settings(FRIEND_REQUEST_MAX_PER_USER='abc')
    def test_should_reset_to_default_if_not_int(self, mock_logger):
        result = FriendRequest.objects._max_friend_requests_per_user()
        self.assertEqual(result, FRIEND_REQUEST_MAX_PER_USER_DEFAULT)
        self.assertTrue(mock_logger.warning.called)

    @override_settings(FRIEND_REQUEST_MAX_PER_USER=-1)
    def test_should_reset_to_default_if_it_lt_zero(self, mock_logger):
        result = FriendRequest.objects._max_friend_requests_per_user()
        self.assertEqual(result, FRIEND_REQUEST_MAX_PER_USER_DEFAULT)
        self.assertTrue(mock_logger.warning.called)


@patch('friend_requests.managers.cache')
class TestSentCount(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user_2 = Utils.create_user('test2@mail.ru', 'qwerty2', username='qwerty2')
        cls.user_3 = Utils.create_user('test3@mail.ru', 'qwerty3', username='qwerty3')
        FriendRequest.objects.all().delete()
        FriendRequest.objects.send_fried_request(user_to=cls.user.pk, user_from=cls.user_2.pk)
        FriendRequest.objects.send_fried_request(user_to=cls.user.pk, user_from=cls.user_3.pk)

    def test_update_cache_when_not_in_cache(self, mock_cache):
        mock_cache.get.return_value = None

        result = FriendRequest.objects.user_sent_count(self.user.pk)
        expected = 2
        self.assertEqual(result, expected)
        args, kwargs = mock_cache.set.call_args
        self.assertEqual(
            kwargs['key'],
            FriendRequest.objects._user_friend_request_cache_key(self.user.pk)
        )
        self.assertEqual(kwargs['value'], expected)

    def test_return_from_cache_when_in_cache(self, mock_cache):
        mock_cache.get.return_value = 42
        result = FriendRequest.objects.user_sent_count(self.user.pk)
        expected = 42
        self.assertEqual(result, expected)
        self.assertFalse(mock_cache.set.called)

    def test_return_error_when_user_not_found(self, mock_cache):
        mock_cache.get.return_value = None
        invalid_user_id = max(user.pk for user in CustomUser.objects.all()) + 1
        result = FriendRequest.objects.user_sent_count(invalid_user_id)
        expected = -1
        self.assertEqual(result, expected)
        self.assertFalse(mock_cache.set.called)

    def test_can_invalidate_cache(self, mock_cache):
        FriendRequest.objects.invalidate_user_friend_request_cache(self.user.pk)
        self.assertTrue(mock_cache.delete)
        args, kwargs = mock_cache.delete.call_args
        self.assertEqual(
            kwargs['key'],
            FriendRequest.objects._user_sent_requests_cache_key(self.user.pk)
        )


@patch('friend_requests.managers.cache')
class TestSentRequestsCount(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user_2 = Utils.create_user('test2@mail.ru', 'qwerty2', username='qwerty2')
        cls.user_3 = Utils.create_user('test3@mail.ru', 'qwerty3', username='qwerty3')
        FriendRequest.objects.all().delete()
        FriendRequest.objects.send_fried_request(user_to=cls.user.pk, user_from=cls.user_2.pk)
        FriendRequest.objects.send_fried_request(user_to=cls.user.pk, user_from=cls.user_3.pk)

    def test_update_cache_when_not_in_cache(self, mock_cache):
        mock_cache.get.return_value = None

        result = FriendRequest.objects.requests_sent_for(self.user.pk)
        expected = {12}
        self.assertSetEqual(result, expected)
        args, kwargs = mock_cache.set.call_args
        self.assertEqual(
            kwargs['key'],
            FriendRequest.objects._user_sent_requests_cache_key(self.user.pk)
        )
        self.assertEqual(kwargs['value'], expected)

    def test_return_from_cache_when_in_cache(self, mock_cache):
        mock_cache.get.return_value = {self.user_2, }
        result = FriendRequest.objects.requests_sent_for(self.user.pk)
        expected = {self.user_2, }
        self.assertSetEqual(result, expected)
        self.assertFalse(mock_cache.set.called)

    def test_return_error_when_user_not_found(self, mock_cache):
        mock_cache.get.return_value = None
        invalid_user_id = max(user.pk for user in CustomUser.objects.all()) + 1
        result = FriendRequest.objects.requests_sent_for(invalid_user_id)
        expected = -1
        self.assertEqual(result, expected)
        self.assertFalse(mock_cache.set.called)
