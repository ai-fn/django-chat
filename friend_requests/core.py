from chat_api.models import CustomUser


class FriendRequestApiWrapper:
    """Wrapper to create FriendRequest API"""
    def __call__(self, *args, **kwargs):
        return self._add_friend_request(*args, **kwargs)

    @staticmethod
    def _add_friend_request(user_to: object, user_from: object) -> None:
        from .models import FriendRequest

        FriendRequest.objects.send_fried_request(user_to=user_to, user_from=user_from)


sent_req = FriendRequestApiWrapper()
