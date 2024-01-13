import { inputIsTouched, setClassesToInputParentDiv } from "./utils.js";

const inputs = document.querySelectorAll("div input.form-control");

setClassesToInputParentDiv();
inputs.forEach(el => el.addEventListener("focus", inputIsTouched));
inputs.forEach(el => el.addEventListener("focusout", inputIsTouched));
inputs.forEach(el => el.addEventListener("paste", inputIsTouched));
