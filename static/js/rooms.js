const modal = document.getElementsByClassName('modal')
function createRoom () {
    const roomName = document.getElementById('room-name-inp').value
    const roomImage = document.getElementById('room-image-inp').value
    const roomImageFile = document.getElementById('room-image-inp').files[0]
    const acceptedExt = ['jpg', 'png', 'jpeg']
    const roomImgSplit = roomImage.split('.')
    const roomImgExt = roomImgSplit[roomImgSplit.length - 1]
    let formData = new FormData()
    const request = new XMLHttpRequest()

    if (roomName === ""){
        console.log(roomName === "")
        alert('Type room name!')
        return;
    }
    request.open("POST", "create-chat/", true)
    request.withCredentials = true
    formData.append('room-name', roomName)
    formData.append('csrfmiddlewaretoken', "{{ csrf_token }}")

    if (acceptedExt.some(ext => ext == roomImgExt)) {
        formData.append('room-image', roomImageFile)
    }

    request.send(formData)
    console.log(request.status)
    modal.style.display = "none"
    $.get('http://127.0.0.1:8000/chats/')
}