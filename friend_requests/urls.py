from django.urls import path
from . import views

app_name = 'friend_requests'

urlpatterns = [
    path('friend-requests/', views.request_list, name='list'),
    path('friend-requests/set_as_accepted/<int:request_pk>/', views.request_set_as_accepted, name='set_as_accepted'),
    path('friend-requests/set_as_declined/<int:request_pk>/', views.request_set_as_accepted, name='set_as_declined'),
    path('friend-requests/send-request/<int:to_user_pk>/', views.send_request, name='send'),
    path('friend-requests/remove-request/<int:request_pk>/', views.remove_request, name='remove'),
    path('friend-requests/user-requests-count/<int:user_pk>/', views.user_requests_count, name='user_requests_count'),
]
