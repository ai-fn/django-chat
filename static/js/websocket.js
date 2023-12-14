import { drawAudio } from "./audioVisualize.js";
import { urlify } from "./utils.js";
import { editableMessageText, resetMsgArea, msgWrapper } from "./editMessage.js";

let room;
let user;
let readMessages = [];
let unreadMessages = [];
let isScrolling = false
let messages = document.getElementById('messages');
let allMessages = document.querySelectorAll('.message-container');

const url = `ws://${window.location.host}/ws/chat/`;
export const ws = new WebSocket(url);
const maxMsgLength = 1600;
const addMembersBtn = document.getElementById("addMembersBtn");
export const messagesArray = [];

ws.onopen = () => {
    console.log("connect");
    ws.send(JSON.stringify({
        pk: localStorage.pk,
        roomName: localStorage.roomName,
        action: 'connect',
    }))
};
ws.onmessage = function (e) {
    const data = JSON.parse(e.data)
    switch (data.action) {
        case "connect":
            user = data.user
            room = data.room
            if (room.type == 'direct' || room.name === 'Favorites' )
                document.getElementById('add-member-btn').style.display = 'none'
            for (let mess of data.chat_messages){
                mess.users_read.includes(user.user_id) ? readMessages.push(mess) : unreadMessages.push(mess);
                messagesArray.push(mess);
            }
            for (let mess of readMessages){
                getMesg(mess, false, user.user_id == mess.sender.user_id);
            }
            if (unreadMessages.length != 0){
                getChatNotify('Unread messages', extraClass='unread-messages')
                for (let mess of unreadMessages)
                    getMesg(mess, unread=true);
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
            getMesg(data.message, false, user.user_id == data.message.sender.user_id)
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

addMembersBtn.addEventListener("click", addMembers);

messages.addEventListener('scroll', () => {
    clearTimeout(isScrolling)

    isScrolling = setTimeout(() => {
        isScrolling = false
    }, 100);

    handleScroll();
})

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
    ws.send(
        JSON.stringify({
            'action': 'mark_msg_as_read',
            'chat_messages': unreadMessages,
        })
    )
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

function getChatNotify(msg, extraClass=""){
    messages.insertAdjacentHTML(
            'beforeend',
        `<div class="chat-notify">
            <span class="${extraClass}">${msg}</span>
        </div>`
    )
}
function getMesg(msg, unread=false, sent=false) {
    let sntClass = sent ? "snt-message" : "";
    let sntMsgBody = sent ? "snt-message-body" : "";
    let readStatClass = unread ? "unread-message" : "";
    msg.body = urlify(msg.body)

    let msgHtml = `
        <div class="message-container ${readStatClass} ${sntClass}">
            <div class="message ${sntMsgBody}">
                <div class="message-body ${msg.msg_type} ${msg.body != null ? "text" : "no-text"}" id="message${msg.id}" data-message-id="${msg.id}">
                    <div class="snt-txt d-flex" style="align-items: center;">`

    switch (msg.msg_type){
        case "text":
            msgHtml += `<p class="text-message">${msg.body}</p></div>`
            break;
        case "voice":
            msgHtml += `<button class="d-flex" id='playBtn-${msg.id}' style="border-radius: 50%; width: 40px; height: 40px; align-items: center; justify-content: center;">
                            <svg id='playSvg-${msg.id}' style='width: 40px;' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="30" height="35" viewBox="0 0 1000 1000" xml:space="preserve"><rect x="0" y="0" width="100%" height="100%" fill="rgba(255,255,255,0)"/><g transform="matrix(0.9091 0 0 0.9091 500.0045 500.0045)" id="196351"><g style="" vector-effect="non-scaling-stroke"><g transform="matrix(1 0 0 1 -450 -450)"></g><g transform="matrix(9.0909 0 0 9.0909 -4.5426 -0.0005)" id="Layer_4_copy"><path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-49.5004, -50)" d="M 31.356 25.677 l 38.625 22.3 c 1.557 0.899 1.557 3.147 0 4.046 l -38.625 22.3 c -1.557 0.899 -3.504 -0.225 -3.504 -2.023 V 27.7 C 27.852 25.902 29.798 24.778 31.356 25.677 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 -2.6061 0.247)" id="Layer_4_copy"><path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-49.7134, -50.0272)" d="M 69.981 47.977 l -38.625 -22.3 c -0.233 -0.134 -0.474 -0.21 -0.716 -0.259 l 37.341 21.559 c 1.557 0.899 1.557 3.147 0 4.046 l -38.625 22.3 c -0.349 0.201 -0.716 0.288 -1.078 0.301 c 0.656 0.938 1.961 1.343 3.078 0.699 l 38.625 -22.3 C 71.538 51.124 71.538 48.876 69.981 47.977 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 -4.5426 -0.0005)" id="Layer_4_copy"><path style="stroke: rgb(255,255,255); stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 10; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-49.5004, -50)" d="M 31.356 25.677 l 38.625 22.3 c 1.557 0.899 1.557 3.147 0 4.046 l -38.625 22.3 c -1.557 0.899 -3.504 -0.225 -3.504 -2.023 V 27.7 C 27.852 25.902 29.798 24.778 31.356 25.677 z" stroke-linecap="round"/></g></g></g></svg>
                            <svg id='pauseSvg-${msg.id}' style='width: 40px; display: none;' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="30" height="35" viewBox="0 0 1000 1000" xml:space="preserve"><rect x="0" y="0" width="100%" height="100%" fill="rgba(255,255,255,0)"/><g transform="matrix(0.9091 0 0 0.9091 500.0045 500.0045)" id="474746"><g style="" vector-effect="non-scaling-stroke"><g transform="matrix(1 0 0 1 -450 -450)"></g><g transform="matrix(9.0909 0 0 9.0909 -133.1959 0.1677)" id="Layer_7_copy"><path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-35.3485, -50.0185)" d="M 39.806 72.858 h -8.915 c -2.176 0 -3.94 -1.764 -3.94 -3.94 V 31.119 c 0 -2.176 1.764 -3.94 3.94 -3.94 h 8.915 c 2.176 0 3.94 1.764 3.94 3.94 v 37.799 C 43.746 71.094 41.982 72.858 39.806 72.858 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 124.1039 -0.1687)" id="Layer_7_copy"><path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-63.6515, -49.9815)" d="M 68.109 72.821 h -8.915 c -2.176 0 -3.94 -1.764 -3.94 -3.94 V 31.082 c 0 -2.176 1.764 -3.94 3.94 -3.94 h 8.915 c 2.176 0 3.94 1.764 3.94 3.94 v 37.799 C 72.049 71.057 70.285 72.821 68.109 72.821 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 -127.4822 0.4813)" id="Layer_7_copy"><path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-35.977, -50.053)" d="M 40.489 27.248 c 0.769 0.719 1.257 1.735 1.257 2.871 v 37.799 c 0 2.176 -1.764 3.94 -3.94 3.94 h -8.915 c -0.234 0 -0.46 -0.03 -0.683 -0.069 c 0.704 0.658 1.643 1.069 2.683 1.069 h 8.915 c 2.176 0 3.94 -1.764 3.94 -3.94 V 31.119 C 43.746 29.177 42.338 27.573 40.489 27.248 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 129.8175 0.145)" id="Layer_7_copy"><path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-64.28, -50.016)" d="M 68.792 27.211 c 0.769 0.719 1.257 1.735 1.257 2.871 v 37.799 c 0 2.176 -1.764 3.94 -3.94 3.94 h -8.915 c -0.234 0 -0.46 -0.03 -0.683 -0.069 c 0.704 0.658 1.643 1.069 2.683 1.069 h 8.915 c 2.176 0 3.94 -1.764 3.94 -3.94 V 31.082 C 72.049 29.14 70.641 27.535 68.792 27.211 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 -133.1959 0.1677)" id="Layer_7_copy"><path style="stroke: rgb(255,255,255); stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 10; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-35.3485, -50.0185)" d="M 39.806 72.858 h -8.915 c -2.176 0 -3.94 -1.764 -3.94 -3.94 V 31.119 c 0 -2.176 1.764 -3.94 3.94 -3.94 h 8.915 c 2.176 0 3.94 1.764 3.94 3.94 v 37.799 C 43.746 71.094 41.982 72.858 39.806 72.858 z" stroke-linecap="round"/></g><g transform="matrix(9.0909 0 0 9.0909 124.1039 -0.1687)" id="Layer_7_copy"><path style="stroke: rgb(255,255,255); stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 10; is-custom-font: none; font-file-url: none; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" vector-effect="non-scaling-stroke" transform=" translate(-63.6515, -49.9815)" d="M 68.109 72.821 h -8.915 c -2.176 0 -3.94 -1.764 -3.94 -3.94 V 31.082 c 0 -2.176 1.764 -3.94 3.94 -3.94 h 8.915 c 2.176 0 3.94 1.764 3.94 3.94 v 37.799 C 72.049 71.057 70.285 72.821 68.109 72.821 z" stroke-linecap="round"/></g></g></g></svg>
                        </button>
                        <div id='canvas-${msg.id}' style="width: 10rem;"></div>`;
            break;
    }

    msgHtml += `</div>
                <div class="snt-time d-flex"><p title="${msg.sent_at}">${msg.time}</p></div>
                </div>
            </div>
        </div>`

    messages.insertAdjacentHTML("beforeend", msgHtml);
    if (msg.voice_file != null) {
        drawAudio(msg.voice_file, msg.id);
    }
}

export function send() {
    if (ws.readyState === ws.CONNECTING) {
        console.log('WebSocket still connecting');
        return
    }

    const msg = editableMessageText.innerText.trim();

    if (msg.length == 0)
        return
    
    msg.length > maxMsgLength ? splitSend(msg) : sendMsg(msg);
    editableMessageText.innerText = '';
    resetMsgArea();
    msgWrapper.style.height = "2.5rem";
    messages.scrollTo(0, messages.scrollHeight, 'smooth');
}

function splitSend(text) {

    if (text.length > maxMsgLength){
        while (text.length > maxMsgLength){
            let msg = text.length >= maxMsgLength ? text.substring(0, maxMsgLength) : text;
            text = text.substring(maxMsgLength, text.length);
            sendMsg(msg);
        }
    }
    sendMsg(text);
}

function sendMsg(msg) {
    if (msg.length === 0) {
        wrapper.style.height = "2.5rem";
        return
    }
    ws.send(JSON.stringify({
        pk: room_pk,
        action: "message",
        message: msg,
    }))
    
}