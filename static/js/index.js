let open = false
const room_pk = "{{ room.id }}"
let room
let user
let isScrolling = false
let readMessages = []
let unreadMessages = []
let form = document.getElementById('form')
let messages = document.getElementById('messages')
let allMessages = document.querySelectorAll('.message-container')
const url = `ws://${window.location.hostname}:${window.location.port}/ws/chat/`;
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
    switch (data.action) {
        case "connect":
            user = data.user
            room = data.room
            if (room.type == 'direct' || room.name === 'Favorites' ){
                document.getElementById('add-member-btn').style.display = 'none'
            }
            for (let mess of data.chat_messages){
                if (!mess.users_read.includes(user.user_id))
                    {unreadMessages.push(mess);}
                else {readMessages.push(mess);}
            }
            for (let mess of readMessages) {
                getMesg(mess);
            }
            if (unreadMessages.length != 0){
                getChatNotify('Unread messages', extraClass='unread-messages')
                for (let mess of unreadMessages) {
                    getMesg(mess, readStatClass="unread-message");
                }
            }
            markMessagesAsRead()
            try{
                const el = document.getElementsByClassName('unread-messages')[0]
                el.scrollIntoView({behavior: 'smooth' })
            }
            catch{scrollToBottom()}
            break;
        case "notif":
            alert(data.message)
            console.log(data.message)
            break;
        case "receive":
            if (data.message.sender.user_id === user.user_id) {
                getMesg(data.message, sntClass="snt-message")
            } else { getMesg(data.message) }
            unreadMessages.push(data.message)
            markMessagesAsRead()
            scrollToBottom()
            break;
        case "chat-notify":
            getChatNotify(data.message, extraClass='add-members')
            break;
        default:
            console.log(data.message)
            break;
    }
}

function scrollToBottom(){
    try{
        allMessages = document.getElementsByClassName('message-container')
        allMessages[allMessages.length - 1].scrollIntoView({behavior:"smooth"})
    } catch{
        messages.scrollTo(0, messages.scrollHeight)
    }
}


function handleScroll(){
    isScrolling = true;
    if (unreadMessages.length !=0 && Math.floor(messages.scrollTop + messages.clientHeight) === messages.scrollHeight){
        markMessagesAsRead(unreadMessages)
    }
}

function markMessagesAsRead(){
    let mbMsgs = readMessages.filter(item => item.users_read.length != 0 &&  !item.users_read.includes(user))
    if (mbMsgs.length != 0){
        mbMsgs.forEach((item) => unreadMessages.push(item))
    }
    ws.send(data=JSON.stringify({
        'action': 'mark_msg_as_read',
        'chat_messages': unreadMessages,
    }))
    unreadMessages = []
}

function addMembers() {
    let members = []
    const checkBoxes = document.querySelectorAll('input[type="checkbox"]:checked')

    checkBoxes.forEach(el => {
        members.push(el.nextElementSibling.textContent)
    })

    checkBoxes.forEach(el => {el.checked = false })
    if (members.length !== 0){
        ws.send(JSON.stringify({
        "action": "add-member",
        "members": members,
            })
        )
    }
}

messages.addEventListener('scroll', () => {
    clearTimeout(isScrolling)

    isScrolling = setTimeout(() => {
        isScrolling = false
    }, 100);

    handleScroll();
})

function getChatNotify(msg, extraClass=""){
    messages.insertAdjacentHTML(
            'beforeend',
        `<div class="chat-notify">
            <span class="${extraClass}">${msg}</span>
        </div>`
    )
}

function getMesg(msg, readStatClass="") {
    let sntClass = ''
    let sntMsgBody = ''
    if (msg.sender.user_id === user.user_id) {
        sntClass = 'snt-message';
        sntMsgBody = 'snt-message-body'
    }
    messages.insertAdjacentHTML(
        'beforeend',
        `<div class="message-container ${readStatClass} ${sntClass}">
        <div class="message ${sntMsgBody}">
            <div id="message">
                <div class="snt-txt"><p class="text-message">${msg.body}</p></div>
                <div class="snt-time"><p id="snt-time">${msg.time}</p></div>
            </div>
        </div>
    </div>`
    )
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
        this.style.height = "2.5rem";
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
        textarea.style.height = "2.5rem"
        return
    }
    ws.send(JSON.stringify({
        pk: room_pk,
        action: "message",
        message: msg,
    }))
    textarea.value = ''
    textarea.style.height = "2.5rem"
    messages.scrollTo(0, messages.scrollHeight, behavior='smooth')
}