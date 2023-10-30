import json
from unittest.mock import patch

from django.test import TestCase, RequestFactory
from django.urls import reverse
from tests.utils import Utils

from ..views import user_requests_count

MODULE_PATH = 'friend_requests.views'


class FriendRequestTestCase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.tu', 'qwerty')
        cls.user.username = 'qwerty'
        cls.factory = RequestFactory()

    @patch(MODULE_PATH + '.FriendRequest.objects.user_sent_count')
    def test_user_sent_count(self, mock_user_sent_count):
        sent_count = 43
        user_pk = 2
        mock_user_sent_count.return_value = sent_count

        request = self.factory.get(
            reverse('friend_requests:user_requests_count', args=[user_pk])
        )
        request.user = self.user

        response = user_requests_count(request, user_pk)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(mock_user_sent_count.called)
        expected = {'sent_requests': sent_count}
        result = json.loads(response.content.decode(response.charset))
        self.assertDictEqual(result, expected)
