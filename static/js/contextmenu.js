import { createDeletionModal } from "./attachModal.js";
import { editableMessageText, sendMsgBtn, resetMsgArea } from "./editMessage.js";
import { getPreviewMessage } from "./utils.js";
import { messagesArray, scrollToBottom, user, ws } from "./websocket.js";

let selectMessages = [];
let closestContainer;
let backdrop = document.createElement("div");
let composer = document.querySelector(".messages-footer .Composer");
let selectToolbar = document.querySelector(".messages-footer .MessageSelectToolbar");
export let selectMessage;

const selectedIcon = `<i class="icon fa-solid fa-check"></i>`;
const messageList = document.querySelector(".messages-container");
const mainContainer = document.querySelector('.MessageList');
const contextMenuContainer = document.createElement('div');
const contextMenuItems = document.createElement("div");
const presentation = document.createElement('div');
const offsetHeight = 316;
const offsetWidth = 216;

contextMenuItems.setAttribute("class", 'MessageContextMenu_items scrollable-content custom-scroll');
contextMenuContainer.setAttribute("class", "Menu compact MessageContextMenu fluid");

presentation.setAttribute("class", `bubble menu-container left bottom opacity-transition fast not-open not-shown`);
presentation.insertAdjacentElement("beforeend", contextMenuItems);

contextMenuContainer.insertAdjacentElement("beforeend", presentation);

mainContainer.appendChild(contextMenuContainer);

document.querySelector(".messages-footer .MessageSelectToolbar-inner>button").addEventListener("click", endMessagesSelection);
document.querySelector(".messages-footer .MessageSelectToolbar-actions .destructive").addEventListener("click", deleteSelectedMessages);

messageList.addEventListener("click", messageSelection);
messageList.addEventListener("contextmenu", initContext);

const actions = {
    "Reply": {
        action: function () { console.log("reply!") },
        imgName: "fa-solid fa-reply",
    },
    "Edit": {
        action: edit,
        imgName: "fa-solid fa-pen-to-square",
    },
    "Copy Text": {
        action: copy,
        imgName: "fa-solid fa-copy"
    },
    "Copy Image": {
        action: copyImageToClipboard,
        imgName: "fa-solid fa-image"
    },
    "Pin": {
        action: pinMessage,
        imgName: "fa-solid fa-thumbtack",
        rotate: 0,
    },
    "Unpin": {
        action: unpinMessage,
        imgName: "fa-solid fa-thumbtack",
        rotate: 45,
    },
    "Download": {
        action: downloadFiles,
        imgName: "fa-solid fa-download",
    },
    "Forward": {
        action: function () { console.log("forward!") },
        imgName: "fa-solid fa-share",
    },
    "Select": {
        action: startMessagesSelection,
        imgName: "fa-solid fa-circle-check",
    },
    "Delete": {
        action: () => { backdrop.click(); createDeletionModal(); },
        imgName: "fa-solid fa-trash-can",
    },
}

let actContainers = [];

function buildContext() {
    for (let name of Object.keys(actions)) {
        if (name == "Copy Text" && (selectMessage.body == null || selectMessage.body.length == 0))
            continue;
        if (name == "Edit" && selectMessage.sender.user_id != user.user_id)
            continue;
        if (name == "Pin" && selectMessage.pinned)
            continue;
        if (name == "Unpin" && !selectMessage.pinned)
            continue;
        if (name == "Copy Image" && !selectMessage.attachments.some(obj => obj.file_type == "image"))
            continue;
        if (name == "Download" && !selectMessage.attachments.length > 0 && selectMessage.voice_file == null && selectMessage.video_file == null)
            continue;

        let act = document.createElement("div");
        let rotate = actions[name].hasOwnProperty("rotate") ? `${actions[name].rotate}deg` : "";
        act.setAttribute("role", "menuitem");
        act.setAttribute("tabindex", "0");
        act.setAttribute("class", "MenuItem compact");
        act.insertAdjacentHTML("beforeend", `<i class='icon ${actions[name].imgName}' style="rotate: ${rotate};"></i>${name}`);
        if (name.toLowerCase() == 'delete') {
            act.classList.add("destructive");
        }
        act.addEventListener("click", actions[name].action);
        actContainers.push(act);
    }
}



