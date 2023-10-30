import logging

from django.http import JsonResponse
from django.utils.translation import gettext_lazy as _
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect

from .models import Notification
from .serializers import NotifSerializer
from chat_api.serializers import UserSerialize

# Create your views here.

logger = logging.getLogger(__name__)


@login_required
def notification_list(request):
    logger.debug("notification_list called by user %s" % request.user)
    notification_qs = Notification.objects.filter(user=request.user.pk).order_by('-timestamp')
    new_notifs = notification_qs.filter(viewed=False)
    old_nofifs = notification_qs.filter(viewed=True)
    logger.debug(
        "User %s has %s unread and %s read notifications",
        request.user,
        len(new_notifs),
        len(old_nofifs)
    )
    context = {
        'user': UserSerialize(request.user).data,
        'read': old_nofifs,
        'unread': new_notifs,
    }
    return render(request, 'notifications/list.html', context=context)


@login_required
def notification_view(request, notif_id: int):
    logger.debug(
        "notification_view called by user %s for notif_id %s",
        request.user,
        notif_id
    )
    notif = get_object_or_404(Notification, pk=notif_id)
    if notif.user == request.user:
        logger.debug("Providing notification for user %s" % request.user)
        context = {
            'user': UserSerialize(request.user).data,
            'notif': notif,
        }
        notif.mark_viewed()
        return render(request, 'notifications/view.html', context=context)
    else:
        logger.warning(
            "User %s not authorized to view notif_if %s belonging to user %s",
            request.user,
            notif_id,
            notif.user
        )
        messages.error(request, _('You are not authorized to view that notification.'))
        return redirect('notifications:list')


@login_required
def remove_notification(request, notif_id):
    logger.debug(
        "remove notification called by user %s for notif_id %s",
        request.user, notif_id
    )
    notif = get_object_or_404(Notification, pk=notif_id)
    if notif.user == request.user:
        if Notification.objects.filter(id=notif_id).exists():
            notif.delete()
            logger.debug("Deleting notif_id %s by user %s", notif_id, request.user)
            messages.success(request, _('Deleted notification.'))
    else:
        logger.error(
            "Unable to delete notif %s for user %s - notif matching is not found",
            notif_id,
            request.user
        )
        messages.error(request, _('Failed to locate notification'))
    return redirect('notifications:list')


@login_required
def mark_all_read(request):
    logger.debug("mark all notifications read called by user %s", request.user)
    Notification.objects.filter(user=request.user).update(viewed=True)
    messages.success(request, _('Marked all notifications as read'))
    return redirect("notifications:list")


@login_required
def delete_all_read(request):
    logger.debug("delete all notifications called by user %s", request.user)
    Notification.objects.filter(user=request.user).filter(viewed=True).delete()
    messages.success(request, _('Deleted all notifications'))
    return redirect("notifications:list")


def user_notifications_count(request, user_pk: int):
    """returns notifications count for the give user as JSON
    This view is public and does not log in required
    """
    unread_count = Notification.objects.user_unread_count(user_pk)
    data = {'unread_count': unread_count}
    return JsonResponse(data, safe=0)
