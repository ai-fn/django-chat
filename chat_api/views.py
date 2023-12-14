import json

from django.contrib import messages
from django.contrib.auth import login, logout, authenticate
from django.db.models import Q, Count
from rest_framework.permissions import IsAuthenticated

from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.shortcuts import render, redirect, get_object_or_404
from django.template import loader
from django.utils.translation import gettext_lazy as _
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.views import APIView

from .serializers import *
from .forms import *

from notifications.models import Notification
from friend_requests.models import FriendRequest

logger = logging.getLogger(__name__)


def index(request):
    """Index endpoint"""
    if request.user.is_anonymous:
        return redirect('login')
    return redirect('chats')


def show_errors(request, form) -> None:
    print(type(form), type(request))
    errors_json = form.errors.as_json()
    errors_dict = json.loads(errors_json)

    for field, errors in errors_dict.items():
        for error in errors:
            message = error['message']
            messages.warning(request, _(message))
            logger.info("Got an invalid %s form: %s", form.__class__.__name__, message)


class LoginView(APIView):
    """
    Login endpoint
    """

    @staticmethod
    def get(request):
        if request.user.is_anonymous:
            form = LoginForm()
            return render(request, 'index/login.html', context={'form': form})
        return redirect("chats")

    @staticmethod
    def post(request):
        form = LoginForm(data=request.data)
        if form.is_valid():
            email = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, email=email, password=password)
            if user is not None:
                if user.is_email_confirmed:
                    login(request, user)
                    messages.success(request, _("Successfully login"))
                    logger.info("User %s is logged in" % user)
                    return redirect('chats')
                else:
                    messages.warning(request, _("Confirm email for log in"))
                    logger.info("User %s does not confirm email" % user)
                    return redirect('login')
            else:
                messages.warning(request, _("Email or password incorrect"))
                logger.info("User with email %s is not found" % email)
                return redirect('login')
        messages.warning(request, _("Incorrect credential, try again"))
        logger.info("Got an invalid login form")
        return redirect('login')


class RegisterView(APIView):
    """
    Registration endpoint
    """

    @staticmethod
    def get(request):
        if request.user.is_anonymous:
            form = RegisterForm()
            return render(request, 'index/register.html', {'form': form})
        return redirect("chats")

    @staticmethod
    def post(request):
        form = RegisterForm(data=request.data)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']
            if CustomUser.objects.filter(email=email).exists():
                logger.info("Try to register exist user with email %s" % email)
                return redirect('register')
            user = CustomUser.objects.create_user(
                email=email,
                password=password,
            )
            favorite_room = Room.objects.create(name='Favorites')
            favorite_room.members.add(user)
            Folder.objects.create(name='Directs', user=user).rooms.add(favorite_room)
            logger.info("User %s successfully registered" % user)
            _send_verify_email(request, user)
        else:
            show_errors(request, form)
            return redirect('register')

        return redirect('login')


class LogoutView(APIView):
    """
    Logout endpoint
    """

    @staticmethod
    def post(request):
        if not request.user.is_anonymous:
            logger.info("Logout user %s" % request.user)
            logout(request)
        else:
            logger.info("Anonymous user try to log out")
        return redirect('login')


class EmailVerifyView(APIView):
    """
    Endpoint for verify user email.
    """

    def get(self, request, uid64, token):
        user = self.get_user(uid64)
        if user is not None and settings.DEFAULT_TOKEN_GENERATOR.check_token(user, token):
            login(request, user)
            user.is_email_confirmed = True
            user.save()
            messages.success(request, _('Email successfully verified'))
            logger.info('User %s email successfully verified' % request.user)
        else:
            messages.warning(request, _("Confirmation code expired, request a new code"))
            logger.info("Try to confirm expired code")
        return redirect('login')

    @staticmethod
    def get_user(uid64):
        try:
            uid = urlsafe_base64_decode(uid64).decode()
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            user = None
        return user


