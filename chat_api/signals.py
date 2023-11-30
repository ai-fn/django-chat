from django.contrib.auth import get_user_model
from social_core.pipeline.user import get_username

User = get_user_model()


def associate_by_email(strategy, details, user=None, *args, **kwargs):
    email = details.get('email')
    if email:
        try:
            existing_user = User.objects.get(email=email)
            return {'user': existing_user}
        except User.DoesNotExist:
            pass


def set_username(strategy, details, user=None, *args, **kwargs):
    backend = kwargs.get('backend')
    if not user.username:
        user.username = get_username(strategy, details, backend)
