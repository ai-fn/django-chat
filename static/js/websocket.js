import { drawAudio } from "./audioVisualize.js";
import { urlify } from "./utils.js";
import { closeComposerEmbeded, showNotify } from "./contextmenu.js";
import { editableMessageText, resetMsgArea, msgWrapper } from "./editMessage.js";

let room;
export let user;
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
            messagesArray.push(data.message);
            unreadMessages.push(data.message)
            markMessagesAsRead()
            scrollToBottom()
            break;
        case "edit-message":
            let msg = document.getElementById(`message${data.message.id}`);
            let innerContent = msg.getElementsByClassName("content-inner")[0];
            let textContent = innerContent.getElementsByClassName("text-content")[0];
            let messageMeta = msg.getElementsByClassName("MessageMeta")[0];
            if (textContent != undefined){
                textContent.innerHTML = data.message.body;
            }
            else{
                innerContent.insertAdjacentHTML("beforeend", `<div class="text-content">${data.message.body}</div>`);
            }
            if (textContent.getElementsByClassName("MessageMeta")[0] == undefined){
                textContent.appendChild(messageMeta);
            }
            let msgObj = messagesArray.find(msg => msg.id == data.message.id);
            let msgIndex = messagesArray.indexOf(msgObj);
            msgObj.body = data.message.body;
            let messageTime = messageMeta.getElementsByClassName("message-time")[0];
            messageTime.setAttribute('title', `Sent at ${data.message.sent_at}\n${data.message.edited ? "Edited at" + data.message.edited_at : ""}`)
            messageTime.innerHTML = `${data.message.edited ? "edited" : ""} ${data.message.time}`
            messagesArray[msgIndex] = msgObj;
            closeComposerEmbeded();
            break;
        case "msg-deletion":
            if (data.deleted){
                let msg = document.getElementById(`message${data.msg_id}`);
                let msgContainer = msg.closest(".message-container")
                msg.classList.replace("open", "not-open")
                if (msgContainer != null)
                    setTimeout(() => {
                        msg.classList.replace("shown", "not-shown")
                        msgContainer.remove()
                    }, 200);
            }
            showNotify(data.message);
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
    let sntClass = sent ? "own" : ""; 
    let sntMsgBody = sent ? "snt-message-body" : "";
    let readStatClass = unread ? "unread-message" : "";
    
    let metaHtml = `<span class="MessageMeta">
                        <span class="message-time" title="Sent at ${msg.sent_at}\n${msg.edited ? "Edited at " + msg.edited_at : ""}">${msg.edited ? "edited" : ""} ${msg.time}</span>
                    </span>`;

    msg.body = urlify(msg.body)
    let textBodyHtml = `<div class="text-content">${msg.body}${metaHtml}</div>`;

    let msgHtml = `
        <div class="Message allow-selection message-container ${readStatClass} ${sntClass}" id="message${msg.id}" data-message-id="${msg.id}">
            <div class="message-content-wrapper ${sntMsgBody} can-select-text">
                <div class="message-content has-shadow has-solid-background ${msg.msg_type} ${msg.body != null ? "text" : "no-text"}" ${msg.voice_file != null ? "voice" : ""} has-shadow has-solid-background"  dir="auto">
                    <div class="content-inner" dir="auto">`

    switch (msg.msg_type){
        case "text":
            msgHtml += textBodyHtml;
            break;
        case "voice":
            msgHtml += `<div class="Audio inline ${sntClass}">
                            <button class="Button smaller primary round" id='playBtn-${msg.id}' type="button">
                                <i id='playSvg-${msg.id}' class="icon small-icon opacity-transition shown fa-solid fa-play"></i>
                                <i id='pauseSvg-${msg.id}' class="icon small-icon fa-solid opacity-transition not-shown fa-pause"></i>
                            </button>
                            <div id='canvas-${msg.id}' style="width: 10rem;"></div>
                        </div>
                        ${msg.body != null ? textBodyHtml : ""}`;
            break;
    }

    msgHtml += `</div>
                ${msg.body == null ? metaHtml : ""}
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
    resetMsgArea(editableMessageText);
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