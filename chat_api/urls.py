from django.urls import path, include
from .views import *

urlpatterns = [
    path('', index),
    path('verify-email/<uid64>/<token>/', EmailVerifyView.as_view(), name='verify-email'),
    path('api-auth/', include('rest_framework.urls')),
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('chats/', ChatsView.as_view(), name='chats'),
    path('chat/<int:room_id>/', ChatView.as_view(), name='chat'),
    path('direct/', DirectView.as_view(), name='direct'),
    path('direct/<int:room_id>/', DirectView.as_view(), name='direct'),
    path('chats/create-chat/', CreateRoom.as_view(), name='create-chat'),
    path('create-chat/', CreateRoom.as_view()),
    path('users/', Users.as_view(), name='users'),
    path('profile/<int:user_id>/', ProfileView.as_view(), name='profile'),
    path('update-profile-image/', UpdProfImage.as_view(), name='upd-prof-img'),
    path('create-folder/', CreateFolder.as_view(), name='create-folder'),
    path('remove-friend/', RemoveFriend.as_view(), name='remove-friend'),
    path('remove-folder/', RemoveFolder.as_view(), name='remove-folder'),
    path('leave-room/', LeaveRoom.as_view(), name='leave-room'),
    path('remove-room-from-folder/', RemoveRoomFromFolder.as_view(), name='remove-room-from-folder'),
    path('add-room-to-folder/', AddToFolder.as_view(), name='add-room-to-folder'),
    path('search-users/', SearchUsers.as_view(), name='search-users'),
    path('resend-confirm-message/', ResendConfirmMessage.as_view(), name='resend-confirm-message'),
]
