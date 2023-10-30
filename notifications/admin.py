from django.contrib import admin

from .models import *
# Register your models here.


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "title", "level", "viewed")
    list_select_related = ("user", )
    list_filter = (
        "level",
        "timestamp",
    )
    ordering = ("-timestamp", )
    search_fields = ["user__username", ]
