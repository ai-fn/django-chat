const submitBtn = document.getElementById("submit-btn")
const form = document.getElementById('inputCredForm')

form.addEventListener('submit', () => {
    if (form.checkValidity()) {
        submitBtn.disabled = true;
        submitBtn.style.cursor = 'not-allowed';
    }
})