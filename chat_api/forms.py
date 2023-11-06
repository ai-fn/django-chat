from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm, UserChangeForm

from .models import CustomUser


class UpdateUserInfoForm(UserChangeForm):

    def __init__(self, *args, **kwargs):
        disabled = kwargs.pop('disabled', False)
        self.disabled = disabled
        super().__init__(*args, **kwargs)
        if disabled:
            for field in self.fields:
                self.fields[field].widget.attrs['disabled'] = 'disabled'

    disabled: bool

    username = forms.CharField(label='',
                               widget=forms.TextInput(attrs={'class': 'inp', 'placeholder': 'username'}),
                               max_length=100)
    First_Name = forms.CharField(label='',
                                 widget=forms.TextInput(attrs={'class': 'inp', 'placeholder': 'first name'}),
                                 required=False)
    Second_Name = forms.CharField(label='',
                                  widget=forms.TextInput(attrs={'class': 'inp', 'placeholder': 'last name'}),
                                  required=False)
    Patronymic = forms.CharField(label='',
                                 widget=forms.TextInput(attrs={'class': 'inp', 'placeholder': 'father name'}),
                                 required=False)
    Date_of_birth = forms.DateField(label='', input_formats=["%d.%m.%Y", "%Y.%m.%d", "%Y-%m-%d", "%d-%m-%Y"],
                                    widget=forms.DateInput(format="%Y-%m-%d", attrs={"type": "date", 'class': 'inp',
                                                                                     "style": "padding: 0px 40px;"}),
                                    required=False)
    password = None

    class Meta:
        model = CustomUser
        exclude = ['is_deactivated', 'password', 'last_login', 'is_email_confirmed', 'is_staff', 'is_superuser',
                   'email', 'Friends', 'Avatar']


class LoginForm(AuthenticationForm):
    username = forms.EmailField(label='', widget=forms.TextInput(attrs={'class': 'inp', 'placeholder': 'email'}))
    password = forms.CharField(label='', widget=forms.PasswordInput(attrs={'class': 'inp', 'placeholder': 'password'}))


class RegisterForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    email = forms.EmailField(label='', widget=forms.EmailInput(attrs={'class': 'inp', 'placeholder': 'email'}), )
    password1 = forms.CharField(label='', widget=forms.PasswordInput(attrs={'class': 'inp', 'placeholder': 'password'}))
    password2 = forms.CharField(label='',
                                widget=forms.PasswordInput(attrs={'class': 'inp', 'placeholder': 'confirm password'}))

    class Meta:
        model = CustomUser
        fields = ('email',)
        field_classes = {'email': forms.EmailField}


class UpdProfImg(forms.Form):
    img = forms.ImageField(
        label='',
        widget=forms.FileInput(attrs={'id': 'imageInput', 'class': 'form-control', 'accept': 'image/*'})
    )


class CreateRoomForm(forms.Form):
    room_name = forms.CharField(
        label="",
        widget=forms.TextInput(
            attrs={'class': 'form-control text-bg-dark', 'style': 'margin-bottom: 10px;', 'placeholder': 'Room name...'}
        ),
        max_length=100,
    )
    room_img = forms.ImageField(
        label='',
        widget=forms.FileInput(attrs={'id': 'imgInput', 'class': 'form-control', 'accept': 'image/*'})
    )


class SearchForm(forms.Form):
    body = forms.CharField(
        label='',
        widget=forms.TextInput(
            attrs={'type': 'search', 'placeholder': 'Search users...', 'class': 'inp', 'style': 'width: 100%;'}
        )
    )
