import { API_BASE_URL, ADMIN_EMAIL, auth, db } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const SCHOOLS = {
        s: { collection:"s-resources", title:"순천고 전용 자료실", boardTitle:"순천고 아카이브", subtitle:"순천고 전용 연구 데이터 및 결과물 아카이브", student:"s-student", leader:"s-leader", writeUrl:"school-write.html?school=s", viewUrl:"school-view.html?school=s", hero:"url('assets/images/saturn-observation.webp')" },
        h: { collection:"h-resources", title:"해룡고 전용 자료실", boardTitle:"해룡고 아카이브", subtitle:"해룡고 전용 연구 데이터 및 결과물 아카이브", student:"h-student", leader:"h-leader", writeUrl:"school-write.html?school=h", viewUrl:"school-view.html?school=h", hero:"url('assets/images/spiral-galaxy.webp')" }
    };

    const params = new URLSearchParams(location.search);
    const schoolKey = params.get("school");
    const school = SCHOOLS[schoolKey];
    if (!school) {
        location.replace("talk.html");
        throw new Error("Invalid school.");
    }

    document.documentElement.style.setProperty("--hero-image", school.hero);
    document.title = `SYRTN | ${school.boardTitle}`;
    document.getElementById("hero-title").textContent = school.title;
    document.getElementById("hero-subtitle").textContent = school.subtitle;
    document.getElementById("board-title").textContent = school.boardTitle;
    document.getElementById("write-btn").onclick = () => location.href = school.writeUrl;
let currentUser = null;
    let currentRole = "guest";
    let allPosts = [];

    const roleAllowed = (role) => ["admin", "teacher", school.student, school.leader].includes(role);
    const canManage = (post) => currentUser && (post.uid === currentUser.uid || ["admin", "teacher", school.leader].includes(currentRole));
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));

    document.getElementById("logout-btn").addEventListener("click", async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            location.href = "index.html";
        }
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) { location.replace("block.html"); return; }
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) { location.replace("block.html"); return; }
            const userData = userDoc.data();
            const role = user.email === ADMIN_EMAIL ? "admin" : (userData.role || "member");
            if (!roleAllowed(role)) { location.replace("block.html"); return; }
            currentUser = user;
            currentRole = role;
            document.getElementById("user-name").style.display = "inline";
            document.getElementById("user-name").textContent = `${userData.name || "사용자"}님`;
            document.getElementById("logout-btn").style.display = "inline";
            document.getElementById("login-link").style.display = "none";
            document.getElementById("write-btn").style.display = "inline";
            await loadPosts();
        } catch (err) {
            console.error(err);
            location.replace("block.html");
        }
    });

    async function authHeaders() {
        return { "Authorization": `Bearer ${await currentUser.getIdToken()}`, "X-User-Role": currentRole, "ngrok-skip-browser-warning": "69420" };
    }

    async function loadPosts() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/syrtn/board/${school.collection}`, { headers: await authHeaders() });
            if (!res.ok) { location.replace("block.html"); return; }
            allPosts = await res.json();
            renderPosts();
        } catch (err) {
            document.getElementById("resource-list").innerHTML = '<div class="empty-msg">서버 연결에 실패했습니다.</div>';
        }
    }

    function renderPosts() {
        const keyword = document.getElementById("search-keyword").value.toLowerCase();
        const category = document.getElementById("filter-category").value;
        const filtered = allPosts.filter(p => (category === "all" || p.category === category) && ((p.title || "").toLowerCase().includes(keyword) || (p.author_name || "").toLowerCase().includes(keyword)));
        const listDiv = document.getElementById("resource-list");
        if (filtered.length === 0) {
            listDiv.innerHTML = '<div class="empty-msg">등록된 자료가 없습니다.</div>';
            return;
        }
        listDiv.innerHTML = filtered.map(p => `
            <div class="resource-item" onclick="location.href='${school.viewUrl}&id=${p.id}'">
                ${canManage(p) ? `<button class="btn-delete-left" onclick="deletePost(event, ${p.id})">삭제</button>` : ""}
                <div class="item-content">
                    <span class="item-title">${escapeHtml(p.title || "제목 없음")}</span>
                    <div class="item-meta"><span class="tag">${escapeHtml(p.category || "기타")}</span><span>${escapeHtml(p.author_name || "익명")}</span><span>|</span><span>${p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</span></div>
                </div>
            </div>
        `).join("");
    }

    window.deletePost = async (event, postId) => {
        event.stopPropagation();
        if (!confirm("이 자료를 삭제하시겠습니까?")) return;
        const res = await fetch(`${API_BASE_URL}/api/syrtn/board/${school.collection}/${postId}`, { method:"DELETE", headers: await authHeaders() });
        if (res.ok) await loadPosts();
        else alert("삭제 권한이 없거나 오류가 발생했습니다.");
    };

    document.getElementById("search-keyword").oninput = renderPosts;
    document.getElementById("filter-category").onchange = renderPosts;
