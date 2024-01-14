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

autoReconnect(() => {
	ws = new WebSocket(url)
	return ws;
});

function autoReconnect(ws_create) {
	let rc = ws_create();
	function startReconnecting() {
		interval = setInterval(() => {
			showNotify("Connecting...", 2000)
			rc = ws_create();
			rc.onopen = () => {
				wsOnopen();
				rc.onmessage = wsOnmessage;
				rc.onclose = startReconnecting;
				clearInterval(interval);
				showNotify("Connection established")
			}
		}, 3000);
	}
	rc.onopen = () => {
		wsOnopen();
		rc.onmessage = wsOnmessage;
		rc.onclose = startReconnecting;
		clearInterval(interval);
	}
}

function wsOnopen() {
	console.log("connect");
	ws.send(JSON.stringify({
		pk: localStorage.pk,
		roomName: localStorage.roomName,
		action: 'connect',
	}))
};

function wsOnmessage(e) {
	const data = JSON.parse(e.data)
	switch (data.action) {
		case "connect":
			user = data.user
			room = data.room
			readMessages = [];
			unreadMessages = [];
			messagesArray = [];
			messages.innerHTML = "";
			for (let mess of data.chat_messages) {
				if (mess.users_read.includes(user.user_id)) {
					getMesg(mess, false, user.user_id == mess.sender.user_id, mess.as_file);
					readMessages.push(mess);
				} else {
					unreadMessages.push(mess);
				}
				messagesArray.push(mess);
			}
			if (unreadMessages.length != 0) {
				getChatNotify('Unread messages', 'unread-messages')
				for (let mess of unreadMessages)
					getMesg(mess, true, user.user_id == mess.sender.user_id, mess.as_file);
			}
			markMessagesAsRead()
			let el = document.getElementsByClassName('unread-messages')[0]
			if (el != null) {
				el.scrollIntoView({ behavior: 'smooth' })
			} else {
				scrollToBottom()
			}
			pinnedMessages = data.pinned_messages;
			if (pinnedMessages.length != 0)
				setPinnedMessage(pinnedMessages[pinnedMessages.length - 1]);
			break;
		case "notif":
			showNotify(data.message)
			break;
		case "receive":
			if (messageList.classList.contains("select-mode-active")){
				let lastMessage = mainContainer.querySelector(`#message${messagesArray[messagesArray.length - 1].id}`);
    			lastMessage.classList.remove("last-in-list");
			}
			getMesg(data.message, false, user.user_id == data.message.sender.user_id, data.message.as_file);
			messagesArray.push(data.message);
			if (messageList.classList.contains("select-mode-active")){
				let lastMessage = mainContainer.querySelector(`#message${messagesArray[messagesArray.length - 1].id}`);
    			lastMessage.classList.add("last-in-list");
			}
			unreadMessages.push(data.message);
			markMessagesAsRead();
			scrollToBottom();
			break;
		case "edit-message":
			let msg = document.getElementById(`message${data.message.id}`);
			let innerContent = msg.getElementsByClassName("content-inner")[0];
			let textContent = innerContent.getElementsByClassName("text-content")[0];
			let messageMeta = msg.getElementsByClassName("MessageMeta")[0];

			if (data.message.body.trim().length > 0) {
				if (textContent != undefined) {
					textContent.innerHTML = data.message.body.trim();
				} else {
					innerContent.insertAdjacentHTML("beforeend", `<div class="text-content">${data.message.body.trim()}</div>`);
					textContent = innerContent.getElementsByClassName("text-content")[0];
				}
				if (textContent.getElementsByClassName("MessageMeta")[0] == undefined) {
					textContent.appendChild(messageMeta);
				}
				innerContent.parentElement.classList.replace("no-text", "text");
			} else {
				innerContent.parentElement.insertAdjacentElement("beforeend", messageMeta);
				innerContent.parentElement.classList.replace("text", "no-text");
				textContent.remove();
			}

			if (!data.message.as_file && data.message.body.length == 0 && data.message.attachments.length > 0) {
				innerContent.parentElement.classList.remove("has-solid-background");
			} else {
				innerContent.parentElement.classList.add("has-solid-background");
			}

			let isPinned = pinnedMessages.find(el => el.id == data.message.id);
			if (isPinned){
				pinnedMessages[pinnedMessages.indexOf(isPinned)] = data.message;
				setActivePinMessage(data.message);
			}

			let msgObj = messagesArray.find(msg => msg.id == data.message.id);
			let msgIndex = messagesArray.indexOf(msgObj);
			msgObj.body = data.message.body;
			let messageTime = messageMeta.getElementsByClassName("message-time")[0];
			messageTime.setAttribute('title', `Sent at ${data.message.sent_at}\n${data.message.edited ? "Edited at " + data.message.edited_at : ""}`)
			messageTime.innerHTML = `${data.message.edited ? "edited" : ""} ${data.message.time}`
			messagesArray[msgIndex] = msgObj;
			break;
		case "msg-deletion":
			if (data.deleted) {
				let msg = document.getElementById(`message${data.msg_id}`);
				let msgContainer = msg.closest(".message-container")
				msg.classList.replace("open", "not-open")
				if (msgContainer != null)
					setTimeout(() => {
						msg.classList.replace("shown", "not-shown")
						msgContainer.remove()
					}, 200);
				let deletedMessage = messagesArray.find(el => el.id == data.msg_id);
				let index = messagesArray.indexOf(deletedMessage);
				if (index != -1)
					messagesArray.splice(index, 1);
			}
			showNotify(data.message);
			break;
		case "mark_as_read":
			let unread = document.querySelectorAll('.Message.unread-message');
			if (unread.length > 0) {
				setTimeout(() => {
					document.querySelector('.chat-notify .unread-messages').remove();
					unread.forEach(el => { el.classList.remove("unread-message") });
				}, 2000)
			}
			break;
		case "chat-notify":
			getChatNotify(data.message, 'add-members');
			break;
		case "pin-message":
			pinnedMessages.push(data.message);
			pinnedMessages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
			setPinnedMessage(data.message);
			let pinMsg = messagesArray.find(el => el.id == data.message.id);
			if (pinMsg != undefined)
				pinMsg.pinned = true;
			break;
		case "unpin-message":
			let unpinnedMessage = pinnedMessages.find(el => el.id == data.message.id);
			pinnedMessages.splice(pinnedMessages.indexOf(unpinnedMessage), 1);
			let glUnpin = messagesArray.find(el => el.id == data.message.id);
			if (glUnpin != undefined)
				glUnpin.pinned = false;
			unpinAction();
			showNotify(`User ${data.user.username} unpin message "${data.message.body}"`);
			break;
		default:
			console.log(data.action, data.message)
			break;
	}
}


