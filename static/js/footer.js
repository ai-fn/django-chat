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
    let formData;
	let files;
	if (localStorage.getItem('formData') != null){
		formData = JSON.parse(localStorage.formData);
		files = JSON.parse(formData.files);
	} else {
		formData = new FormData();
		formData.append("files", files);
	}
    inp.type = "file";
	inp.accept = allowedExt;
    inp.style.display = "none";
    document.body.appendChild(inp);

    inp.addEventListener("change", (e) => {
			if (document.getElementsByClassName("Modal")[0] == undefined){
				createAttachModal();
			}
			const selectedFiles = e.target.files;
			if (!selectedFiles) return;
	
			for (var i = 0; i < selectedFiles.length; i++) {
				let file = selectedFiles[i];
				const reader = new FileReader();
				reader.onload = (e) => {
					let prevFiles;
					let newFile = JSON.stringify({
						name: file.name,
						base64String: String.fromCharCode.apply(null, new Uint8Array(reader.result))
					})
					displayImage(e.target.result);
					if (files != undefined){
						prevFiles = JSON.parse(files);
						prevFiles.files.push(newFile)
					} else {
						prevFiles = JSON.stringify({
							files: new Array(newFile),
						});
					}
					formData.files = JSON.stringify(prevFiles);
					localStorage.formData = JSON.stringify(formData)
				};
				reader.readAsDataURL(file);
				document.body.removeChild(inp);
			}
	});
	localStorage.caption = editableMessageText.innerText;
	inp.click();
}