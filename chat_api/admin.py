from django.contrib import admin

# Register your models here.

from .models import *


@admin.register(Message)
class MessageRegister(admin.ModelAdmin):
    list_display = ["body", "sender", "sent_at", "room"]
    list_filter = (
        "sent_at",
        "room"
    )

    ordering = ("-sent_at", )
    search_fields = ['body', 'sender__name', 'room__name', ]


@admin.register(CustomUser)
class CustomUserRegister(admin.ModelAdmin):
    list_display = ["username", "email", "password", "First_Name", "Second_Name", "Patronymic", "Date_of_birth",
                    "Avatar", "is_deactivated", "is_email_confirmed", "is_staff", "is_superuser"]
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_email_confirmed",
        "Date_of_birth"
    )

    ordering = ("-Date_of_birth", )
    search_fields = ['username', 'First_Name', 'Second_Name', 'Patronymic']


@admin.register(Folder)
class FolderRegister(admin.ModelAdmin):
    list_display = ["name", "user", "created_at"]
    list_filter = (
        "created_at",
    )

    ordering = ("-created_at", )
    search_fields = ['name', 'user__name']


@admin.register(Room)
class RoomRegister(admin.ModelAdmin):
    list_display = ["name", "image", "created_at", "type"]
    list_filter = (
        "type",
    )

    ordering = ("-created_at", )
    search_fields = ['name', 'members__name']
