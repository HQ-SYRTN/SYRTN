import { apiRequest, auth, getCurrentProfile } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

document.getElementById("logout-btn").onclick = async () => {
    await signOut(auth);
    location.href = "index.html";
};

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "login.html";
        return;
    }
    try {
        currentUser = user;
        const profile = await getCurrentProfile(user);
        document.getElementById("login-link").style.display = "none";
        document.getElementById("logout-btn").style.display = "inline";
        document.getElementById("user-name").style.display = "inline";
        document.getElementById("user-name").textContent = profile.name || "User";
        document.getElementById("request-name").value = profile.name || "";
        if (profile.school) document.getElementById("request-school").value = profile.school;
    } catch (error) {
        console.error(error);
        location.replace("block.html");
    }
});

document.getElementById("request-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentUser) return;
    const submitButton = document.getElementById("submit-button");
    submitButton.disabled = true;
    try {
        await apiRequest("/api/syrtn/authority-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: document.getElementById("request-name").value.trim(),
                school: document.getElementById("request-school").value,
                requestedRole: document.getElementById("request-role").value,
                reason: document.getElementById("request-reason").value.trim()
            })
        }, currentUser);
        alert("권한 요청이 제출되었습니다.");
        location.href = "mypage.html";
    } catch (error) {
        alert(error.message);
    } finally {
        submitButton.disabled = false;
    }
});
