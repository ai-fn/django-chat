try{
    document.getElementById('imageInput').addEventListener('change', function(event) {

    const file = event.target.files[0];
    const reader = new FileReader();
  
    reader.onload = function(e) {
      document.getElementById('avatarImage').style.backgroundImage = `url(${e.target.result})`;
    }
  
    reader.readAsDataURL(file);
  });
} catch {console.log("error")}
