class NotifyApiWrapper:
    """Wrapper to create notify API"""

    def __call__(self, *args, **kwargs): # provide old API for backwards compatibility
        return self._add_notification(*args, **kwargs)

    def danger(self, user: object, title: str, message: str = None) -> None:
        self._add_notification(user, title, message, level='danger')

    def info(self, user: object, title: str, message: str = None) -> None:
        self._add_notification(user, title, message, level='info')

    def success(self, user: object, title: str, message: str = None) -> None:
        self._add_notification(user, title, message, level='success')

    def warning(self, user: object, title: str, message: str = None) -> None:
        self._add_notification(user, title, message, level='warning')

    @staticmethod
    def _add_notification(user: object, title: str, message: str = None, level: str = 'info') -> None:
        from .models import Notification
        Notification.objects.notify_user(
            user=user, title=title, message=message, level=level
        )


notify = NotifyApiWrapper()
