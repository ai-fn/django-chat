from django.contrib import messages
from django.contrib.auth import login, logout, authenticate
from django.db.models import Count

from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.template import loader
from django.utils.translation import gettext_lazy as _
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from friend_requests.serializers import RequestSerializer
from notifications.serializers import NotifSerializer
from .serializers import *

from notifications.models import Notification
from friend_requests.models import FriendRequest

logger = logging.getLogger(__name__)


class LoginView(APIView):
    """
    Login endpoint
    """

    @staticmethod
    def post(request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, email=email, password=password)
        if user is not None:
            if user.is_email_confirmed:
                login(request, user)
                messages.success(request, _("Successfully login"))
                logger.info("User %s is logged in" % user)
                return Response({'message': 'Successfully login'}, status=status.HTTP_200_OK)
            else:
                messages.warning(request, _("Confirm email for log in"))
                logger.info("User %s does not confirm email" % user)
                return Response({'message': 'Confirm email for log in'}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            messages.warning(request, _("Email or password incorrect"))
            logger.info("User with email %s is not found" % email)
            return Response({'message': 'Email or password incorrect'}, status=status.HTTP_401_UNAUTHORIZED)


class RegisterView(APIView):
    """
    Registration endpoint
    """

    @staticmethod
    def post(request):
        email = request.data.get('email')
        password = request.data.get('password')
        if CustomUser.objects.filter(email=email).exists():
            logger.info("Try to register exist user with email %s" % email)
            return Response({'message': 'User with provided email already exists'}, status=status.HTTP_400_BAD_REQUEST)
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
        )
        favorite_room = Room.objects.create(name='Favorites')
        favorite_room.members.add(user)
        Folder.objects.create(name='Directs', user=user).rooms.add(favorite_room)
        logger.info("User %s successfully registered" % user)
        _send_verify_email(request, user)

        return Response({"message": "Successfully register"}, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """
    Logout endpoint
    """

    @staticmethod
    def post(request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(email=email, password=password)
        if user is not None:
            logout(request)
            return Response({'message': "Successfully logout"}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "You are not authenticated yet"}, status=status.HTTP_401_UNAUTHORIZED)


class EmailVerifyView(APIView):
    """
    Endpoint for verify user email.
    """

    def get(self, request, uid64, token):
        user = self.get_user(request.user, uid64)
        if user is not None and settings.DEFAULT_TOKEN_GENERATOR.check_token(user, token):
            login(request, user)
            user.is_email_confirmed = True
            user.save()
            messages.success(request, _('Email successfully verified'))
            logger.info('User %s email successfully verified' % request.user)
            return Response({"message": 'Email successfully verified'}, status=status.HTTP_200_OK)
        messages.warning(request, _("Confirmation code expired, request a new code"))
        logger.info("Try to confirm expired code")
        return Response(
            {"message": "Confirmation code expired, request a new code"},
            status=status.HTTP_400_BAD_REQUEST
        )

    @staticmethod
    def get_user(user, uid64):
        try:
            uid = urlsafe_base64_decode(uid64).decode()
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist) as e:
            logger.warning(f"User %s tried to verify email, but got error %s", user, e)
            user = None
        return user


class ChatsView(APIView):
    """Show all rooms and directs endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request):
        logger.info("Chats view called by user %s" % request.user)
        user = request.user

        rooms = RoomSerialize(Room.objects.filter(members=user), many=True, context={'request': request})
        folders = FolderSerialize(
            Folder.objects.filter(user=user).order_by('name'),
            many=True,
            context={'request': request}
        ).data
        context = {
            'message': 'Chats view',
            'rooms': rooms.data,
            'folders': folders,
            'user': UserSerialize(request.user).data,
            'unread': NotifSerializer(Notification.objects.filter(user=user, viewed=False), many=True).data,
            'friends': UserSerialize(user.Friends, many=True).data,
        }
        return Response(data=context, status=status.HTTP_200_OK)


class ChatView(APIView):
    """Show chat room endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request, room_id):
        logger.info("User %s entered into room with pk %s", request.user, room_id)
        room = get_object_or_404(Room, pk=room_id)
        user = request.user
        chat_messages = MessageSerialize(Message.objects.filter(room=room_id), many=True).data
        users = UserSerialize(user.Friends, many=True).data
        context = {
            'message': 'Chat view',
            'chat_messages': chat_messages,
            'room': RoomSerialize(room, context={'request': request}).data,
            'user': UserSerialize(request.user).data,
            'members': users,
            'unread': NotifSerializer(Notification.objects.filter(user=user, viewed=0), many=True).data
        }
        return Response(data=context, status=status.HTTP_200_OK)


