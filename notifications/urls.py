from django.urls import path
from . import views

app_name = 'notifications'
urlpatterns = [
    path('remove_notification/<int:notif_id>/', views.remove_notification, name='remove'),
    path('notifications/<int:notif_id>/', views.notification_view, name='view'),
    path('notifications/', views.notification_list, name='list'),
    path('notifications/mark_all_read/', views.mark_all_read, name='mark_all_read'),
    path('notifications/delete_all_read/', views.delete_all_read, name='delete_all_read'),
    path(
        'user_notifications_count/<int:user_pk>/',
        views.user_notifications_count,
        name='user_notifications_count'
    ),
]
