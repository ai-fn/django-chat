const addMemberBtn = document.getElementById('add-member-btn')
    if (!location.href.split("/").includes("chat"))
        addMemberBtn.style.display = 'none';