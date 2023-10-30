let open = false
        const room_pk = "{{ room.pk }}"
        let room
        let user
        let form = document.getElementById('form')
        let messages = document.getElementById('messages')
        const url = `ws://${window.location.host}/ws/chats/`;
        const ws = new WebSocket(url);

        ws.onopen = () => {
            open = true;
            console.log("connect");
            ws.send(JSON.stringify({
                pk: room_pk,
                roomName: "{{ room.name }}",
                action: 'connect',
            }))
        };
        ws.onmessage = function (e) {
            const data = JSON.parse(e.data)
            console.log(data)
            switch (data.action) {
                case "connect":
                    user = data.user
                    room = data.room
                    for (let mess of data.messages) {
                        getMesg(mess);
                    }
                    messages.scrollTo(0, messages.scrollHeight)
                    break;
                case "receive":
                    getMesg(data.message)
                    break;
                case "chat-notify":
                messages.insertAdjacentHTML(
                    'beforeend',
                `<div class="chat-notify">
                    <span>${data.message}</span>
                </div>`
            )
                    break;
                default:
                    console.log(data.message)
                    break;
            }
        }

        function addMembers() {
            let members = []
            const checkBoxes = document.querySelectorAll('input[type="checkbox"]:checked')

            checkBoxes.forEach(el => {
                members.push(el.nextElementSibling.textContent)
            })

            checkBoxes.forEach(el => {el.checked = false })
            console.log(members)

            ws.send(JSON.stringify({
                "action": "add-member",
                "members": members,
            })
            )

        }

        function getMesg(msg) {
            if (msg.sender.user_id === user.user_id) {
                messages.insertAdjacentHTML(
                    'beforeend',
                    `<div class="message-container snt-message">
                    <div class="message snt-message-body">
                        <div id="message">
                            <div class="snt-txt"><p class="text-message">${msg.body}</p></div>
                            <div class="snt-time"><p id="snt-time">${msg.created_at_formatted}</p></div>
                        </div>
                    </div>
                </div>`
                )
            }
            else {
                messages.insertAdjacentHTML(
                    'beforeend',
                    `<div class="message-container">
                    <div class="message">
                        <div id="message">
                            <div class="snt-txt"><p class="text-message">${msg.body}</p></div>
                            <div class="snt-time"><p id="snt-time">${msg.created_at_formatted}</p></div>
                        <div>
                    </div>
                </div>`
                )
            }
            messages.scrollTo(0, messages.scrollHeight)
        }

        form.addEventListener('submit', (e) => { sendMsg(e) })

        function logout() {
            $.post({
                url: 'http://127.0.0.1:8000/logout/',
                xhrFields: {
                    withCredentials: true
                },
                success: () => { window.location.href = "http://127.0.0.1:8000/login/" }
            })
        }

        $('#inp-send-msg').on('click', function (e) {
            sendMsg()
        })

        $('#inp-message').on('input', function (e) {
            if (this.value.length === 0){
                this.style.height = "45px";
                return;
            }
            this.style.height = '';
            this.style.height = this.scrollHeight + 'px'
        } )

        $('#inp-message').on('keyup', function (e) {
            if (e.keyCode === 13) {
                document.querySelector('#inp-send-msg').click()
            }
        })

        function sendMsg() {
            if (ws.readyState === ws.CONNECTING) {
                console.log('WebSocket still connecting')
                return
            }
            const textarea = document.getElementById('inp-message')
            const msg = textarea.value
            if (msg.length === 0) {
                textarea.style.height = "45px"
                return
            }
            ws.send(JSON.stringify({
                pk: room_pk,
                action: "message",
                message: msg,
            }))
            textarea.value = ''
            textarea.style.height = "45px"
        }