function setPinnedMessage(selectMessage) {
	let wrapper = document.querySelector(".HeaderPinnedMessageWrapper");

	let pinnedMessagesHtml = `
			<button type="button" class="Button smaller translucent round" aria-label="Unpin message" title="Unpin message" style="">
				<i class="icon fa-solid fa-xmark"></i>
			</button>
			<div class="uhn_g6FmUELuGJrCm45w">
				<div class="II9Qj_b_XQlgwGAOoy7u">
					<div class="sNpxwL0ihB0aXnfphNmp" style="clip-path: url(&quot;#clipPath&quot;); width: 2px; height: 74px; transform: translateY(0px);">
							<div class="YX_iyQuDtga6uKXRQqR0" style="--height: 7.5px; --translate-y: 9.5px; --translate-track: 0px; height: 7.5px; transform: translateY(9.5px);">
						
							</div>
							<span><svg height="0" width="0"><defs><clipPath id="clipPath"><path></path></clipPath></defs></svg></span>
						</div>
					</div>
					<div class="Transition EK6juGhJwhsLLm4Aag2F">
						<div class="Transition_slide Transition_slide-active" data-message-id="${selectMessage.id}">
							<div class="RFnmHP92f6CwfuR2Upaw"></div>
						</div>
						<div class="Transition_slide Transition_slide-inactive">
							<div class="RFnmHP92f6CwfuR2Upaw"></div>
						</div>
					</div>
					<div class="bSvmca5kaTIUh3yJBxnF">
					<div class="q9_FnsHlndM1hZqZjxjM" dir="auto">
						<span class="Tx2CpCmpZZrHnCMUksg2">Pinned Message</span>
					</div>
					<div class="Transition ugsKEK4Xb166oFMP8hHy">
						<div class="Transition_slide Transition_slide-active" data-message-id="${selectMessage.id}">
							<p dir="auto" class="WRuyhyQK6mv28Mz8iK28"></p>
						</div>
						<div class="Transition_slide Transition_slide-inactive">
							<p dir="auto" class="WRuyhyQK6mv28Mz8iK28"></p>
						</div>
					</div>
				</div>
				<div class="ripple-container"></div>
			</div>`;

	if (!wrapper) {
		let headerActions = document.querySelector(".header-tools");
		wrapper = document.createElement("div");
		wrapper.setAttribute("class", "HeaderPinnedMessageWrapper TMOjo7XfD1ZiiuRtfpkm opacity-transition fast open shown");
		document.querySelector(".MiddleHeader").insertBefore(wrapper, headerActions);
		wrapper.insertAdjacentHTML("beforeend", pinnedMessagesHtml);
		wrapper.querySelector("button").addEventListener("click", () => unpinMessage(wrapper.querySelector(".Transition_slide-active").getAttribute("data-message-id")));
		document.querySelector(".HeaderPinnedMessageWrapper .ripple-container").addEventListener("click", rippleHandler);
	}
	setActivePinMessage(selectMessage);
}