function initContext(event) {
    event.preventDefault();

    let closest = event.target.closest(".message-container");
    let targetMsg = closest ? closest : event.target.querySelector(".message-container");
    let msgId = targetMsg.getAttribute("data-message-id");
    selectMessage = messagesArray.find((message) => message.id == msgId);

    buildContext();

    presentation.classList.replace('not-shown', 'shown');

    backdrop = document.createElement("div");
    backdrop.onclick = closeContextMenu;
    backdrop.oncontextmenu = closeContextMenu;
    backdrop.classList.add('backdrop')

    contextMenuItems.innerHTML = "";
    contextMenuContainer.insertAdjacentElement("afterbegin", backdrop);

    for (let act of actContainers) {
        contextMenuItems.insertAdjacentElement("beforeend", act);
    }

    contextMenuContainer.style.left = event.clientX + "px";
    contextMenuContainer.style.top = event.clientY + "px";
    contextMenuContainer.style.display = "block";

    const containerRect = mainContainer.getBoundingClientRect();
    const relativeY = event.clientY - containerRect.top;
    const relativeX = event.clientX - containerRect.left;

    let horizontal = offsetWidth + relativeX <= mainContainer.offsetWidth ? "left" : "right";
    let vertiacal = offsetHeight + relativeY >= mainContainer.offsetHeight ? "bottom" : "top";

    presentation.classList.contains("left") ? presentation.classList.replace('left', horizontal) : presentation.classList.replace('right', horizontal);
    presentation.classList.contains("bottom") ? presentation.classList.replace('bottom', vertiacal) : presentation.classList.replace('top', vertiacal);
    if (presentation.classList.contains("top") && offsetHeight + relativeY > mainContainer.offsetHeight)
        contextMenuItems.style.maxHeight = `${mainContainer.offsetHeight - relativeY}px`;
    if (presentation.classList.contains('bottom') && offsetHeight + relativeY > mainContainer.offsetTop)
        contextMenuItems.style.maxHeight = `${relativeY}px`;

    closestContainer = event.target.closest(".message-container") || event.target.querySelector(".message-container");
    closestContainer.style.backgroundColor = "rgba(0, 0, 0, 0.3)";

    presentation.classList.replace('not-open', 'open');
};

function closeContextMenu(e) {
    e.preventDefault();
    actContainers = [];
    presentation.classList.replace('open', 'not-open');
    closestContainer.style.backgroundColor = 'transparent';
    contextMenuItems.style.removeProperty('max-height');
    let backdrop = contextMenuContainer.querySelector('.backdrop')
    if (backdrop)
        backdrop.remove();
    setTimeout(() => {
        presentation.classList.replace('shown', 'not-shown');
        contextMenuContainer.style.display = "none";
    }, 200)
};

function copy() {
    navigator.clipboard.writeText(selectMessage.body);
    showNotify("Copied to Clipboard");
    backdrop.click();
}

export function deletion(id) {
    let msgId;
    if (id == undefined)
        msgId = selectMessage.id;
    else
        msgId = id;
    if (ws.OPEN) {
        ws.send(JSON.stringify({
            msg_id: msgId,
            action: 'msg-deletion'
        }))
        } else {
            showNotify("Connection...")
        }
    backdrop.click();
}

