from django.urls import path
from . import views

app_name = 'friend_requests'

urlpatterns = [
    path('friend-requests/', views.RequestList.as_view(), name='list'),
    path('friend-requests/<int:req_id>/', views.FriendRequestView, name='view'),
    path('friend-requests/set_as_accepted/<int:request_pk>/', views.RequestSetAsAccepted.as_view(), name='set_as_accepted'),
    path('friend-requests/set_as_declined/<int:request_pk>/', views.RequestSetAsDeclined.as_view(), name='set_as_declined'),
    path('friend-requests/send-request/<int:to_user_pk>/', views.SendRequest.as_view(), name='send'),
    path('friend-requests/remove-request/<int:request_pk>/', views.RemoveRequest.as_view(), name='remove'),
    path('friend-requests/user-requests-count/<int:user_pk>/', views.user_requests_count, name='user_requests_count'),
]