class ChatsView(APIView):
    """Show all rooms and directs endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request):
        user = request.user
        create_room_form = CreateRoomForm()

        rooms = RoomSerialize(Room.objects.filter(members=user), many=True, context={'request': request})
        folders = FolderSerialize(
            Folder.objects.filter(user=user).order_by('name'),
            many=True,
            context={'request': request}
        ).data
        return render(request, 'index/rooms.html', {
            'rooms': rooms.data,
            'folders': folders,
            'user': UserSerialize(request.user).data,
            'unread': Notification.objects.filter(user=user, viewed=0),
            'friends': UserSerialize(user.Friends, many=1).data,
            'create_room_form': create_room_form,
        })


class ChatView(APIView):
    """Show chat room endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request, room_id):
        room = get_object_or_404(Room, pk=room_id)
        user = request.user
        chat_messages = MessageSerialize(Message.objects.filter(room=room_id), many=True).data
        users = UserSerialize(user.Friends, many=True).data
        context = {
            'chat_messages': chat_messages,
            'room': RoomSerialize(room, context={'request': request}).data,
            'user': UserSerialize(request.user).data,
            'members': users,
            'unread': Notification.objects.filter(user=user, viewed=0)
        }
        return render(request, 'chat/index.html', context=context)


class DirectView(APIView):
    """Show or create direct room endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        user = CustomUser.objects.get(pk=request.data.get('user_id'))
        try:
            room = Room.objects.annotate(count=Count('members')).filter(
                members=user.pk, count=2, type=Room.Type.DIRECT
            ).filter(members=request.user.pk)[0]
        except Room.DoesNotExist:
            room = Room.objects.create(name="Direct with %s" % user.username, type=Room.Type.DIRECT)
            logger.info("Room %s created by %s", room, request.user)
            room.members.add(user.user_id, request.user.user_id)
        chat_messages = MessageSerialize(Message.objects.filter(room=room.pk), many=True).data
        users = UserSerialize(user.Friends, many=True).data
        context = {
            'chat_messages': chat_messages,
            'room': RoomSerialize(room, context={'request': request}).data,
            'user': UserSerialize(request.user).data,
            'user_to': UserSerialize(user).data,
            'members': users,
            'unread': Notification.objects.filter(user=request.user, viewed=False)
        }
        logger.info("Open chat %s by %s", room, request.user)
        return render(request, 'chat/index.html', context=context)


class CreateRoom(APIView):
    """Create room endpoint"""

    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        user = request.user
        form = CreateRoomForm(data=request.data, files=request.FILES)
        if form.is_valid():
            room_name = form.cleaned_data['room_name']
            new_room = Room.objects.create(name=room_name, type=Room.Type.CHAT)
            if form.cleaned_data['room_img']:
                print(type(form.cleaned_data['room_img']))
                new_room.image = form.cleaned_data['room_img']
                new_room.save()
                compress(new_room.image.path, new_room)
            new_room.members.add(user)
        else:
            logger.debug("Got an invalid form from %s" % request.user)
            return redirect('chats')

        logger.info("Room %s has been create by %s", new_room, user)
        return redirect('chats')


class RemoveFriend(APIView):
    """Remove friend from friends list endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        user_id = request.data.get('user_id')
        user = request.user
        user.Friends.remove(user_id)
        user.save()
        logger.info("User %s successfully delete user %s from friends list", user, user_id)
        return redirect('chats')


class Users(APIView):
    """Show all users endpoint"""

    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request):
        return render(request, 'index/users.html', context={
            'user': UserSerialize(request.user).data,
            'users': UserSerialize(CustomUser.objects.filter(~Q(pk=request.user.pk)), many=True).data,
            'friends': UserSerialize(request.user.Friends.all(), many=True).data,
            'requests': FriendRequest.objects.filter(user_from=request.user),
            'unread': Notification.objects.filter(user=request.user, viewed=0),
            'request_sent_for': FriendRequest.objects.requests_sent_for(request.user.pk),
            'search_form': SearchForm(),
        })