function unpinAction(){
	let length = pinnedMessages.length;
	if (length >= 1) {
		setActivePinMessage(pinnedMessages[length - 1]);
		return;
	} else {
		let wrapper = document.querySelector(".HeaderPinnedMessageWrapper");
		wrapper.classList.replace("open", "not-open");
		setTimeout(() => {
			wrapper.classList.replace("shown", "not-shown");
			wrapper.remove();
		}, 150);
	}
}

function unpinMessage(messageId) {
	ws.send(JSON.stringify({
		action: "unpin-message",
		messageId: messageId
	}))
}

function setActivePinMessage(selectMessage) {
	let textContentHtml;
	let result = getPreviewMessage(selectMessage);
	let wrapper = document.querySelector(".HeaderPinnedMessageWrapper");
	let inactive = wrapper.querySelectorAll(".Transition_slide-inactive");

	textContentHtml = `<span>${result.fileTypeImg} ${result.text}</span>`;

	for (let item of inactive) {
		let child = item.children[0].children[0];
		if (child)
			child.remove();
	}

	let active = wrapper.querySelectorAll(".Transition_slide-active");
	active.forEach(el => el.classList.replace("Transition_slide-active", "Transition_slide-inactive"));


	inactive[1].children[0].insertAdjacentHTML('beforeend', textContentHtml);
	inactive[0].children[0].insertAdjacentHTML('beforeend', result.preview);

	if (result.preview.length > 0)
		wrapper.querySelector("img.pictogram").classList.replace("pictogram", "JfPOYkOcaMjS7Y5rsHZ4");

	inactive.forEach(el => {
		el.classList.replace("Transition_slide-inactive", "Transition_slide-active");
		el.setAttribute("data-message-id", selectMessage.id);
	});

	let infoContainer = document.querySelector(".bSvmca5kaTIUh3yJBxnF");
	result.isMedia ? infoContainer.classList.add("FBCNFm307_rxATSHPSiN") : infoContainer.classList.remove("FBCNFm307_rxATSHPSiN");

	updateClipPath(pinnedMessages.length);
	setClipStyle(pinnedMessages.length, pinnedMessages.findIndex(el => el.id == selectMessage.id));
	let index = pinnedMessages.findIndex(el => el.id == selectMessage.id);
	document.querySelector(".Tx2CpCmpZZrHnCMUksg2").textContent = index > 0 ? `Pinned Message #${index}` : `PinnedMessage`;
}

