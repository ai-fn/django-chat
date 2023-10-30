from django.test import TestCase
from ..core import FriendRequestApiWrapper
from ..models import FriendRequest
from tests.utils import Utils

from notifications.models import Notification


class TestUserFriendRequestsCount(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user_2 = Utils.create_user('test2@mail.ru', 'qwerty', username='qwertyTo')

    def test_send_friend_request_via_callable(self):
        send_req = FriendRequestApiWrapper()
        send_req(user_to=self.user.pk, user_from=self.user_2.pk)

        obj = FriendRequest.objects.first()
        self.assertEqual(self.user, obj.user_to)
        self.assertEqual(self.user_2, obj.user_from)
        self.assertEqual(obj.status, FriendRequest.Status.SENT)
