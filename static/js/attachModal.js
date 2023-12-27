import { editableMessageText, onInput, onKeyDown, onPaste } from "./editMessage.js";

const modalHtml = `<div>
<div class="Modal VncEpkgqABgA8MUCarxh opacity-transition fast open shown" tabindex="-1" role="dialog">
    <div class="modal-container">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
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
                        <div role="menuitem" tabindex="0" class="MenuItem compact">
                            <i class="icon fa-solid fa-file"></i>Send as File
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-content custom-scroll">
            <div class="iWmxxlUXOjTzbvJzWF8g" data-attach-description="Add Items" data-dropzone="true">
                <div class="d_uMaJ26HlkCfSn5XiQp custom-scroll DUGHCuTKi7H5d_1_vYqj"></div>
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
            </div>
        </div>
    </div>
</div>
`

let imgHtml = `
    <div class="ZqafRENXro3B4A2UTp9s ZJNnn8HUzq8cC3WwTzY0">
        <div class="YOoQRXIFINVsu3FFIKR0">
            <i class="small-icon fa-solid fa-trash-can y5JLmIFtCzK05l40rdHJ"></i>
        </div>
    </div>`
export function createAttachModal(){
    let portals = document.getElementById("portals");
    portals.insertAdjacentHTML("afterbegin", modalHtml);
    let editableMessageTextModal = document.getElementById("editable-message-text-modal");
    editableMessageTextModal.onpaste = onPaste;
    editableMessageTextModal.oninput = onInput;
    editableMessageTextModal.onkeydown = onKeyDown;
	editableMessageTextModal.innerText = editableMessageText.innerText;
}
export function displayImage(file) {
    let contentContainer = document.getElementsByClassName("d_uMaJ26HlkCfSn5XiQp")[0];
    contentContainer.insertAdjacentHTML("afterbegin", imgHtml);
    let imageContainer = document.getElementsByClassName("ZqafRENXro3B4A2UTp9s")[0];
    let image = document.createElement("img");
    image.setAttribute('class', 'FfTpBGrctDEiFLXC4aqP');
    image.setAttribute("draggable", "false");
    image.src = file;
    imageContainer.appendChild(image);
}
