# Generated by Django 4.2.6 on 2023-10-29 16:31

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='notification',
            options={'verbose_name': 'Notification', 'verbose_name_plural': 'Notifications'},
        ),
    ]