export function showNotify(notifyText, delay = 3000) {
    let notify = document.createElement("div");
    let content = document.createElement("div");
    let notifyContainer = document.createElement("div");
    let innerContent = document.createElement("span");

    notify.setAttribute("class", "Notification opacity-transition fast not-open shown");
    content.setAttribute("class", "content");
    notifyContainer.setAttribute('class', "Notification-container");
    innerContent.innerText = notifyText;

    content.appendChild(innerContent);
    notify.appendChild(content);
    notifyContainer.appendChild(notify);
    document.body.appendChild(notifyContainer);

    setTimeout(
        () => {
            notify.classList.replace('not-open', 'open');
        }, 150
    )
    hideNotify();

    function hideNotify() {
        setTimeout(function () {
            notify.classList.replace("open", "not-open");
            setTimeout(() => {
                notify.classList.replace("shown", "not-shown");
                notify.parentElement.remove()
            }, 150)
        }, delay)
    }
}

function pinMessage() {
    ws.send(JSON.stringify({
        action: 'pin-message',
        messageId: selectMessage.id
    }))
    backdrop.click();
}

function unpinMessage() {
    ws.send(JSON.stringify({
        action: 'unpin-message',
        messageId: selectMessage.id
    }))
    backdrop.click();
}

function downloadFiles() {
    if (selectMessage.voice_file != null)
        download(selectMessage.voice_file);
    else if (selectMessage.video_file != null)
        download(selectMessage.video_file);
    else if (selectMessage.attachments.length > 0) {
        for (let i = 0; i < selectMessage.attachments.length; i++) {
            let el = selectMessage.attachments[i];
            download(el.file);
        }
    }
    backdrop.click();
}

export function download(url) {
    let link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function edit() {
    backdrop.click();
    localStorage.draft = editableMessageText.innerHTML;
    let currentComposer = document.querySelector(".ComposerEmbeddedMessage")
    if (currentComposer)
        closeComposerEmbeded();
    createEmbededComposer();
    editableMessageText.innerText = selectMessage.body;
    resetMsgArea(editableMessageText);
    sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'edit');
}
export function closeComposerEmbeded() {
    let composer = document.querySelector(".ComposerEmbeddedMessage");
    composer.classList.remove('open');
    setTimeout(() => {
        if (composer)
            composer.remove();
    }, 150);
    if (editableMessageText.innerText.length > 0)
        sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'send');
    else
        sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'recording');
    let draft = localStorage.getItem("draft");
    if (draft != null)
        editableMessageText.innerHTML = draft;
    resetMsgArea(editableMessageText);
    mainContainer.classList.remove("embedded");
}

export function scrollToSelectedMessage(selectMessageId) {
    let currentMessage = document.querySelector(`#message${selectMessageId}`);

    let clientHeight = mainContainer.clientHeight;
    let targetOffsetTop = currentMessage.offsetTop;
    let targetHeight = currentMessage.offsetHeight;

    let scrollTo = targetOffsetTop + targetHeight - clientHeight;

    mainContainer.scrollTo({ top: scrollTo + (mainContainer.clientHeight / 2 - currentMessage.offsetHeight), behavior: "smooth" });
    highlightSelectedMessage(currentMessage);
}

function highlightSelectedMessage(message) {
    message.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    setTimeout(() => {
        message.style.backgroundColor = "";
    }, 1500);
}

