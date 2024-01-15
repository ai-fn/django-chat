import { deletion } from "./contextmenu.js";
import { editableMessageText, onInput, onKeyDown, onPaste } from "./editMessage.js";
import { showAttachMenu, createFileInput } from "./footer.js";
import { ws } from "./websocket.js";

const modalHtml = `<div>
<div class="Modal VncEpkgqABgA8MUCarxh opacity-transition fast open shown" tabindex="-1" role="dialog">
    <div class="modal-container">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">`

let deletionModalDialogHtml = `
<div class="modal-header">
    <div class="modal-title">Delete message</div>
</div>
<div class="modal-content custom-scroll">
    <p>Are you sure you want to delete this message?</p>
    <div class="dialog-buttons">
        <button type="button" class="Button confirm-dialog-button default danger text" style="">Delete</button>
        <button type="button" class="Button confirm-dialog-button default primary text" style="">Cancel</button>
    </div>
</div>`;

let attachModalDialogHtml = `
<div class="modal-header-condensed">
    <button type="button" class="Button smaller translucent round" aria-label="Cancel attachments" title="Cancel attachments" style="">
        <i class="icon fa-solid fa-xmark"></i>
    </button>
    <div class="modal-title">Send Photo</div>
    <div class="DropdownMenu attachment-modal-more-menu with-menu-transitions">
        <button type="button" class="Button smaller translucent round has-ripple" aria-label="More actions" title="More actions" style="">
            <i class="icon fa-solid fa-ellipsis-vertical"></i>
            <div class="ripple-container"></div>
        </button>
        <div class="Menu compact attachment-modal-more-menu with-menu-transitions">
            <div role="presentation" class="bubble menu-container custom-scroll top right opacity-transition fast not-open not-shown" style="transform-origin: right top;"><div role="menuitem" tabindex="0" class="MenuItem compact">
                <i class="icon fa-solid fa-plus"></i>Add
            </div>

        </div>
    </div>
</div>
</div>
<div class="modal-content custom-scroll">
    <div class="iWmxxlUXOjTzbvJzWF8g" data-attach-description="Add Items" data-dropzone="true">
        <div class="d_uMaJ26HlkCfSn5XiQp custom-scroll"></div>
        <div class="BKyeut4mBbq_uw8uGfSU UrYInfws7roRktEiMxvT">
            <div class="c4dyk1Emgpla8BvDJMAz">
                <div id="caption-input-text" style="--margin-for-scrollbar: 72.46527862548828px;">
                    <div class="custom-scroll input-scroller" style="height: 56px; transition-duration: 201ms;">
                        <div class="input-scroller-content">
                            <div id="editable-message-text-modal" class="form-control allow-selection" contenteditable="true" role="textbox" dir="auto" tabindex="0" aria-label="Add a caption..." style="transition: color 50ms linear 0s !important;"></div>
                            <span class="placeholder-text" dir="auto">Add a caption...</span>
                        </div>
                    </div>
                </div>
                <div class="z4wF5bBjL74eNUj_UYeu">
                    <button type="button" class="Button eFD46lVH5GCILXEOx9BO default primary" style="">Send</button>
                </div>
            </div>
        </div>
    </div>
</div>`;

let endOfModalHtml = `</div></div></div>`
let sendAsBtn = (asFile) => `<div role="menuitem" tabindex="0" class="MenuItem compact"><i class="icon fa-solid fa-file"></i>Send as ${asFile? "Photo":"File"}</div>`;
let compressChecker = `<div class="own-form-check"><input class="own-form-check-input" type="checkbox" id="compressChecker"><label for="compressChecker">Compress</label></div>`;
let files = [];

export function createDeletionModal() {
    let modal;
    let currentModal = initModal("deletion");
    let portals = document.getElementById("portals");
    portals.insertAdjacentHTML("afterbegin", currentModal);
    modal = portals.querySelector(".Modal.open.shown");
    modal.classList.remove("VncEpkgqABgA8MUCarxh");
    modal.classList.add("delete");
    let backdrop = modal.querySelector(".modal-backdrop");
    let closeBtn = modal.querySelector(".Button.confirm-dialog-button.primary");
    let deleteBtn = modal.querySelector(".Button.confirm-dialog-button.danger");
    backdrop.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);
    deleteBtn.addEventListener("click", () => {deletion(); closeModal();});
}

