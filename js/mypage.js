import { API_BASE_URL, ADMIN_EMAIL, auth, db } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
let currentUser = null;
const roleMap = { admin:"관리자", teacher:"교사", "s-leader":"순천고 리더", "h-leader":"해룡고 리더", "b-leader":"복성고 리더", "s-student":"순천고 부원", "h-student":"해룡고 부원", "b-student":"복성고 부원", member:"일반 회원" };

async function logout() {
    await signOut(auth);
    location.href = "index.html";
}

async function authHeaders(contentType = false) {
    const token = await currentUser.getIdToken();
    const headers = { Authorization:`Bearer ${token}` };
    if (contentType) headers["Content-Type"] = "application/json";
    return headers;
}

document.getElementById("card-logout-btn").onclick = document.getElementById("logout-btn").onclick = logout;

onAuthStateChanged(auth, async user => {
    if (!user) { location.href = "login.html"; return; }
    currentUser = user;
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    const role = user.email === ADMIN_EMAIL ? "admin" : (data.role || "member");
    document.getElementById("login-link").style.display = "none";
    document.getElementById("logout-btn").style.display = "inline";
    document.getElementById("user-name").style.display = "inline";
    document.getElementById("user-name").textContent = data.name || "User";
    document.getElementById("display-email").value = user.email || "";
    document.getElementById("display-school").value = data.school || "학교 정보 없음";
    document.getElementById("edit-name").value = data.name || "";
    document.getElementById("display-role").value = roleMap[role] || role;
});

document.getElementById("update-profile-btn").onclick = async () => {
    const name = document.getElementById("edit-name").value.trim();
    if (!name) return alert("이름을 입력해 주세요.");
    await updateDoc(doc(db, "users", currentUser.uid), { name });
    alert("프로필이 수정되었습니다.");
    location.reload();
};

document.getElementById("delete-account-btn").onclick = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    const confirmation = document.getElementById("delete-confirm-input").value.trim();
    if (confirmation !== "회원탈퇴") return alert("확인 문구를 정확히 입력해 주세요.");
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    const button = document.getElementById("delete-account-btn");
    button.disabled = true;
    button.textContent = "처리 중...";
    try {
        const res = await fetch(`${API_BASE_URL}/api/syrtn/account`, {
            method: "DELETE",
            headers: await authHeaders()
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "회원탈퇴에 실패했습니다.");
        await signOut(auth).catch(() => {});
        alert("회원탈퇴가 완료되었습니다.");
        location.replace("index.html");
    } catch (err) {
        alert(err.message || "회원탈퇴에 실패했습니다.");
        button.disabled = false;
        button.textContent = "회원탈퇴";
    }
};
