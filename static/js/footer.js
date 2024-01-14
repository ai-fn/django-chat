import { createAttachModal, displayImage, readAsDataURL } from "./attachModal.js";

let attachButton = document.getElementById('attach-menu-button');
let attachControls = document.getElementById('attach-menu-controls');
let menuContainer = attachControls.childNodes[1];


let mediaInput = document.getElementById('media-input');
let fileInput = document.getElementById('file-input');

attachButton.addEventListener("mouseenter", showAttachMenu);
menuContainer.addEventListener("mouseleave", closeAttachMenu);

mediaInput.addEventListener("click", (e) => {
    createFileInput("image/*, video/*", e, false);
});

fileInput.addEventListener('click', (e) => {
    createFileInput("*", e, true);
});

export function showAttachMenu (e) {
	let btn = e.target.closest("button");
	let container = btn.parentElement.querySelector(".Menu.compact .menu-container");
	let conrtolsContainer = container.parentElement;
	container.classList.replace('not-shown', 'shown');
    setTimeout(() => {
        btn.classList.add('activated');
        let backdrop = document.createElement('div');
        backdrop.classList.add('backdrop');
		backdrop.addEventListener("click", closeAttachMenu);
        conrtolsContainer.insertAdjacentElement("afterbegin", backdrop);
		container.classList.replace('not-open', 'open');
    }, 50);    
}

export function closeAttachMenu (e) {
	let btn = e.target.parentElement.previousElementSibling;
	let container = btn.parentElement.querySelector(".Menu.compact .menu-container");
	let conrtolsContainer = container.parentElement;
    
	container.classList.replace('open', 'not-open');
	setTimeout(() => {
		let backdrop = conrtolsContainer.querySelector('.backdrop')
		if (backdrop != null)
			backdrop.remove();
		container.classList.replace('shown', 'not-shown');
		btn.classList.remove('activated');
	}, 150)
};

export function createFileInput(allowedExt, e, asFile) {
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

