import { API_BASE_URL, auth, authHeaders as getAuthHeaders, getCurrentProfile } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const SCHOOLS = {
        s: { collection:"s-resources", name:"순천고", student:"s-student", leader:"s-leader", boardUrl:"school-board.html?school=s", viewUrl:"school-view.html?school=s" },
        h: { collection:"h-resources", name:"해룡고", student:"h-student", leader:"h-leader", boardUrl:"school-board.html?school=h", viewUrl:"school-view.html?school=h" }
    };
    const params = new URLSearchParams(location.search);
    const school = SCHOOLS[params.get("school")];
    const editId = params.get("id");
    if (!school) {
        location.replace("talk.html");
        throw new Error("Invalid school.");
    }
let currentUser = null;
    let currentRole = "guest";
    let currentUserName = "익명";
    let editPost = null;

    document.getElementById("form-title").textContent = editId ? `${school.name} 자료 수정` : `${school.name} 자료 등록`;
    document.getElementById("submit-btn").textContent = editId ? "수정 완료" : "등록";
    document.getElementById("cancel-btn").onclick = () => location.href = editId ? `${school.viewUrl}&id=${editId}` : school.boardUrl;
    document.getElementById("add-link").onclick = () => addLinkField();
    document.getElementById("submit-btn").onclick = submitPost;
    addLinkField();

    const roleAllowed = (role) => ["admin", "teacher", school.student, school.leader].includes(role);
    const canEditPost = () => editPost && currentUser && (editPost.uid === currentUser.uid || ["admin", "teacher", school.leader].includes(currentRole));
    const authHeaders = async () => getAuthHeaders(currentUser);
    const isHttpUrl = (value) => {
        try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol);
        } catch {
            return false;
        }
    };

    document.getElementById("logout-btn").onclick = async () => { if (confirm("로그아웃 하시겠습니까?")) { await signOut(auth); location.href = "index.html"; } };

    onAuthStateChanged(auth, async (user) => {
        if (!user) { location.replace("block.html"); return; }
        try {
            const data = await getCurrentProfile(user);
            const role = data.role || "member";
            if (!roleAllowed(role)) { location.replace("block.html"); return; }
            currentUser = user;
            currentRole = role;
            currentUserName = data.name || "익명";
            document.getElementById("user-name").style.display = "inline";
            document.getElementById("user-name").textContent = `${currentUserName}님`;
            document.getElementById("logout-btn").style.display = "inline";
            document.getElementById("login-link").style.display = "none";
            if (editId) await loadEditData();
        } catch (err) {
            console.error(err);
            location.replace("block.html");
        }
    });

    function addLinkField(url = "", name = "") {
        const row = document.createElement("div");
        row.className = "link-row";
        const nameInput = document.createElement("input");
        nameInput.className = "link-name";
        nameInput.type = "text";
        nameInput.placeholder = "링크 이름";
        nameInput.value = name;
        const urlInput = document.createElement("input");
        urlInput.className = "link-url";
        urlInput.type = "url";
        urlInput.placeholder = "https://...";
        urlInput.value = url;
        const removeButton = document.createElement("button");
        removeButton.className = "btn";
        removeButton.type = "button";
        removeButton.textContent = "삭제";
        removeButton.onclick = () => row.remove();
        row.append(nameInput, urlInput, removeButton);
        document.getElementById("link-container").appendChild(row);
    }

    async function uploadSelectedFiles() {
        const files = Array.from(document.getElementById("file-input")?.files || []);
        const uploaded = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${API_BASE_URL}/api/syrtn/uploads/${school.collection}`, {
                method: "POST",
                headers: await authHeaders(),
                body: formData
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(`${file.name}: ${data.error || "업로드 실패"}`);
            }
            uploaded.push(await res.json());
        }
        return uploaded;
    }

    async function loadEditData() {
        const res = await fetch(`${API_BASE_URL}/api/syrtn/board/${school.collection}/${editId}`, { headers: await authHeaders() });
        if (!res.ok) { location.replace("block.html"); return; }
        editPost = await res.json();
        if (!canEditPost()) { location.replace("block.html"); return; }
        document.getElementById("category").value = editPost.category || "기타";
        document.getElementById("post-title").value = editPost.title || "";
        document.getElementById("post-content").value = editPost.content || "";
        document.getElementById("link-container").innerHTML = "";
        const links = editPost.links && editPost.links.length ? editPost.links : [{}];
        links.forEach(link => addLinkField(link.url || "", link.name || ""));
    }

    async function submitPost() {
        const title = document.getElementById("post-title").value.trim();
        const content = document.getElementById("post-content").value.trim();
        if (!title || !content) { alert("제목과 내용을 입력해주세요."); return; }
        const links = [...document.querySelectorAll(".link-row")].map(row => {
            const url = row.querySelector(".link-url").value.trim();
            return { name:row.querySelector(".link-name").value.trim(), url, type:url.includes("/api/syrtn/uploads/") ? "file" : "link" };
        }).filter(link => link.url);
        if (links.some(link => !isHttpUrl(link.url))) {
            alert("첨부 링크는 http 또는 https 주소만 사용할 수 있습니다.");
            return;
        }
        const submitBtn = document.getElementById("submit-btn");
        submitBtn.disabled = true;
        submitBtn.textContent = "저장 중...";
        try {
            const uploadedFiles = await uploadSelectedFiles();
            links.push(...uploadedFiles);
            const payload = { title, content, category:document.getElementById("category").value, links, authorName:currentUserName };
            const url = editId ? `${API_BASE_URL}/api/syrtn/board/${school.collection}/${editId}` : `${API_BASE_URL}/api/syrtn/board/${school.collection}`;
            const res = await fetch(url, { method: editId ? "PUT" : "POST", headers:{ ...(await authHeaders()), "Content-Type":"application/json" }, body:JSON.stringify(payload) });
            if (!res.ok) { throw new Error("저장 권한이 없거나 오류가 발생했습니다."); }
            if (editId) location.href = `${school.viewUrl}&id=${editId}`;
            else {
                const data = await res.json();
                location.href = `${school.viewUrl}&id=${data.id}`;
            }
        } catch (err) {
            alert(err.message || "저장 중 오류가 발생했습니다.");
            submitBtn.disabled = false;
            submitBtn.textContent = editId ? "수정 완료" : "등록";
        }
    }
