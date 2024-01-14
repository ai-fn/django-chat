import { inputIsTouched } from "./utils.js";

const editButton = document.querySelector(".ListItem-button .fa-pen").parentElement;
const editTransition = document.querySelector("#Settings .Transition_slide-inactive");
const settingsTransition = document.querySelector("#Settings .Transition_slide-active");
const backButton = document.querySelector(".edit-header>button");
const inputs = document.querySelectorAll(".input-group>input");
const updateInfoForm = document.querySelector("#Settings .settings-fab-wrapper .FloatingActionButton form");
const updateInfoButton = updateInfoForm.parentElement;
const avatarInput = document.querySelector(".AvatarEditable input");

inputs.forEach((el) => {
  el.addEventListener("focus", inputIsTouched);
  el.addEventListener("focusout", inputIsTouched);
  el.addEventListener("input", inputHandler);

  if (el.value.length > 0) {
    el.parentElement.classList.add("touched");
  }

});

editButton.addEventListener("click", showEditProfile);
backButton.addEventListener("click", showSettingsProfile);
updateInfoButton.addEventListener("click", updateHandler);

function updateHandler(e) {
  const data = new FormData();
  data.append("csrfmiddlewaretoken", updateInfoForm.querySelector("input").value);
  inputs.forEach((el) => data.append(el.id, el.value.trim()));
  if (avatarInput.files.length > 0)
    data.append("Avatar", avatarInput.files[0], avatarInput.files[0].name);

  fetch(updateUrl, {
    method: 'POST',
    body: data,
  })
  .then(data => { console.log(data); window.location.href = updateUrl; })
  .catch(error => {console.error(error); window.location.href = updateUrl; })
}

function inputHandler() {

  const isEdited = Array.from(inputs).some((el) =>
    el.id in userInfo && el.value != userInfo[el.id]
  );
  const avatarIsChanged = avatarInput.value && userInfo['Avatar'].split("/").pop() != avatarInput.value.split("\\").pop();

  if (isEdited || avatarIsChanged) {
    updateInfoButton.classList.add('revealed');
  } else {
    updateInfoButton.classList.remove('revealed');
  }
}

function showEditProfile() {
  settingsTransition.classList.replace("Transition_slide-active", "Transition_slide-inactive");
  editTransition.classList.replace("Transition_slide-inactive", "Transition_slide-active");
}

function showSettingsProfile() {
  settingsTransition.classList.replace("Transition_slide-inactive", "Transition_slide-active");
  editTransition.classList.replace("Transition_slide-active", "Transition_slide-inactive");
}

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