class DirectView(APIView):
    """Show or create direct room endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(self, request):
        user = CustomUser.objects.get(pk=request.data.get('user_id'))
        try:
            room = Room.objects.annotate(count=Count('members')).filter(
                members=user.pk, count=2, type=Room.Type.DIRECT
            ).filter(members=request.user.pk)[0]
            return Response({"message": "Direct exists", "room_id": room.id}, status=status.HTTP_200_OK)
        except IndexError:
            room = Room.objects.create(name="Direct with %s" % user.username, type=Room.Type.DIRECT)
            logger.info("Direct room %s created by %s", room, request.user)
            room.members.add(user.user_id, request.user.user_id)
            return Response(
                {"message": "Direct room successfully created", "room_id": room.id},
                status=status.HTTP_201_CREATED
            )

    @staticmethod
    def get(request, room_id: int):
        room = Room.objects.get(pk=room_id)
        user = room.members.exclude(pk=request.user.user_id)[0]
        chat_messages = MessageSerialize(Message.objects.filter(room=room.pk), many=True).data
        users = UserSerialize(user.Friends, many=True).data
        context = {
            'message': 'Direct view',
            'chat_messages': chat_messages,
            'room': RoomSerialize(room, context={'request': request}).data,
            'user': UserSerialize(request.user).data,
            'user_to': UserSerialize(user).data,
            'members': users,
            'unread': NotifSerializer(Notification.objects.filter(user=request.user, viewed=False), many=True).data,
        }
        logger.info("Direct room with pk %s opened  by %s", room.id, request.user)
        return Response(data=context, status=status.HTTP_200_OK)


class CreateRoom(APIView):
    """Create room endpoint"""

    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        user = request.user
        room_name = request.data.get('room_name')
        new_room = Room.objects.create(name=room_name, type=Room.Type.CHAT)
        img = request.data.get('room_img')
        if img:
            new_room.image = img
            new_room.save()
            compress(new_room.image.path, new_room)
        new_room.members.add(user)
        logger.info("Room %s has been create by %s", new_room, user)
        return Response(
            {"message": 'Room successfully created', 'room': RoomSerialize(new_room).data},
            status=status.HTTP_201_CREATED
        )


class RemoveFriend(APIView):
    """Remove friend from friends list endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        user_id = request.data.get('user_id')
        user = request.user
        user.Friends.remove(user_id)
        user.save()
        logger.info("User with pk %s successfully delete user %s from friends list", user.pk, user_id)
        return Response(
            {"message": 'Successfully delete user %s from friends list' % user_id},
            status=status.HTTP_200_OK
        )


class Users(APIView):
    """Show all users endpoint"""

    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request):
        logger.info("User with pk %s called search users view" % request.user.pk)
        context = {
            'message': 'Users view',
            'user': UserSerialize(request.user).data,
            'users': UserSerialize(CustomUser.objects.filter(~Q(pk=request.user.pk)), many=True).data,
            'friends': UserSerialize(request.user.Friends.all(), many=True).data,
            'unread': NotifSerializer(
                Notification.objects.filter(user=request.user, viewed=0),
                many=True
            ).data,
            'request_sent_for': RequestSerializer(
                FriendRequest.objects.requests_sent_for(request.user.pk),
                many=True
            ).data,
        }
        return Response(data=context, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """Profile view endpoint"""

    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request, user_id: int):
        logger.info("User with pk %s called profile view for user with pk %s", request.user.pk, user_id)
        user_profile = CustomUser.objects.get(pk=user_id)
        context = {
            'message': 'Profile view',
            'user': UserSerialize(request.user).data,
            'user_profile': UserSerialize(user_profile).data,
            'friends': UserSerialize(user_profile.Friends.all(), many=True).data,
            'unread': NotifSerializer(Notification.objects.filter(user=request.user, viewed=0), many=True).data,
        }
        return Response(data=context, status=status.HTTP_200_OK)

    @staticmethod
    def post(request, user_id):
        user = request.user
        avatar = request.FILES.get("avatar")
        user.First_Name = request.data.get("first_name")
        user.Second_Name = request.data.get("second_name")
        user.username = request.data.get("username")
        if avatar is not None and user.Avatar != avatar:
            user.Avatar = avatar
        user.save()
        logger.info("User with pk %s successfully update profile info" % user_id)
        messages.success(request, _("Info successfully updated!"))
        return Response(
            {"message": "Info successfully updated", 'user': UserSerialize(user).data},
            status=status.HTTP_200_OK
        )


class CreateFolder(APIView):
    """Create folder endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        name = request.data.get('folder-name')
        folder = Folder.objects.create(name=name, user=request.user)
        logger.info("Folder %s have been created by %s", folder, request.user)
        return Response(
            {'message': "Folder successfully created", 'folder': FolderSerialize(folder)},
            status=status.HTTP_201_CREATED
        )


class LeaveRoom(APIView):
    """Endpoint for leave room"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        user = request.user
        room_id = request.data.get('room-id')
        room = Room.objects.get(pk=room_id)
        room.members.remove(user)
        for folder in user.user_folder.all():
            folder.rooms.remove(room)
            folder.save()
        room.save()
        logger.info('Member %s removed from room %s', user, room)
        return Response(
            {
                "message": f'Member {user} removed from room {room_id}',
                'room': RoomSerialize(room).data
            },
            status=status.HTTP_200_OK
        )


