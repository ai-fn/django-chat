import { editableMessageText, sendMsgBtn, resetMsgArea } from "./editMessage.js";
import { messagesArray, user, ws } from "./websocket.js";

let closestContainer;
let backdrop = document.createElement("div");
export let selectMessage;
let selectMessages;

const contextMenuContainer = document.createElement('div');
const contextMenuItems = document.createElement("div");
const presentation = document.createElement('div');
const mainContainer = document.getElementsByClassName('main-container')[0];
const offsetHeight = 316;
const offsetWidth = 216;

contextMenuItems.setAttribute("class", 'MessageContextMenu_items scrollable-content custom-scroll');
contextMenuContainer.setAttribute("class", "Menu compact MessageContextMenu fluid");

presentation.setAttribute("class", `bubble menu-container left bottom opacity-transition fast not-open not-shown`);
presentation.insertAdjacentElement("beforeend", contextMenuItems);

contextMenuContainer.insertAdjacentElement("beforeend", presentation);

const actions = {
  "Reply": {
    action: function(){ console.log("reply!")},
    imgName: "fa-solid fa-reply",
  },
  "Edit": {
    action: edit,
    imgName: "fa-solid fa-pen-to-square",
  },
  "Copy Text": {
    action:	copy,
    imgName: "fa-solid fa-copy"
  },
  "Copy Image": {
    action: function(){ console.log("copy img!")},
    imgName: "fa-solid fa-image"
  },
  "Pin": {
    action: function(){ console.log("pin!")},
    imgName: "fa-solid fa-thumbtack",
  },
  "Download": {
    action: downloadFiles,
    imgName: "fa-solid fa-download",
  },
  "Forward": {
    action: function(){ console.log("forward!")},
    imgName: "fa-solid fa-share",
  },
  "Select": {
    action: function(){ console.log("select!")},
    imgName: "fa-solid fa-circle-check",
  },
  "Delete": {
    action: deletion,
    imgName: "fa-solid fa-trash-can",
  },
}

let actContainers = [];

function buildContext(){
  for (let name of Object.keys(actions)) {
    if (name == "Copy Text" && selectMessage.body == null)
      continue;
    if (name == "Edit" && selectMessage.sender.user_id != user.user_id)
      continue;
    if (name == "Copy Image" && !selectMessage.attachments.some(obj => obj.file.name.contains(".jpg")))
      continue;
    if (name == "Download" && !selectMessage.attachments.some(obj => obj.name) && selectMessage.voice_file == null && selectMessage.video_file == null)
      continue;

    let act = document.createElement("div");
    act.setAttribute("role", "menuitem");
    act.setAttribute("tabindex", "0");
    act.setAttribute("class", "MenuItem compact");
    act.insertAdjacentHTML("beforeend", `<i class='icon ${actions[name].imgName}'></i>${name}`);
    if (name.toLowerCase() == 'delete'){
      act.classList.add("destructive");
    }
    act.addEventListener("click", actions[name].action);
    actContainers.push(act);
  }
}

mainContainer.appendChild(contextMenuContainer);
messages.addEventListener("contextmenu", function (event) {
  event.preventDefault();

  let closest = event.target.closest(".message-container");
  let targetMsg = closest ? closest : event.target.querySelector(".message-container");
  // targetMsg = targetMsg ? targetMsg : event.target.parentElement.childNodes[1];
  let msgId = targetMsg.getAttribute("data-message-id");
  const msg = messagesArray.find((message) => message.id == msgId);
  selectMessage = msg;
	buildContext();
  presentation.classList.replace('not-shown', 'shown');

  backdrop = document.createElement("div");
  backdrop.onclick = function(e) {closeContextMenu(e)};
  backdrop.oncontextmenu = function(e) {closeContextMenu(e)};
  backdrop.classList.add('backdrop')
  
  contextMenuItems.innerHTML = "";
  contextMenuContainer.insertAdjacentElement("afterbegin", backdrop);

  for (let act of actContainers){
    contextMenuItems.insertAdjacentElement("beforeend", act);
  }

  contextMenuContainer.style.left = event.clientX + "px";
  contextMenuContainer.style.top = event.clientY + "px";
  contextMenuContainer.style.display = "block";
  
  const containerRect = mainContainer.getBoundingClientRect();
  const relativeY = event.clientY - containerRect.top;
  const relativeX = event.clientX - containerRect.left;

  let horizontal = offsetWidth + relativeX <= mainContainer.offsetWidth ? "left" : "right";
  let vertiacal = offsetHeight + relativeY >=  mainContainer.offsetHeight ? "bottom" : "top";

  presentation.classList.contains("left") ? presentation.classList.replace('left', horizontal) : presentation.classList.replace('right', horizontal);
  presentation.classList.contains("bottom") ? presentation.classList.replace('bottom', vertiacal) : presentation.classList.replace('top', vertiacal);
  if (presentation.classList.contains("top") && offsetHeight + relativeY > mainContainer.offsetHeight)
    contextMenuItems.style.maxHeight = `${mainContainer.offsetHeight - relativeY}px`;
  if (presentation.classList.contains('bottom') && offsetHeight + relativeY > mainContainer.offsetTop)
    contextMenuItems.style.maxHeight = `${relativeY}px`;

  closestContainer = event.target.closest(".message-container") || event.target.querySelector(".message-container");
  closestContainer.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
  
  presentation.classList.replace('not-open', 'open');
});

