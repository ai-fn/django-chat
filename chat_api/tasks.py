import random

from .models import CustomUser
from notifications.models import Notification
from chat.celery import app


@app.task
def example_task():
    user = random.choice(CustomUser.objects.all())
    Notification(
        user=user,
        title="Time to warm-up!",
        message="You've been sitting too long, it's time to stretch your legs."
    ).save()
