try{
    document.getElementById('imgInput').addEventListener('change', function(event) {

    const file = event.target.files[0];
    const reader = new FileReader();
  
    reader.onload = function(e) {
      document.getElementById('roomImgPrev').style.backgroundImage = `url(${e.target.result})`;
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
