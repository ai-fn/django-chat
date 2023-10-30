# Generated by Django 4.2.5 on 2023-10-09 19:31

import chat_api.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat_api', '0012_alter_customuser_avatar_alter_room_image'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='Avatar',
            field=models.ImageField(default='images/users-avatars/base-user.png', null=True, upload_to=chat_api.models.get_upload_path),
        ),
        migrations.AlterField(
            model_name='room',
            name='image',
            field=models.ImageField(default='images/room-images/base-room.png', null=True, upload_to=chat_api.models.room_directory_path),
        ),
    ]
