function login() {
            let form = document.getElementById('login-form')
            if (form.username.value === '' || form.password.value === '') {
                alert('Fill in all fields!')
                return;
            }
            let req = $.post({
                url: '',
                data: {
                    'username': form.username.value ,
                    'password': form.password.value,
                    'csrfmiddlewaretoken': "{{ csrf_token }}",
                },
                success: () => {
                    console.log('Success post request')
                    // alert('Successfully login!')
                    window.location.href="http://127.0.0.1:8000/chats/"
                }
            })
        }