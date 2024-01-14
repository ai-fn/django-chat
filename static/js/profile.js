try{
    document.getElementById('imageInput').addEventListener('change', function(event) {
try {
  document.querySelector('.AvatarEditable input').addEventListener('change', function (event) {

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      document.querySelector('.AvatarEditable img').src = `${e.target.result}`;
    }

    reader.readAsDataURL(file);
    inputHandler();
  });
} catch { console.log("error") }
