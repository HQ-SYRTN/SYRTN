import { API_BASE_URL, auth, authHeaders, getCurrentProfile, updateCurrentProfile } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let currentProfile = null;
const roleMap = {
    admin: "관리자", teacher: "교사", "s-leader": "순천고 리더", "h-leader": "해룡고 리더",
    "b-leader": "복성고 리더", "s-student": "순천고 부원", "h-student": "해룡고 부원",
    "b-student": "복성고 부원", member: "일반 회원"
};

async function logout() {
    await signOut(auth);
    location.href = "index.html";
}

document.getElementById("card-logout-btn").onclick = document.getElementById("logout-btn").onclick = logout;

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.href = "login.html";
        return;
    }
    try {
        currentUser = user;
        currentProfile = await getCurrentProfile(user);
        document.getElementById("login-link").style.display = "none";
        document.getElementById("logout-btn").style.display = "inline";
        document.getElementById("user-name").style.display = "inline";
        document.getElementById("user-name").textContent = currentProfile.name || "User";
        document.getElementById("display-email").value = currentProfile.email || user.email || "";
        document.getElementById("display-school").value = currentProfile.school || "학교 정보 없음";
        document.getElementById("edit-name").value = currentProfile.name || "";
        document.getElementById("display-role").value = roleMap[currentProfile.role] || currentProfile.role;
    } catch (error) {
        console.error(error);
        location.replace("block.html");
    }
});

document.getElementById("update-profile-btn").onclick = async () => {
    const name = document.getElementById("edit-name").value.trim();
    if (!name) return alert("이름을 입력해 주세요.");
    try {
        await updateCurrentProfile({ name, school: currentProfile?.school || "" }, currentUser);
        alert("프로필이 수정되었습니다.");
        location.reload();
    } catch (error) {
        alert(error.message);
    }
};

document.getElementById("delete-account-btn").onclick = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    if (document.getElementById("delete-confirm-input").value.trim() !== "회원탈퇴") {
        return alert("확인 문구를 정확히 입력해 주세요.");
    }
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    const button = document.getElementById("delete-account-btn");
    button.disabled = true;
    button.textContent = "처리 중...";
    try {
        const response = await fetch(`${API_BASE_URL}/api/syrtn/account`, {
            method: "DELETE",
            headers: await authHeaders(currentUser)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "회원탈퇴에 실패했습니다.");
        await signOut(auth).catch(() => {});
        alert("회원탈퇴가 완료되었습니다.");
        location.replace("index.html");
    } catch (error) {
        alert(error.message || "회원탈퇴에 실패했습니다.");
        button.disabled = false;
        button.textContent = "회원탈퇴";
    }
};
