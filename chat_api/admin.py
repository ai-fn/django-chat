from django.contrib import admin

# Register your models here.

from .models import *


@admin.register(Message)
class MessageRegister(admin.ModelAdmin):
    list_display = ["id", "body", "sender", "sent_at", "room"]
    list_filter = (
        "sent_at",
        "room",
        "as_file",
        "pinned",
        "edited",
    )

    ordering = ("-sent_at", )
    search_fields = ['body', 'sender__name', 'room__name', ]


@admin.register(CustomUser)
class CustomUserRegister(admin.ModelAdmin):
    list_display = ["username", "email", "password", "First_Name", "Second_Name",
                    "Avatar", "is_deactivated", "is_email_confirmed", "is_staff", "is_superuser"]
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_email_confirmed",
    )

    search_fields = ['username', 'First_Name', 'Second_Name']


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


@admin.register(Attachments)
class AttachmentsRegister(admin.ModelAdmin):
    list_display = ["message", "file"]
    list_filter = (
        "message",
    )

    search_fields = ['message', 'file']
