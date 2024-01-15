import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.response import Response

from .models import FriendRequest
from .serializers import RequestSerializer
from notifications.models import Notification
from chat_api.serializers import UserSerialize

# Create your views here.

logger = logging.getLogger(__name__)


@login_required
def request_list(request):
    logger.info("Requests list was called by %s" % request.user)
    requests_list_qs = FriendRequest.objects.filter(user_to=request.user).order_by("-timestamp")
    accepted = RequestSerializer(requests_list_qs.filter(status=FriendRequest.Status.ACCEPTED), many=1).data
    declined = RequestSerializer(requests_list_qs.filter(status=FriendRequest.Status.DECLINED), many=1).data
    sent = RequestSerializer(requests_list_qs.filter(status=FriendRequest.Status.SENT), many=1).data
    logger.info(
        "User %s has %s accepted, %s declined and %s sent friend requests",
        request.user, len(accepted), len(declined), len(sent)
    )
    context = {
        'user': (UserSerialize(request.user)).data,
        'accepted': accepted,
        'declined': declined,
        'sent': sent,
        'unread': Notification.objects.filter(user=request.user, viewed=0)
    }
    return Response(data=context, status=status.HTTP_200_OK)


@login_required
def friend_request_view(request, req_id: int):
    logger.info(
        "friend_request:view called by user %s for req_id %s",
        request.user,
        req_id
    )
    req = get_object_or_404(FriendRequest, pk=req_id)
    if req.user_to == request.user:
        logger.info("Providing friend request for user %s" % request.user)
        context = {
            'message': "Providing friend_request for user %s" % request.user.pk,
            'user': UserSerialize(request.user).data,
            'req': RequestSerializer(req).data,
        }
        return Response(data=context, status=status.HTTP_200_OK)
    else:
        logger.warning(
            "User %s not authorized to view notification with id %s belonging to user %s",
            request.user,
            req_id,
            req.user_to
        )
        messages.error(request, _('You are not authorized to view that friend_request.'))
        return Response(
            {'message': 'You are not authorized to view that friend_request'},
            status=status.HTTP_403_FORBIDDEN
        )


@login_required
def request_set_as_accepted(request, request_pk):
    logger.info("Request %s set as accessed by user %s", request_pk, request.user)
    friend_request = get_object_or_404(FriendRequest, pk=request_pk)
    friend_request.set_status('accepted')
    messages.success(request, _('Request accepted'))
    friend_request.user_to.Friends.add(friend_request.user_from)
    return Response({"message": 'Marked friend request as accepted'}, status=status.HTTP_200_OK)


@login_required
def request_set_as_declined(request, request_pk):
    logger.info("Request %s set as declined by user %s", request_pk, request.user)
    friend_request = get_object_or_404(FriendRequest, pk=request_pk)
    friend_request.set_status('declined')
    messages.success(request, _('Request declined'))
    return Response({"message": 'Marked friend request as declined'}, status=status.HTTP_200_OK)


@login_required
def send_request(request, to_user_pk):
    from .core import sent_req

    logger.info("User %s sent friend request to user with pk %s", request.user, to_user_pk)

    try:
        sent_req(user_from=request.user.pk, user_to=to_user_pk)
    except ValueError as e:
        logger.error(e.args[0])
        messages.warning(request, _(e.args[0]))
        return redirect('users')
    messages.success(request, _("Friend request sent"))
    return Response({"message": "Friend request successfully sent"}, status=status.HTTP_200_OK)


def user_requests_count(request, user_pk):
    sent_requests = FriendRequest.objects.user_sent_count(user_pk=user_pk)
    data = {'sent_requests': sent_requests}
    return JsonResponse(data=data, safe=0)


@login_required
def remove_request(request, request_pk):
    logger.info("Remove friend_request %s was called by user %s", request_pk, request.user)
    friend_req = get_object_or_404(FriendRequest, pk=request_pk)
    if friend_req.user_from == request.user:
        friend_req.delete()
        logger.info('Friend request %s was deleted by user %s', request_pk, request.user)
        messages.success(request, _('Friend request deleted'))
        return Response(
            {'message': "Friend request successfully deleted"},
            status=status.HTTP_200_OK
        )
    else:
        logger.error("Unable to delete friend request %s for user %s - matching is not found",
                     request_pk, friend_req.user_from)
    return Response(
        {'message': "Unable to delete Friend request for user %s" % friend_req.user_to},
        status=status.HTTP_403_FORBIDDEN
    )
