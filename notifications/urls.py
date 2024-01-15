from django.urls import path
from . import views

app_name = 'notifications'
urlpatterns = [
    path('remove_notification/<int:notif_id>/', views.RemoveNotification.as_view(), name='remove'),
    path('notifications/<int:notif_id>/', views.NotificationView.as_view(), name='view'),
    path('notifications/', views.NotificationList.as_view(), name='list'),
    path('notifications/mark_all_read/', views.MarkAllAsRead.as_view(), name='mark_all_read'),
    path('notifications/delete_all_read/', views.DeleteAllRead.as_view(), name='delete_all_read'),
    path(
        'user_notifications_count/<int:user_pk>/',
        views.user_notifications_count,
        name='user_notifications_count'
    ),
]
