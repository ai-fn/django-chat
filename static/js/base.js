const addMemberBtn = document.getElementById('add-member-btn')
    if (addMemberBtn != null && !location.href.split("/").includes("chat"))
        addMemberBtn.style.display = 'none';

window.addEventListener("keydown", (e) => {
    if (["Home", "End", "PageUp", "PageDown"].includes(e.key))
        e.preventDefault();
});