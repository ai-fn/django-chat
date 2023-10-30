function register() {
            let form = document.getElementById("form")

            if (form.password.value != form.cnfrmPassword.value){
                alert('Passwords may be same!')
                return;
            }

            $.post( {
            url: '',
            data: {
                'First_Name': form.first-name.value,
                'Second_Name': form.second-name.value,
                'Patronymic': form.patronymic.value,
                'username': form.username.value,
                'password': form.password.value,
                'date_of_birth': form.date_of_birth.value,
                'email': form.email.value,
            },
            xhrFields: {
                withCredentials: true
            },
            success: () => {
                alert('Successfully registered!')
                window.location.href='http://127.0.0.1:8000/login/'
            }
            })
        }