import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import gettext_lazy as _

from .models import FriendRequest
from .serializers import RequestSerializer
from notifications.models import Notification
from chat_api.serializers import UserSerialize

# Create your views here.

logger = logging.getLogger(__name__)


@login_required
def request_list(request):
    logger.debug("Requests list was called by %s" % request.user)
    requests_list_qs = FriendRequest.objects.filter(user_to=request.user).order_by("-timestamp")
    accepted = RequestSerializer(requests_list_qs.filter(status=FriendRequest.Status.ACCEPTED), many=1).data
    declined = RequestSerializer(requests_list_qs.filter(status=FriendRequest.Status.DECLINED), many=1).data
    sent = RequestSerializer(requests_list_qs.filter(status=FriendRequest.Status.SENT), many=1).data
    logger.debug(
        "User %s has %s accepted, %s declined and %s sent friend requests",
        len(accepted), len(declined), len(sent))
    context = {
        'user': (UserSerialize(request.user)).data,
        'accepted': accepted,
        'declined': declined,
        'sent': sent,
        'unread': Notification.objects.filter(user=request.user, viewed=0)
    }
    return render(request, 'friend_requests/list.html', context=context)


@login_required
def request_set_as_accepted(request, request_pk):
    logger.debug("Request %s set as accessed by user %s", request_pk, request.user)
    friend_request = get_object_or_404(FriendRequest, pk=request_pk)
    friend_request.set_status('accepted')
    messages.success(request, _('Request accepted'))
    friend_request.user_to.Friends.add(friend_request.user_from)
    return redirect("friend_requests:list")


@login_required
def request_set_as_declined(request, request_pk):
    logger.debug("Request %s set as declined by user %s", request_pk, request.user)
    friend_request = get_object_or_404(FriendRequest, pk=request_pk)
    friend_request.set_status('declined')
    messages.success(request, _('Request declined'))
    return redirect("friend_requests:list")


@login_required
def send_request(request, to_user_pk):
    from .core import sent_req

    logger.debug("User %s sent friend request to user with pk %s", request.user, to_user_pk)

    sent_req(user_from=request.user.pk, user_to=to_user_pk)
    messages.success(request, "Friend request sent")
    return redirect('users')


def user_requests_count(request, user_pk):
    sent_requests = FriendRequest.objects.user_sent_count(user_pk=user_pk)
    data = {'sent_requests': sent_requests}
    return JsonResponse(data=data, safe=0)


@login_required
def remove_request(request, request_pk):
    logger.debug("Remove friend_request %s was called by user %s", request_pk, request.user)
    friend_req = get_object_or_404(FriendRequest, pk=request_pk)
    if friend_req.user_from == request.user:
        if FriendRequest.objects.filter(pk=request_pk).exists():
            friend_req.delete()
            logger.debug('Friend request %s was deleted by user %s', request_pk, request.user)
            messages.success(request, _('Friend request deleted'))
    else:
        logger.error("Unable to delete friend request %s for user %s - matching is not found",
                     request_pk, friend_req.user_from)
    return redirect('friend_requests:list')
