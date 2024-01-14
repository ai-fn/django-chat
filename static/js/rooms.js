import { setClassesToInputParentDiv, inputIsTouched } from "./utils.js";

const img = document.createElement("img");
const roomImgInput = document.getElementById('imgInput');
const roomNameInp = document.querySelector("#id_room_name");
const roomImgPrevContainer = document.querySelector(".modal-body .Avatar .inner")
const inputs = document.querySelectorAll("div input.form-control");

const ulFolders = document.querySelector(".TabList");
const folders = ulFolders.querySelectorAll(".Tab");
const newChatButton = document.querySelector(".NewChatButton");
const roomsTransition = document.querySelector("#MiddleColumn");

setClassesToInputParentDiv();

img.classList.add("Avatar__media");
document.querySelector(".Transition").classList.add("flex-col");

roomsTransition.onmouseenter = () => {
  newChatButton.classList.add("revealed");
}
roomsTransition.onmouseleave = () => {
  newChatButton.classList.remove("revealed");
}

inputs.forEach(el => el.addEventListener("focus", inputIsTouched));
inputs.forEach(el => el.addEventListener("focusout", inputIsTouched));
inputs.forEach(el => el.addEventListener("paste", inputIsTouched));

roomNameInp.addEventListener("input", () => {
  if (!img.src){
    roomImgPrevContainer.innerHTML = roomNameInp.value ? roomNameInp.value[0].toUpperCase() : "-";
  }
})

for (let el of folders){
  el.addEventListener("click", scrollInto);
}

try {
  roomImgInput.addEventListener('change', function(event) {

    const file = event.target.files[0];
    const reader = new FileReader();

    roomImgPrevContainer.parentElement.classList.remove("no-photo", "peer-color-3");
  
    reader.onload = function(e) {
      img.src = e.target.result;
      roomImgPrevContainer.innerHTML = "";
      roomImgPrevContainer.insertAdjacentElement("afterbegin", img);
    }

    reader.readAsDataURL(file);
  });
} catch(error) {
  console.log(error);
}

function scrollInto(e){
  let currentFolder = e.target.closest(".Tab");
  let offset = currentFolder.offsetLeft - (ulFolders.offsetWidth - currentFolder.offsetWidth) / 2;
  ulFolders.scrollTo({left: offset, behavior: 'smooth' });
}