class ProfileView(APIView):
    """Profile view endpoint"""

    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def get(request, user_id: int):
        user_profile = CustomUser.objects.get(pk=user_id)
        context = {
            'user': UserSerialize(request.user).data,
            'user_profile': UserSerialize(user_profile).data,
            'friends': UserSerialize(user_profile.Friends.all(), many=True).data,
            'unread': Notification.objects.filter(user=request.user, viewed=0),
        }
        if user_profile.user_id == request.user.user_id:
            context['upd_prof_img'] = UpdProfImg()
            context['form'] = UpdateUserInfoForm(instance=user_profile)
            context['requests'] = FriendRequest.objects.filter(user_to=request.user, status=FriendRequest.Status.SENT)
        else:
            context['form'] = UpdateUserInfoForm(instance=user_profile, disabled=True)
        return render(request, 'index/profile.html', context=context)

    @staticmethod
    def post(request, user_id):
        form = UpdateUserInfoForm(request.data, instance=request.user)
        if form.is_valid():
            form.save()
        return redirect('profile', user_id=user_id)


class UpdProfImage(APIView):
    """Update profile image endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        form_upd_prof_img = UpdProfImg(data=request.data, files=request.FILES)
        if form_upd_prof_img.is_valid():
            img = form_upd_prof_img.cleaned_data['img']
            request.user.Avatar = img
            request.user.save()
        return redirect('profile', user_id=request.user.user_id)


class CreateFolder(APIView):
    """Create folder endpoint"""
    permission_classes = [IsAuthenticated, ]

    @staticmethod
    def post(request):
        name = request.data.get('folder-name')
        folder = Folder.objects.create(name=name, user=request.user)
        logger.info("Folder %s have been created by %s", folder, request.user)
        return redirect('chats')


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
        return redirect('chats')


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
        else:
            logger.info('Folder %s delete failed' % folder_id)
        return redirect('chats')


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
        else:
            logger.info("Room %s does not exists in folder %s", room, fold)
        return redirect('chats')


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
        else:
            logger.info("Room %s already exists in folder %s", room, fold)
        return redirect('chats')


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
    res = send_mail('Confirm email [chat-pet-project.ru]',
                    body,
                    settings.EMAIL_HOST_USER,
                    [user.email, ],
                    True,
                    settings.EMAIL_HOST_USER,
                    settings.EMAIL_HOST_PASSWORD
                    )
    if res:
        messages.success(request, _('Message successfully sent'))
        logger.debug('Confirmation code successfully sent for user %s' % request.user)
    else:
        messages.error(request, _('Message sent failed'))
        logger.warning('Confirmation code sent failed for user %s' % request.user)
    return render(request, 'index/login.html')


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
    def post(request):
        form = SearchForm(data=request.data)
        if form.is_valid():
            body = form.cleaned_data.get('body').lower()
            users = CustomUser.objects.filter(
                Q(username__icontains=body) | Q(First_Name__icontains=body) | Q(Second_Name__icontains=body)
            )
            return render(
                request,
                'index/users.html',
                context={
                    'user': UserSerialize(request.user).data,
                    'search_form': SearchForm(),
                    'users': UserSerialize(users, many=True, ).data,
                    'friends': UserSerialize(request.user.Friends.all(), many=True).data,
                    'requests': FriendRequest.objects.filter(user_from=request.user),
                    'unread': Notification.objects.filter(user=request.user, viewed=0),
                    'request_sent_for': FriendRequest.objects.requests_sent_for(request.user.pk)
                }
            )
        logger.debug("Got an invalid search form from %s" % request.user)
        return redirect('users')


class ResendConfirmMessage(APIView):

    @staticmethod
    def post(request):
        email = request.data.get('email')
        user = get_object_or_404(CustomUser, email=email)
        _send_verify_email(request, user)
        logger.debug("Resend confirm message for user %s" % user)
        return redirect('login')
