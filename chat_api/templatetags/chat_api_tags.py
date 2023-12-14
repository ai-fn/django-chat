from django import template
from rest_framework.utils.serializer_helpers import ReturnDict

register = template.Library()


@register.filter(name='split')
def split(value, split_by: str, *args, **kwargs):
    return value.split(split_by)


@register.filter(name='join')
def join(value, join_by: str, *args, **kwargs):
    return join_by.join(value.split(" "))


@register.filter(name='sort')
def sort(value, sort_by: str):
    try:
        res = sorted(
            value,
            key=lambda x: "" if x["last_message"] is None else x["last_message"]["sent_at"] if x["last_message"]["room"] is not None else x["created_at"],
            reverse=True
        )
    except (KeyError, ValueError):
        return value
    return res
