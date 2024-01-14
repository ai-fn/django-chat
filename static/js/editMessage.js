import { urlify } from "./utils.js";
import { send } from "./websocket.js";
import { undoManager } from "./undoManager.js";
import { ws } from "./websocket.js";
import { closeComposerEmbeded, selectMessage, showNotify } from "./contextmenu.js";
import { createAttachModal, createDeletionModal, displayImage } from "./attachModal.js";

export const sendMsgBtn = document.getElementById('inp-send-msg');
export const editableMessageText = document.getElementById('editable-message-text');
export const msgWrapper = editableMessageText;


editableMessageText.onpaste = onPaste;
editableMessageText.onkeydown = onKeyDown;
editableMessageText.oninput = onInput;
sendMsgBtn.onclick = sendHandler;

function sendHandler () {
    switch (sendMsgBtn.classList.item(1)){
        case "edit":
            if (selectMessage != null){
                if (selectMessage.body != editableMessageText.innerText.trim()){
                    if (editableMessageText.innerText.trim().length > 0 || selectMessage.attachments.length > 0 || selectMessage.voice_file != null) {
                        ws.send(JSON.stringify({
                        action: "edit-message",
                        messageId: selectMessage.id,
                        messageBody: editableMessageText.innerText.trim()
                        }))
                    }
                    else {
                        createDeletionModal();
                    }
                }
                setTimeout(
                    () => {
                        closeComposerEmbeded();
                    }, 50
                );
            } else {showNotify("Message not selected");}
            break;
        default:
            send();
            resetMsgArea(editableMessageText);
            break;
    }
};

export function onPaste (event) {
    event.preventDefault();
    let clipboardData = event.clipboardData || window.clipboardData;
    let pastedText = clipboardData.getData('text/plain');
    event.target.innerText += pastedText;
    
    resetMsgArea(event.target);
    updateWrapperSize(event.target);
    setCursorPos(event.target);
};

export function onInput (e) {
    if ((e.inputType.includes("delete")) && e.target.innerText.trim().length == 0){
        e.target.innerHTML = "";
        resetMsgArea(e.target);
        return;
    }

    const previousValue = urlify(e.target.innerText);

    const action = {
        execute: function() {
            e.target.innerHTML = previousValue;
            resetMsgArea(e.target);
        },
        undo: function() {
            e.target.innerHTML = previousValue;
            resetMsgArea(e.target);
        }
    };
    
    if (e.inputType !== "historyUndo"){
        undoManager.addUndoAction(action);
        action.execute();
    }
    
    resetMsgArea(e.target);
    updateWrapperSize(e.target);
};

function setCursorPos(element) {
    const range = document.createRange();
    const sel = window.getSelection();
    element.focus();
    range.selectNodeContents(element);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

export function resetMsgArea(e) {
    setCursorPos(e);
    if (document.getElementsByClassName("ComposerEmbeddedMessage").length == 0)
        e.innerHTML.length == 0 ? sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'recording') : sendMsgBtn.classList.replace(sendMsgBtn.classList.item(1), 'send');
    if (e.innerHTML.length == 0) {
        e.classList.remove('touched');
        e.parentElement.parentElement.style.height = "2.5rem";
        e.parentElement.parentElement.classList.remove('overflown');
        return;
    }
    e.classList.add('touched');
}

function updateWrapperSize(e) {
    let maxScrollHeight = e.id == "editable-message-text" ? 450 : 210;
    if (e.scrollHeight < maxScrollHeight)
        e.parentElement.parentElement.style.height = e.scrollHeight + 'px';
    else {
        e.parentElement.parentElement.classList.add('overflown');
        e.parentElement.parentElement.style.height = `${maxScrollHeight}px`;
    }
}

export function onKeyDown (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMsgBtn.click();
    }
    else if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'Я')) {
        e.preventDefault();
        undoManager.redo();
    }
    else if (e.ctrlKey && (e.key === 'z' || e.key === 'я')){
        e.preventDefault();
        undoManager.undo();
    }
    
};

sendMsgBtn.onmousedown = function (e) {
    if (sendMsgBtn.classList.contains('recording'))
        startAudioRecording(ws);
}

sendMsgBtn.onmouseup = function (e) {
    if (sendMsgBtn.classList.contains('recording')){
        stopAudioRecording();
    }
}