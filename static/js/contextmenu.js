import { messagesArray } from "./websocket.js";

let closestContainer;
let backdrop = document.createElement("div");

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
  "Reply": function(){ console.log("reply!")},
  "Edit": function(){ console.log("edit!")},
  "Copy Text": function(){ console.log("copy!")},
  "Copy Image": function(){ console.log("copy img!")},
  "Pin": function(){ console.log("pin!")},
  "Download": function(){ console.log("download!")},
  "Forward": function(){ console.log("forward!")},
  "Select": function(){ console.log("select!")},
  "Delete": function(){ console.log("delete!")},
}

const actContainers = [];

for (let action of Object.keys(actions)) {
  let act = document.createElement("div");
  act.setAttribute("role", "menuitem");
  act.setAttribute("tabindex", "0");
  act.setAttribute("class", "MenuItem compact");
  act.insertAdjacentHTML("beforeend", `<i class='icon icon-${action.split(" ").join("-")}'></i>${action}`);
  if (action.toLowerCase() == 'delete'){
    act.classList.add("destructive");
  }
  act.addEventListener("click", actions[action]);
  actContainers.push(act);
}

mainContainer.appendChild(contextMenuContainer);
messages.addEventListener("contextmenu", function (event) {
  event.preventDefault();

  presentation.classList.replace('not-shown', 'shown');
  let closest = event.target.closest(".message-body");
  let targetMsg = closest ? closest : event.target.querySelector(".message-body");
  targetMsg = targetMsg ? targetMsg : event.target.parentElement.childNodes[1];
  let msgId = targetMsg.getAttribute("data-message-id");
  const msg = messagesArray.find((message) => message.id == msgId);

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
  presentation.classList.replace('open', 'not-open');
  closestContainer.style.backgroundColor = 'transparent';
  contextMenuItems.style.removeProperty('max-height');
  contextMenuContainer.querySelector('.backdrop').remove();
  setTimeout(() => {
    presentation.classList.replace('shown', 'not-shown');
    contextMenuContainer.style.display = "none";
  }, 200)
};
