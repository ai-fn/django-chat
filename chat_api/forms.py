from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm, UserChangeForm

from .models import CustomUser


class LoginForm(AuthenticationForm):
    username = forms.EmailField(label='Username', widget=forms.TextInput(attrs={'class': 'form-control'}), label_suffix='')
    password = forms.CharField(label='Password', widget=forms.PasswordInput(attrs={'class': 'form-control'}), label_suffix='')


class RegisterForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    email = forms.EmailField(label='Email', widget=forms.EmailInput(attrs={'class': 'form-control'}), label_suffix='')
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput(attrs={'class': 'form-control'}), label_suffix='')
    password2 = forms.CharField(label='Confirm password', widget=forms.PasswordInput(attrs={'class': 'form-control'}), label_suffix='')

    class Meta:
        model = CustomUser
        fields = ('email',)
        field_classes = {'email': forms.EmailField}


class CreateRoomForm(forms.Form):
    room_name = forms.CharField(
        label="Room name",
        widget=forms.TextInput(
            attrs={'class': 'form-control', 'style': 'margin-bottom: 10px;'}
        ), label_suffix="",
        max_length=100,
    )
    room_img = forms.ImageField(
        label='',
        widget=forms.FileInput(attrs={'id': 'imgInput', 'class': 'form-control', 'accept': 'image/*'}),
        required=False
    )


class SearchForm(forms.Form):
    body = forms.CharField(
        label='',
        widget=forms.TextInput(
            attrs={'type': 'text', 'placeholder': 'Search', 'class': 'form-control', 'dir': 'auto', 'autocomplete': 'off'}
        )
    )
