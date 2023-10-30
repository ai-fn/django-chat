import json
from unittest.mock import patch

from django.test import TestCase, RequestFactory
from django.urls import reverse
from tests.utils import Utils

from ..views import user_notifications_count

MODULE_PATH = 'notifications.views'


class NotifTestCase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user.username = 'qwerty'
        cls.factory = RequestFactory()

    @patch(MODULE_PATH + '.Notification.objects.user_unread_count')
    def test_user_unread_count(self, mock_user_unread_count):
        unread_count = 42
        user_pk = 3
        mock_user_unread_count.return_value = unread_count
        request = self.factory.get(
            reverse('notifications:user_notifications_count', args=[user_pk])
        )
        request.user = self.user

        response = user_notifications_count(request, user_pk)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(mock_user_unread_count.called)
        expected = {'unread_count': unread_count}
        result = json.loads(response.content.decode(response.charset))
        self.assertDictEqual(result, expected)
