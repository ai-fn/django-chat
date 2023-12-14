import { urlify } from "./utils.js";
import { send } from "./websocket.js";
import { undoManager } from "./undoManager.js";
import { ws } from "./websocket.js";

const sendMsgBtn = document.getElementById('inp-send-msg');
const voiceRec = document.getElementById('voice-rec');
const msgSend = document.getElementById('msg-send');
export const editableMessageText = document.getElementById('editable-message-text');
export const msgWrapper = editableMessageText.parentElement.parentElement;

sendMsgBtn.onclick = function () { send(); resetMsgArea(); };

editableMessageText.onpaste = function (event) {
    event.preventDefault();
    let clipboardData = event.clipboardData || window.clipboardData;
    let pastedText = clipboardData.getData('text/plain');
    editableMessageText.innerText += pastedText;
    
    updateWrapperSize();
    setCursorPos(editableMessageText);
};

editableMessageText.oninput = function (e) {
    if ((e.inputType.includes("delete")) && editableMessageText.innerText.trim().length == 0){
        editableMessageText.innerHTML = "";
        resetMsgArea();
        return;
    }

    const previousValue = urlify(editableMessageText.innerText);

    const action = {
        execute: function() {
            editableMessageText.innerHTML = previousValue;
            resetMsgArea();
        },
        undo: function() {
            editableMessageText.innerHTML = previousValue;
            resetMsgArea();
        }
    };
    
    if (e.inputType !== "historyUndo"){
        undoManager.addUndoAction(action);
        action.execute();
    }
    
    resetMsgArea();
    updateWrapperSize();
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

export function resetMsgArea() {
    setCursorPos(editableMessageText);
    if (editableMessageText.innerHTML.length == 0) {
        editableMessageText.classList.remove('touched');
        msgWrapper.style.height = "2.5rem";
        sendMsgBtn.classList.add('recording');
        voiceRec.classList.add('shown');
        msgSend.classList.remove('shown');
        msgWrapper.classList.remove('overflown');
        return;
    }
    editableMessageText.classList.add('touched');
    sendMsgBtn.classList.remove('recording');
    voiceRec.classList.remove('shown');
    msgSend.classList.add('shown');
}

function updateWrapperSize() {
    if (editableMessageText.scrollHeight < 450)
        msgWrapper.style.height = editableMessageText.scrollHeight + 'px';
    else{
        msgWrapper.classList.add('overflown');
        msgWrapper.style.height = "450px";
    }
}

editableMessageText.onkeydown = function (e) {
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