class RemoveFolder(APIView):
    """Remove folder endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        folder_id = request.data.get('folder-id')
        logger.info('User %s try to delete folder %s', request.user, folder_id)
        if Folder.objects.filter(pk=folder_id).exists():
            Folder.objects.get(pk=folder_id).delete()
            logger.info('User %s successfully delete folder %s', request.user, folder_id)
            return Response({"message": 'Folder successfully deleted'}, status=status.HTTP_200_OK)
        else:
            logger.info('Folder %s delete failed' % folder_id)
            return Response({"message": 'Folder deletion failed'}, status=status.HTTP_400_BAD_REQUEST)


class RemoveRoomFromFolder(APIView):
    """Remove room from folder endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        folder_id = request.data.get('folder-id')
        room_id = request.data.get('room-id')
        logger.info("User %s try remove room with id %s from folder with id %s", request.user, room_id, folder_id)
        fold = get_object_or_404(Folder, pk=folder_id)
        room = get_object_or_404(Room, pk=room_id)
        if fold.rooms.filter(pk=room.pk).exists():
            fold.rooms.remove(room)
            fold.save()
            logger.info("Room %s successfully removed to folder %s", room, fold)
            return Response({"message": "Room %s successfully removed to folder" % room}, status=status.HTTP_200_OK)
        else:
            logger.info("Room %s does not exists in folder %s", room, fold)
            return Response(
                {"message": 'Room %s does not exists in folder' % room_id},
                status=status.HTTP_400_BAD_REQUEST
            )


class AddToFolder(APIView):
    """Add room to folder endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        folder_id = request.data.get('folder-id')
        room_id = request.data.get('room-id')
        logger.info("User %s try add room with id %s to folder with id %s", request.user, room_id, folder_id)
        fold = get_object_or_404(Folder, pk=folder_id)
        room = get_object_or_404(Room, pk=room_id)
        if not fold.rooms.filter(pk=room.pk).exists():
            fold.rooms.add(room)
            fold.save()
            logger.info("Room %s successfully added to folder %s", room, fold)
            return Response({"message": "Room %s successfully added to folder" % room}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Room %s already exists in folder" % room}, status=status.HTTP_400_BAD_REQUEST)


def _send_verify_email(
        request,
        user: CustomUser,
        email_template_name='index/verify_email.html'
):
    """
    Send a EmailMessage to user.
    """
    context = _generate_unique_code(request, user)
    body = loader.render_to_string(email_template_name, context)
    res = send_mail('Confirm email [chat-pet-project.com]',
                    body,
                    settings.EMAIL_HOST_USER,
                    [user.email, ],
                    True,
                    settings.EMAIL_HOST_USER,
                    settings.EMAIL_HOST_PASSWORD
    )
    if res:
        messages.success(request, _('Message successfully sent, confirm it at %s' % user.email))
        logger.info('Confirmation code successfully sent for user %s' % request.user)
        return Response(
            {"message": 'Confirmation code successfully sent for user %s' % request.user},
            status=status.HTTP_200_OK
        )
    else:
        messages.error(request, _('Message sent failed'))
        logger.warning('Confirmation code sent failed for user %s' % request.user)
        return Response(
            {"message": 'Confirmation code sent failed for user %s' % request.user},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _generate_unique_code(
        request,
        user,
        use_https=False,
):
    """
    Generate a one-use only link for verify email.
    """
    current_site = get_current_site(request)
    site_name = current_site.name
    domain = current_site.domain
    user_email = user.email
    context = {
        "email": user_email,
        "domain": domain,
        "site_name": site_name,
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "user": user,
        "token": settings.DEFAULT_TOKEN_GENERATOR.make_token(user),
        "protocol": ['http', 'https'][use_https]
    }
    return context


class SearchUsers(APIView):

    @staticmethod
    def get(request, user_id):
        friends = UserSerialize(CustomUser.objects.filter(Friends=user_id), many=True).data
        return Response(data={"friends": friends}, status=status.HTTP_200_OK)

    @staticmethod
    def post(request):
        body = request.data.get('body').lower()
        users = CustomUser.objects.filter(
            Q(username__icontains=body) | Q(First_Name__icontains=body) | Q(Second_Name__icontains=body)
        )
        context = {
            'user': UserSerialize(request.user).data,
            'users': UserSerialize(users, many=True, ).data,
            'friends': UserSerialize(request.user.Friends.all(), many=True).data,
            'requests': FriendRequest.objects.filter(user_from=request.user),
            'unread': NotifSerializer(Notification.objects.filter(user=request.user, viewed=0), many=True).data,
            'request_sent_for': FriendRequest.objects.requests_sent_for(request.user.pk)
        }
        return Response(data=context, status=status.HTTP_200_OK)


class ResendConfirmMessage(APIView):

    @staticmethod
    def post(request):
        email = request.data.get('email')
        user = get_object_or_404(CustomUser, email=email)
        _send_verify_email(request, user)
        logger.info("Resend confirm message for user with pk %s" % user.pk)
        return Response(
            {'message': "Resend confirm message for user with pk %s" % user.pk},
            status=status.HTTP_200_OK
        )
