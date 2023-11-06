const confEmailAlert = document.getElementById("Confirm email for log in")
const resendButton = document.getElementById('resendButton');
let el = document.getElementsByClassName('cont')[0]
let btn = document.getElementById('resendConfirmMessageBtn');
el.style.backgroundColor = 'transparent'
el.style.border = 'none'
if (confEmailAlert) {
    btn.style.display = "block";
} else { btn.style.display = "none"; }

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

resendButton.addEventListener('click', handleResendClick)

window.addEventListener('load', () => {
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
});