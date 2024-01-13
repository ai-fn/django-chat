const searchInput = document.querySelector(".SearchInput .form-control");

searchInput.addEventListener("focus", () => searchInput.parentElement.classList.add("has-focus"));
searchInput.addEventListener("focusout", () => searchInput.parentElement.classList.remove("has-focus"));