export function createAttachModal(allowedExt, asFile){
    let editableMessageTextModal;
    let closeBtn;
    let dropdownBtn;
    let modal;
    let title;
    let sendBtn;
    let backdrop;
    let portals = document.getElementById("portals");
    let currentModal = initModal("attach");
    portals.insertAdjacentHTML("afterbegin", currentModal);
    modal = portals.querySelector(".Modal.open.shown");
    backdrop = modal.querySelector(".modal-backdrop");
    title = modal.querySelector('.modal-title');
    title.innerText = `Send ${asFile ? "File" : "Photo"}`;
    asFile ? null : document.querySelector(".BKyeut4mBbq_uw8uGfSU").insertAdjacentHTML("beforebegin", compressChecker);    
    modal.querySelectorAll(".DropdownMenu .Menu .MenuItem")[0].addEventListener("click", (e) => { createFileInput(allowedExt, e, asFile); });
    editableMessageTextModal = document.getElementById("editable-message-text-modal");
    closeBtn = document.querySelector(".modal-header-condensed>button");
    dropdownBtn = document.querySelector(".modal-header-condensed .DropdownMenu>button");
    sendBtn = modal.querySelector(".modal-content .BKyeut4mBbq_uw8uGfSU .z4wF5bBjL74eNUj_UYeu");
    editableMessageTextModal.onpaste = onPaste;
    editableMessageTextModal.oninput = onInput;
    editableMessageTextModal.onkeydown = onKeyDown;
	editableMessageTextModal.innerText = editableMessageText.innerText;
    closeBtn.addEventListener("click", closeModal);
    dropdownBtn.addEventListener("click", showAttachMenu);
    sendBtn.addEventListener("click", () => sendMedia(asFile));
    backdrop.addEventListener("click", closeModal);
}
function sendAs(asFile) {
    let tempFiles = files;
    let ext = asFile? "image/*" : "*";
    closeModal();
    createAttachModal(ext, asFile);
    setTimeout(() => {
        for (let file of tempFiles) {
            displayImage(file.base64, asFile, "", file.name, file.fileType);
        }
    }, 150)
}
export function initModal(type) {
    let resultModal = modalHtml;
    switch (type) {
        case "deletion":
            resultModal += deletionModalDialogHtml;
            break;
        case "attach":
            resultModal += attachModalDialogHtml;
            break;
    }
    resultModal += endOfModalHtml;
    return resultModal;
}
export function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
}
export function base64ToFile(base64Data, fileName, fileType) {
    base64Data = base64Data.split(",")[1];
    let byteCharacters = atob(base64Data);
    let byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    let byteArray = new Uint8Array(byteNumbers);
    let blob = new Blob([byteArray], { type: 'application/octet-stream' });
    let file = new File([blob], fileName, {type: fileType});

    return file;
}
export async function displayImage(base64="", asFile, file="", filename="", fileType="") {
    if (file && base64.length == 0) {
        base64 = await readAsDataURL(file);
    } else if (file.length == 0 && base64.length > 0) {
        file = base64ToFile(base64, filename, fileType);
    }

    let innerHtml;
    filename = file.name;
    let fileSize = file.size;
    let fileContainers = document.querySelectorAll(".ZqafRENXro3B4A2UTp9s");
    let extraClass = asFile ? "Aj1qc6z4t_pSWrsXi0qf ZJNnn8HUzq8cC3WwTzY0" : "ZJNnn8HUzq8cC3WwTzY0";

    let removeFileContainer = `<i class="small-icon fa-solid fa-trash-can y5JLmIFtCzK05l40rdHJ ${asFile ? "Qqp72_dWGSui9ORCN3MT" : "" }"></i>`
    let ext = filename.split('.').pop();
    let newFile = {
        id: Date.now(),
        name: file.name,
        ext: ext,
        base64: base64,
        fileType: file.type.split('/')[0],
        fileSize: fileSize
    }
    files.push(newFile);
    if (files.every((el) => el.base64.includes("image"))){
        let menu = document.querySelector(".Modal.open.shown .DropdownMenu .Menu .menu-container")
        if (menu.querySelectorAll(".MenuItem").length == 1){
            menu.insertAdjacentHTML("beforeend", sendAsBtn(asFile));
            menu.querySelectorAll(".MenuItem")[1].addEventListener("click", () => { sendAs(!asFile); });
        }
    } else {
        let menuItems = document.querySelectorAll(".Modal.open.shown .DropdownMenu .Menu .MenuItem");
        if (menuItems.length > 1)
            menuItems[1].remove();
    }
    
    if (asFile){
        let defaultImgFile = (ext) => `<div class="file-icon default"><span class="file-ext" dir="auto">${ext}</span></div>`;
        innerHtml = `<div class="ZqafRENXro3B4A2UTp9s ${extraClass}">
        <div class="File QAlzNLWBYdWR4UMMaiGm smaller">
                        <div class="file-icon-container">
                            ${["png", 'jpg', 'jpeg'].includes(ext)  ? `<div class="file-preview media-inner"><img src="${base64}" class="full-media" width="48" height="48" draggable="false" alt=""></div>` : defaultImgFile(ext)}
                        </div>
                        <div class="file-info">
                            <div class="file-title" dir="auto" title="${filename}">${filename}</div>
                            <div class="file-subtitle" dir="auto"><span>${formatSizeUnits(fileSize)}</span></div>
                        </div>
                    </div>${removeFileContainer}</div>`;
    } else {
        if (fileContainers.length > 0){
            fileContainers.forEach(el => el.classList.remove("ZJNnn8HUzq8cC3WwTzY0"))
            extraClass = "";
        }
        innerHtml = `
            <div class="ZqafRENXro3B4A2UTp9s ${extraClass}">
                <img src="${base64}" class="FfTpBGrctDEiFLXC4aqP" draggable="false" data-file-name="${file.name}">
                <div class="YOoQRXIFINVsu3FFIKR0">${removeFileContainer}</div>
            </div>
        `
    }
    let contentContainer = document.getElementsByClassName("d_uMaJ26HlkCfSn5XiQp")[0];

    updateTitle(asFile, files.length);
    contentContainer.insertAdjacentHTML("beforeend", innerHtml);

    let removeIcons = contentContainer.querySelectorAll(".y5JLmIFtCzK05l40rdHJ");
    removeIcons[removeIcons.length - 1].addEventListener("click", (e) => removeImage(e, asFile));
}

