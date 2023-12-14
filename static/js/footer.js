import { editableMessageText } from "./editMessage.js"; 

let attachButton = document.getElementById('attach-menu-button');
let attachControls = document.getElementById('attach-menu-controls');
let menuContainer = attachControls.childNodes[1];
let mediaInput = document.getElementById('media-input');
let fileInput = document.getElementById('file-input');

attachButton.addEventListener("mouseenter", () => {
    setTimeout(() => {
        attachButton.classList.add('activated');
        let backdrop = document.createElement('div');
        backdrop.classList.add('backdrop');
        attachControls.insertAdjacentElement("afterbegin", backdrop);
        menuContainer.classList.replace('not-open', 'open');
        menuContainer.classList.replace('not-shown', 'shown');    
    }, 200);    
});

menuContainer.addEventListener("mouseleave", () => {
    menuContainer.classList.remove('activated');
    attachControls.getElementsByClassName('backdrop')[0].remove();
    menuContainer.classList.replace('open', 'not-open');
    menuContainer.classList.replace('shown', 'not-shown');
});

mediaInput.addEventListener("click", () => {
    createFileInput({allowedExt: ".jpg, .png, .jpeg"});
});

fileInput.addEventListener('click', () => {
    createFileInput({allowedExt: "*"});
});

function createFileInput({allowedExt}) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = allowedExt;
    inp.style.display = "none";
    document.body.appendChild(inp);

    inp.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileName = file.name;
          const base64String = String.fromCharCode.apply(null, new Uint8Array(reader.result))
          localStorage.attachFileName = fileName
          localStorage.attachFile = base64String;
        };
        reader.readAsArrayBuffer(file);
    
        document.body.removeChild(inp);
      });
    localStorage.caption = editableMessageText.innerText;
    inp.click();
}
