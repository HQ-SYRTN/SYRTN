import { apiRequest, auth, getCurrentProfile } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const roleMap = {
    admin: "관리자", "s-student": "순천고 부원", "b-student": "복성고 부원", "h-student": "해룡고 부원",
    "s-leader": "순천고 리더", "b-leader": "복성고 리더", "h-leader": "해룡고 리더",
    teacher: "교사", member: "일반 회원"
};
const userNameDisplay = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");
let currentAdminUser = null;

onAuthStateChanged(auth, async user => {
    if (!user) {
        location.replace("block.html");
        return;
    }
    try {
        const profile = await getCurrentProfile(user);
        if (profile.role !== "admin") {
            location.replace("block.html");
            return;
        }
        currentAdminUser = user;
        userNameDisplay.style.display = "inline";
        userNameDisplay.textContent = `${profile.name || "관리자"}님`;
        logoutBtn.style.display = "inline";
        await Promise.all([loadUsers(), loadSuggestions(), loadRequests()]);
    } catch (error) {
        console.error("권한 확인 실패:", error);
        location.replace("block.html");
    }
});

async function loadUsers() {
    const userList = document.getElementById("user-list");
    try {
        const response = await apiRequest("/api/syrtn/admin/users", {}, currentAdminUser);
        const users = await response.json();
        userList.innerHTML = "";
        if (!users.length) {
            userList.innerHTML = '<tr><td colspan="5" style="text-align:center;">등록된 사용자가 없습니다.</td></tr>';
            return;
        }
        users.forEach(user => {
            const options = Object.entries(roleMap).map(([value, label]) =>
                `<option value="${value}" ${user.role === value ? "selected" : ""}>${label}</option>`
            ).join("");
            const row = document.createElement("tr");
            row.innerHTML = `<td>${escapeHtml(user.name || "이름 없음")}</td><td>${escapeHtml(user.school || "-")}</td><td>${escapeHtml(user.email || "-")}</td><td><span style="color:var(--accent)">${escapeHtml(roleMap[user.role] || user.role || "member")}</span></td><td><select id="role-${user.uid}" class="role-select">${options}</select><button class="btn-update">변경</button></td>`;
            row.querySelector("button").onclick = () => updateUserRole(user.uid);
            userList.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        userList.innerHTML = '<tr><td colspan="5" style="text-align:center;">사용자 목록을 불러올 수 없습니다.</td></tr>';
    }
}

async function loadSuggestions() {
    const list = document.getElementById("suggestion-list");
    try {
        const response = await apiRequest("/api/syrtn/suggestions", {}, currentAdminUser);
        const suggestions = await response.json();
        list.innerHTML = "";
        if (!suggestions.length) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;">접수된 건의 사항이 없습니다.</td></tr>';
            return;
        }
        suggestions.forEach(suggestion => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${formatDate(suggestion.created_at)}</td><td><span style="color:var(--accent)">[${escapeHtml(suggestion.category || "-")}]</span></td><td><strong>${escapeHtml(suggestion.subject || "제목 없음")}</strong><br><small style="color:#ccc">${escapeHtml(suggestion.content || "")}</small></td><td>${escapeHtml(suggestion.author_name || "익명")}</td><td><button class="btn-update btn-danger">해결 완료</button></td>`;
            row.querySelector("button").onclick = () => deleteSuggestion(suggestion.id);
            list.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        list.innerHTML = '<tr><td colspan="5" style="text-align:center;">건의사항을 불러올 수 없습니다.</td></tr>';
    }
}

async function loadRequests() {
    const list = document.getElementById("request-list");
    try {
        const response = await apiRequest("/api/syrtn/authority-requests", {}, currentAdminUser);
        const requests = await response.json();
        list.innerHTML = "";
        if (!requests.length) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">접수된 요청이 없습니다.</td></tr>';
            return;
        }
        requests.forEach(authorityRequest => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${formatDate(authorityRequest.created_at)}</td><td>${escapeHtml(authorityRequest.name || "이름 없음")}</td><td>${escapeHtml(authorityRequest.school || "-")}</td><td><span style="color:var(--accent)">${escapeHtml(roleMap[authorityRequest.requested_role] || authorityRequest.requested_role)}</span></td><td><small style="color:#ccc">${escapeHtml(authorityRequest.reason || "-")}</small></td><td><button class="btn-update" data-action="approve">승인</button><button class="btn-update btn-danger" data-action="reject">거절</button></td>`;
            row.querySelector('[data-action="approve"]').onclick = () => handleRequest(authorityRequest.uid, "approve");
            row.querySelector('[data-action="reject"]').onclick = () => handleRequest(authorityRequest.uid, "reject");
            list.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        list.innerHTML = `<tr><td colspan="6" style="text-align:center;">요청 목록을 불러올 수 없습니다: ${escapeHtml(error.message)}</td></tr>`;
    }
}

async function updateUserRole(uid) {
    const role = document.getElementById(`role-${uid}`).value;
    if (!confirm(`해당 사용자의 등급을 ${roleMap[role] || role}(으)로 변경하시겠습니까?`)) return;
    try {
        await apiRequest(`/api/syrtn/admin/users/${encodeURIComponent(uid)}/role`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role })
        }, currentAdminUser);
        alert("등급이 변경되었습니다.");
        await loadUsers();
    } catch (error) {
        alert(error.message);
    }
}

async function handleRequest(uid, action) {
    if (!confirm(`이 요청을 ${action === "approve" ? "승인" : "거절"}하시겠습니까?`)) return;
    try {
        await apiRequest(`/api/syrtn/authority-requests/${encodeURIComponent(uid)}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action })
        }, currentAdminUser);
        alert(action === "approve" ? "요청이 승인되었습니다." : "요청이 거절되었습니다.");
        await Promise.all([loadRequests(), loadUsers()]);
    } catch (error) {
        alert(error.message);
    }
}

async function deleteSuggestion(id) {
    if (!confirm("이 건의 사항을 해결 완료 처리하고 삭제하시겠습니까?")) return;
    try {
        await apiRequest(`/api/syrtn/suggestions/${id}`, { method: "DELETE" }, currentAdminUser);
        alert("삭제되었습니다.");
        await loadSuggestions();
    } catch (error) {
        alert(error.message);
    }
}

logoutBtn.onclick = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
        await signOut(auth);
        location.href = "index.html";
    }
};

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : "-";
}

function escapeHtml(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
