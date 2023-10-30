from django.test import TestCase
from unittest.mock import patch

from tests.utils import Utils
from ..models import FriendRequest

MODULE_PATH = 'friend_requests.models'


class FriendRequestsTestCase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user_1 = Utils.create_user('testFrom@mail.ru', 'qwertyFrom')
        cls.user_2 = Utils.create_user('testTo@mail.ru', 'qwertyTo', username='qwertyTo')

    @patch(MODULE_PATH + '.FriendRequest.objects.invalidate_user_friend_request_cache')
    def test_save_will_invalidate_cache(self, mock_invalidate_user_friend_request_cache):
        obj = FriendRequest.objects.send_fried_request(user_from=self.user_1.pk, user_to=self.user_2.pk)
        self.assertTrue(FriendRequest.objects.filter(pk=obj.pk).exists())
        self.assertEqual(mock_invalidate_user_friend_request_cache.call_count, 2)

    @patch(MODULE_PATH + '.FriendRequest.objects.invalidate_user_friend_request_cache')
    def test_delete_will_invalidate_cache(self, mock_invalidate_user_friend_request_cache):
        obj = FriendRequest.objects.send_fried_request(user_from=self.user_1.pk, user_to=self.user_2.pk)
        obj.delete()
        self.assertFalse(FriendRequest.objects.filter(pk=obj.pk).exists())
        self.assertEqual(mock_invalidate_user_friend_request_cache.call_count, 4)

    def test_can_set_status(self):
        obj = FriendRequest.objects.send_fried_request(self.user_1.pk, self.user_2.pk)

        obj.set_status('DECLINED')
        obj.refresh_from_db()
        self.assertEqual(obj.status, 'declined')

        obj.set_status('ACCEPTED')
        obj.refresh_from_db()
        self.assertEqual(obj.status, 'accepted')

        obj.set_status('SENT')
        obj.refresh_from_db()
        self.assertEqual(obj.status, 'sent')

        with self.assertRaises(ValueError):
            obj.set_status('XXX')