function removeImage(e, asFile){
    let images = document.querySelectorAll(".ZqafRENXro3B4A2UTp9s");
    let fileContainer = e.target.closest(".ZqafRENXro3B4A2UTp9s");
    let fileName = asFile ? fileContainer.querySelector(".file-title").innerText : fileContainer.querySelector("img").getAttribute("data-file-name");
    let index = files.findIndex(el => el.name == fileName)
    files = files.splice(index, 1);
    if (images.length == 1){
        closeModal();
        return;
    }
    fileContainer.remove();
    updateTitle(asFile, files.length);
}
function closeModal() {
    files = [];
    let modalContainer = document.getElementById("portals").querySelector(".Modal.open.shown");
    modalContainer.classList.replace("open", "not-open");
    setTimeout(() => {
        modalContainer.classList.replace("shown", "not-shown");
        modalContainer.parentElement.remove();
    }, 150)
}
function sendMedia (asFiles) {
    let description = document.querySelector("#editable-message-text-modal").innerText.trim();
    let checker = document.querySelector(".own-form-check-input");
    let message = JSON.stringify({
        action: 'attach-message',
        attachments: files,
        description: description,
        asFiles: asFiles,
        asCompressed: checker != null && checker.checked
    });
    ws.send(message);
    closeModal();
}
export function formatSizeUnits(bytes) {
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(1) + " GB";
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(1) + " MB";
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    } else if (bytes > 1) {
      return bytes + " bytes";
    } else if (bytes == 1) {
      return bytes + " byte";
    } else {
      return "0 bytes";
    }
}
function updateTitle(asFile, length) {
    let modal = document.querySelector("#portals .Modal.open.shown")
    let title = modal.querySelector(".modal-title");
    
    let type = asFile ? "File" : "Photo";
    let pluralName = type + `${length > 1 ? "s" : ""}`;
    title.innerText = `Send ${length > 1 ? length + " " : ""}${pluralName}`;
}
