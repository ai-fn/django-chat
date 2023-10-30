from django.contrib import admin

from .models import *

# Register your models here.


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "status", "user_from", "user_to")
    list_select_related = ("user_from", "user_to")
    list_filter = (
        "status",
        "timestamp",
    )
    ordering = ("-timestamp", )
    search_fields = ["user_to__username", "user_from__username"]
