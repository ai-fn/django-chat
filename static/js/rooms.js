try{
    document.getElementById('imgInput').addEventListener('change', function(event) {
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
