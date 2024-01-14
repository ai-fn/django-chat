import { createAttachModal, displayImage } from "./attachModal.js";
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
    attachButton.classList.remove('activated');
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
    let inp = document.createElement("input");
    inp.type = "file";
	inp.accept = allowedExt;
    inp.style.display = "none";
    document.body.appendChild(inp);
	e.target.parentElement.previousElementSibling.click();

    inp.addEventListener("change", async (e) => {
			if (document.getElementsByClassName("Modal")[0] == undefined){
				createAttachModal(allowedExt, asFile);
			}
			const selectedFiles = e.target.files;
			if (!selectedFiles) return;
	
			for (var i = 0; i < selectedFiles.length; i++) {
				let file = selectedFiles[i];
				let base64 = await readAsDataURL(file);
				displayImage(base64, asFile, file);
				document.body.removeChild(inp);
			}
	});
	inp.click();
}