function createEmbededComposer() {
    let composerWrapper = document.getElementsByClassName("composer-wrapper")[0];
    let composerHtml = `
    <div class="ComposerEmbeddedMessage opacity-transition fast shown">
      <div class="ComposerEmbeddedMessage_inner peer-color-3">
        <div class="embedded-left-icon">
            <i class="fa-solid fa-pen"></i>
        </div>
        <div class="EmbeddedMessage inside-input peer-color-3">
            
        </div>
        <button type="button" class="Button embedded-cancel default translucent round faded" aria-label="Cancel" title="Cancel" style="">
            <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  `;

    composerWrapper.insertAdjacentHTML("afterbegin", composerHtml);
    document.querySelector(".EmbeddedMessage").addEventListener("click", () => scrollToSelectedMessage(selectMessage.id));
    mainContainer.classList.add("embedded");

    let textContentHtml;
    let result = getPreviewMessage(selectMessage);
    let embeddedMessage = composerWrapper.querySelector(".EmbeddedMessage");

    if (result.isMedia) {
        textContentHtml = `<div class="embedded-thumb">${result.preview}</div><div class="message-text"><p class="embedded-text-wrapper"><span>${result.text}</span></p><div class="message-title">Edit Message</div></div>`;
        embeddedMessage.classList.add("with-thumb")
    } else {
        textContentHtml = `<div class="message-text"><p class="embedded-text-wrapper"><span>${result.fileTypeImg} ${result.text}</span></p><div class="message-title">Edit Message</div></div>`;
    }

    embeddedMessage.insertAdjacentHTML("beforeend", textContentHtml);
    document.getElementsByClassName('embedded-cancel')[0].addEventListener("click", closeComposerEmbeded);
    setTimeout(() => document.getElementsByClassName('ComposerEmbeddedMessage')[0].classList.add('open'), 50);
}

function copyImageToClipboard() {
    backdrop.click();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const image = new Image();
    image.src = selectMessage.attachments.find(el => el.file_type == "image").file;

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    canvas.toBlob((pngBlob) => {
        const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });

        navigator.clipboard.write([clipboardItem])
            .then(() => {
                showNotify('Image copied to clipboard successfully!');
            })
            .catch((error) => {
                showNotify('Failed to copy image to clipboard: ' + error);
            });
    }, 'image/png');
}

function startMessagesSelection() {
    backdrop.click();
    mainContainer.classList.add("select-mode-active");
    composer.classList.remove("shown");
    composer.classList.add("hover-disabled");
    selectToolbar.classList.add("shown");

    let lastMessage = mainContainer.querySelector(`#message${messagesArray[messagesArray.length - 1].id}`);
    lastMessage.classList.add("last-in-list");
    let message = mainContainer.querySelector(`#message${selectMessage.id}`);

    selectMessages.push(message);
    message.classList.add("is-selected");
    message.querySelector(".message-select-control").insertAdjacentHTML("beforeend", selectedIcon);
}

function endMessagesSelection() {
    selectMessages.forEach((el) => {
        el.querySelector(".message-select-control").innerHTML = "";
        el.classList.remove("is-selected");
    })
    mainContainer.classList.remove("select-mode-active");
    composer.classList.remove("hover-disabled");
    composer.classList.add("shown");
    selectToolbar.classList.remove("shown");
    selectMessages = [];
    updateSelectCountLabel(0);
}

const selectedCountLabel = document.querySelector(".messages-footer .MessageSelectToolbar span");
function messageSelection(event) {
    if (mainContainer.classList.contains("select-mode-active")) {
        let closestMessage = event.target.closest(".Message") || event.target.querySelector(".Message");
        if (closestMessage.classList.contains("is-selected")) {
            selectMessages.splice(selectMessages.indexOf(closestMessage), 1);
            closestMessage.classList.remove("is-selected");
            closestMessage.querySelector(".message-select-control").innerHTML = "";
            if (selectMessages.length == 0)
                endMessagesSelection();
        } else {
            selectMessages.push(closestMessage);
            closestMessage.classList.add("is-selected");
            closestMessage.querySelector(".message-select-control").insertAdjacentHTML("beforeend", selectedIcon);
        }
    }
    updateSelectCountLabel(selectMessages.length);    
}

function updateSelectCountLabel(count){
    let text = `${count > 0 ? count : 1} message${count > 1 ? "s" : ""} selected`;
    selectedCountLabel.textContent = text;
    selectedCountLabel.setAttribute("title", text);
}

function deleteSelectedMessages(){
    selectMessages.forEach((el) => {
        deletion(el.getAttribute("data-message-id"));
    });
    endMessagesSelection();
}