function closeContextMenu(e){
  e.preventDefault();
  actContainers = [];
  presentation.classList.replace('open', 'not-open');
  closestContainer.style.backgroundColor = 'transparent';
  contextMenuItems.style.removeProperty('max-height');
  contextMenuContainer.querySelector('.backdrop').remove();
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

function deletion(){
	if (ws.OPEN){
		ws.send(JSON.stringify({
			msg_id: selectMessage.id,
			action: 'msg-deletion'
		}))
	} else{
		showNotify("Connection...")
	}
	backdrop.click();
}

export function showNotify(notifyText){
  const notifyContainer = document.createElement("div");
  const notify = document.createElement("div");
  const content = document.createElement("div");
  notify.appendChild(content);
  notifyContainer.appendChild(notify);
  document.body.appendChild(notifyContainer);

  notify.setAttribute("class", "Notification opacity-transition fast not-open shown");
  content.setAttribute("class", "content");
  notifyContainer.setAttribute('class', "Notification-container");
  content.innerText = notifyText;
  
  notify.classList.replace('not-open', 'open');

  setTimeout(function() {
    notify.classList.replace("open", "not-open");
    notify.classList.replace("shown", "not-shown");
    notifyContainer.remove();
  }, 3000)
}

function downloadFiles(){
  if (selectMessage.voice_file != null)
    download(selectMessage.voice_file);
  else if (selectMessage.video_file != null)
    download(selectMessage.video_file);
  else if (selectMessage.attachments.length > 0)
    selectMessage.attachments.foreach(url => download(url));
  backdrop.click();
}

function download(url){
  let link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', '');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function edit(){
  backdrop.click();
  localStorage.draft = editableMessageText.innerHTML;
  createEmbededComposer(selectMessage.body);
  editableMessageText.innerText = selectMessage.body;
  resetMsgArea(editableMessageText);
  sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'edit');
}
export function closeComposerEmbeded(){
  let composer = document.getElementsByClassName("ComposerEmbeddedMessage")[0];
  composer.classList.remove('open');
  if (composer)
    composer.remove();
  if (editableMessageText.innerText.length > 0)
    sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'send');
  else
    sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'recording');
  let draft = localStorage.getItem("draft");
  if (draft != null)
    editableMessageText.innerHTML = draft;
  resetMsgArea(editableMessageText);
} 
function createEmbededComposer(text){
  let composerWrapper = document.getElementsByClassName("composer-wrapper")[0];
  let composerHtml = `<div class="ComposerEmbeddedMessage opacity-transition fast shown">
                    <div class="ComposerEmbeddedMessage_inner peer-color-3">
                        <div class="embedded-left-icon">
                            <i class="fa-solid fa-pen"></i>
                        </div>
                        <div class="EmbeddedMessage inside-input peer-color-3">
                            <div class="message-text">
                                <p class="embedded-text-wrapper"><span>${text != null ? text : ""}</span></p>
                                <div class="message-title">Edit Message</div>
                            </div>
                        </div>
                        <button type="button" class="Button embedded-cancel default translucent round faded" aria-label="Cancel" title="Cancel" style="">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                  </div>`;
  composerWrapper.insertAdjacentHTML("afterbegin", composerHtml);
  document.getElementsByClassName('embedded-cancel')[0].addEventListener("click", closeComposerEmbeded);
  setTimeout(() => document.getElementsByClassName('ComposerEmbeddedMessage')[0].classList.add('open'), 50);
}