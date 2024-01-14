import { setClassesToInputParentDiv, inputIsTouched } from "./utils.js";

const confEmailAlert = document.getElementById("Confirm email for log in")
const resendButton = document.querySelector('#resendButton');
const inputs = document.querySelectorAll("div input.form-control");
const btn = document.querySelector('#resendConfirmMessageBtn');


if (confEmailAlert && btn)
    btn.style.display = "block";
else
    btn? btn.style.display = "none" : null;

setClassesToInputParentDiv();
resendButton ? resendButton.addEventListener('click', handleResendClick) : null;
window.addEventListener('load', onLoad);
inputs.forEach(el => el.addEventListener("focus", inputIsTouched));
inputs.forEach(el => el.addEventListener("focusout", inputIsTouched));
inputs.forEach(el => el.addEventListener("paste", inputIsTouched));

function handleResendClick() {
    resendButton.disabled = true;

    $.post(
        "/resend-confirm-message/",
        $('form#resendConfirmMessageForm').serialize(),
        window.location.href = '/login/'
    );

    const currentTime = new Date().getTime();
    const disabledUntil = currentTime + 60000; 
    localStorage.setItem('resendButtonDisabledUntil', disabledUntil);

    const countdown = setInterval(() => {
      const remainingTime = disabledUntil - new Date().getTime();

      if (remainingTime > 0) {
        const seconds = Math.floor(remainingTime / 1000);
        resendButton.textContent = `Resend Code (${seconds} seconds remaining)`;
      } else {
        clearInterval(countdown);
        resendButton.disabled = false;
        resendButton.textContent = 'Resend Code';
        localStorage.removeItem('resendButtonDisabledUntil');
      }
    }, 1000);
}

function onLoad () {
    const resendButton = document.getElementById('resendButton');
    const disabledUntil = localStorage.getItem('resendButtonDisabledUntil');

    if (disabledUntil) {
      const currentTime = new Date().getTime();
      if (currentTime < disabledUntil) {
        resendButton.disabled = true;

        const remainingTime = disabledUntil - currentTime;
        const seconds = Math.floor(remainingTime / 1000);
        resendButton.textContent = `Resend Code (${seconds} seconds remaining)`;

        const countdown = setInterval(() => {
          const remainingTime = disabledUntil - new Date().getTime();

          if (remainingTime > 0) {
            const seconds = Math.floor(remainingTime / 1000);
            resendButton.textContent = `Resend Code (${seconds} seconds remaining)`;
          } else {
            clearInterval(countdown);
            resendButton.disabled = false;
            resendButton.textContent = 'Resend Code';
            localStorage.removeItem('resendButtonDisabledUntil');
          }
        }, 1000);
      } else {
        localStorage.removeItem('resendButtonDisabledUntil');
      }
    }
};
