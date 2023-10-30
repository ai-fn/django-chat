from ..models import Notification
from ..core import NotifyApiWrapper
from django.test import TestCase
from tests.utils import Utils


class TestUserNotificationCount(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = Utils.create_user('test@mail.ru', 'qwerty')
        cls.user.username = 'qwerty'
        cls.title = 'Test Title Notify'
        cls.message = 'Test Message Notif'

    def test_should_add_danger_notification(self):
        notify = NotifyApiWrapper()

        notify.danger(user=self.user, title=self.title, message=self.message)
        obj = Notification.objects.first()
        self.assertEqual(obj.user, self.user)
        self.assertEqual(obj.title, self.title)
        self.assertEqual(obj.message, self.message)
        self.assertEqual(obj.level, Notification.Level.DANGER)

    def test_should_add_info_notification(self):
        notify = NotifyApiWrapper()

        notify.info(user=self.user, title=self.title, message=self.message)
        obj = Notification.objects.first()
        self.assertEqual(obj.user, self.user)
        self.assertEqual(obj.title, self.title)
        self.assertEqual(obj.message, self.message)
        self.assertEqual(obj.level, Notification.Level.INFO)

    def test_should_add_success_notification(self):
        notify = NotifyApiWrapper()

        notify.success(user=self.user, title=self.title, message=self.message)
        obj = Notification.objects.first()
        self.assertEqual(obj.user, self.user)
        self.assertEqual(obj.title, self.title)
        self.assertEqual(obj.message, self.message)
        self.assertEqual(obj.level, Notification.Level.SUCCESS)

    def test_should_add_warning_notification(self):
        notify = NotifyApiWrapper()

        notify.warning(user=self.user, title=self.title, message=self.message)
        obj = Notification.objects.first()
        self.assertEqual(obj.user, self.user)
        self.assertEqual(obj.title, self.title)
        self.assertEqual(obj.message, self.message)
        self.assertEqual(obj.level, Notification.Level.WARNING)

    def test_should_add_notification_via_callable(self):
        notify = NotifyApiWrapper()

        notify(user=self.user, title=self.title, message=self.message)  # level=Notification.Level.INFO (can change)
        obj = Notification.objects.first()
        self.assertEqual(obj.user, self.user)
        self.assertEqual(obj.title, self.title)
        self.assertEqual(obj.message, self.message)
        self.assertEqual(obj.level, Notification.Level.INFO)