function rippleHandler() {
	let selectMessageId = document.querySelector(".HeaderPinnedMessageWrapper .Transition_slide-active").getAttribute("data-message-id");
	scrollToSelectedMessage(selectMessageId);
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
function getMesg(msg, unread = false, sent = false, asFile = false) {
	if (msg.body != null && msg.body.length > 0)
		msg.body = urlify(msg.body)
	let sntClass = sent ? "own" : "";
	let sntMsgBody = sent ? "snt-message-body" : "";
	let readStatClass = unread ? "unread-message" : "";
	let bodyHtml = `<div class="text-content">${msg.body}</div>`;
	let metaHtml = `<span class="MessageMeta">
					<span class="message-time" title="Sent at ${msg.sent_at}\n${msg.edited ? "Edited at " + msg.edited_at : ""}">${msg.edited ? "edited" : ""} ${msg.time}</span>
				</span>`;

	let msgHtml = `
	<div class="Message allow-selection message-container ${readStatClass} ${sntClass}" id="message${msg.id}" data-message-id="${msg.id}">
		<div class="message-select-control"></div>
		<div class="message-content-wrapper ${sntMsgBody} can-select-text">
			<div class="message-content has-shadow has-solid-background ${msg.attachments.length > 0 && !asFile ? "media" : msg.msg_type} ${msg.body != null && msg.body.length > 0 ? "text" : "no-text"} ${msg.voice_file != null ? "voice" : ""}" dir="auto">
				<div class="content-inner" dir="auto">`
	asFile = msg.as_file
	let isVideo = false;
	if (msg.attachments.length > 0) {
		if (!asFile) {
			if (msg.attachments.length == 1) {
				for (let i = 0; i < msg.attachments.length; i++) {
					let el = msg.attachments[i];
					isVideo = el.file_type == "video";
					let itemHtml = `<div id="album-media-message${msg.id}" class="media-inner interactive" style="height: 340px;">
									${isVideo ? `<video class="full-media" loop playsinline controls><source src="${el.file}"></video>` : `<a href="${el.file}" data-lightbox="room-${room.id}"><img src="${el.file}" alt class="full-media"></a>`}
								</div>`;
					msgHtml += itemHtml;
					msg.body != null && msg.body.length > 0 ? msgHtml += bodyHtml : null;
				}
			}
			else if (msg.attachments.length > 1) {
				let album;
				let left = 0;
				let top = 0;
				let albumHeight = 551;
				let rows = 0;
				let padding = 1;
				if (msg.attachments.length % 2 == 0) {
					if (msg.attachments.length == 2) {
						album = `<div class="Album" style="width: 480px; height: ${albumHeight}px">`;
						for (let i = 0; i < msg.attachments.length; i++) {
							let el = msg.attachments[i];
							isVideo = el.file_type == "video";
							let albumItemHtml = createAlbumItem(el, msg, (albumHeight / 2) * i, left, 470 - padding, albumHeight / 2 - padding, isVideo);
							album += albumItemHtml;
						}
					} else {
						rows = Math.floor(msg.attachments.length / 2);
						albumHeight = rows * 121;
						album = `<div class="Album" style="width: 480px; height: ${albumHeight}px">`;
						for (let i = 0; i < msg.attachments.length; i++) {
							let el = msg.attachments[i];
							isVideo = el.file_type == "video";
							let row = Math.floor(i / 2);
							left = i % 2 == 0 ? 240 + padding : 0;
							top = row * 121;
							let albumItemHtml = createAlbumItem(el, msg, top, left, 240 - padding, 121 - padding, isVideo);
							album += albumItemHtml;
						};
					}
				}
				else {
					rows = (msg.attachments.length - 1) / 2;
					albumHeight = 240 + rows * 121;
					album = `<div class="Album" style="width: 480px; height: ${albumHeight}px">`;
					album += createAlbumItem(msg.attachments[0], msg, top, left, 480, 240 - padding);
					for (let i = 1; i < msg.attachments.length; i++) {
						let el = msg.attachments[i];
						isVideo = el.file_type == "video";
						let row = Math.ceil(i / 2) + 1;
						top = row != 1 ? 121 * row : 240;
						left = i % 2 == 0 ? 240 + padding : 0;
						let albumItemHtml = createAlbumItem(el, msg, top, left, 240 - padding, 121 - padding, isVideo);
						album += albumItemHtml;
					};
				}
				album += `</div>${msg.body != null && msg.body.length > 0 ? bodyHtml : ""}`;
				msgHtml += album;
			}
		} else {
			let defaultImgFile = (ext) => `<div class="file-icon default"><span class="file-ext" dir="auto">${ext}</span></div>`;
			let innerHtml = (file, ext) => `
				<div class="File interactive">
					<div class="file-icon-container">
						${["png", 'jpg', 'jpeg'].includes(ext) ? `<div class="file-preview media-inner"><a href="${file.file}" data-lightbox="room-${room.id}"><img src="${file.file}" class="full-media" width="48" height="48" draggable="false" alt=""></a></div>` : defaultImgFile(ext)}
						${asFile ?
					`<a href="${file.file}" download><i class="action-icon icon fa-solid fa-download"></i></a>`
					:
					`<a href="${file.file}" data-lightbox="room-${room.id}"><i class="action-icon icon fa-solid fa-eye"></i></a>`
				}
					</div>
					<div class="file-info">
						<div class="file-title" dir="auto" title="${file.name}">${file.name}</div>
						<div class="file-subtitle" dir="auto"><span>${formatSizeUnits(file.file_size)}</span></div>
					</div>
				</div>`;
			for (let i = 0; i < msg.attachments.length; i++) {
				let file = msg.attachments[i];
				let splitFileName = file.name.split('.')
				let ext = splitFileName.pop()
				msgHtml += innerHtml(file, ext)
			}
			msgHtml += msg.body != null && msg.body.length > 0 ? bodyHtml : "";
		}
	} else {
		switch (msg.msg_type) {
			case "text":
				msgHtml += bodyHtml;
				break;
			case "voice":
				msgHtml += `<div class="Audio inline ${sntClass}">
							<button class="Button smaller primary round" id='playBtn-${msg.id}' type="button">
								<i id='playSvg-${msg.id}' class="icon small-icon opacity-transition shown fa-solid fa-play"></i>
								<i id='pauseSvg-${msg.id}' class="icon small-icon fa-solid opacity-transition not-shown fa-pause"></i>
							</button>
							<div id='canvas-${msg.id}' style="width: 10rem;"></div>
						</div>
						${msg.body != null && msg.body.length > 0 ? bodyHtml : ""}`;
				break;
			case "video":
				break;
		}
	}

	msgHtml += `</div>
			</div>
		</div>
	</div>`

	messages.insertAdjacentHTML("beforeend", msgHtml);
	let message = messages.querySelector(`#message${msg.id} .message-content`);
	let contentInner = message.querySelector('.content-inner');
	let textContent = contentInner.querySelector('.text-content');

	asFile ? message.classList.add("document") : null;
	textContent != null ? textContent.insertAdjacentHTML("beforeend", metaHtml) : contentInner.insertAdjacentHTML("beforeend", metaHtml);

	if (!asFile && (msg.body == null || msg.body.length == 0) && msg.attachments.length > 0) {
		message.classList.remove("has-solid-background");
	}
	if (msg.voice_file != null) {
		drawAudio(msg.voice_file, msg.id);
	}
}

function createAlbumItem(el, msg, top, left, width, height, isVideo = false) {
	return `<div class="album-item-select-wrapper" style="left: ${left}px; top: ${top}px">
			<div id="album-media-message${msg.id}" class="media-inner interactive" style="width: ${width}px; height: ${height}px;">
				${isVideo ? `<video class="full-media" loop playsinline controls><source src="${el.file}"></video>` : `<a href="${el.file}" data-lightbox="room-${room.id}"><img src="${el.file}" alt class="full-media"></a>`}
			</div>
		</div>`;
}

function send() {
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