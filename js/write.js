import { API_BASE_URL, auth, authHeaders, getCurrentProfile } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const COLLECTION = "resources";
const WRITABLE_ROLES = ['s-leader', 'b-leader', 'h-leader', 'teacher', 'admin'];
const editPostId = new URLSearchParams(window.location.search).get('id');
    let currentUser = null;
    let currentRole = 'guest';
    let currentUserName = '익명';

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => { if (confirm('로그아웃 하시겠습니까?')) { await signOut(auth); location.replace('index.html'); } });
    document.getElementById('btnAddLink').addEventListener('click', () => addLinkField());

    onAuthStateChanged(auth, async (user) => {
        if (!user) { alert('로그인이 필요합니다.'); location.replace('login.html'); return; }
        try {
            const userData = await getCurrentProfile(user);
            currentRole = userData.role || 'member';
            if (!WRITABLE_ROLES.includes(currentRole)) { alert('작성 권한이 없습니다. 각 학교별 리더 이상만 가능합니다.'); location.replace('resource.html'); return; }
            currentUser = user;
            currentUserName = userData.name || user.displayName || '사용자';
            document.getElementById('user-name').style.display = 'inline';
            document.getElementById('user-name').innerText = `${currentUserName}님`;
            logoutBtn.style.display = 'inline';
            if (editPostId) await loadEditData();
        } catch (error) {
            console.error(error);
            alert('권한 확인 중 오류가 발생했습니다.');
            location.replace('resource.html');
        }
    });

    async function getHeaders(contentType = false) {
        const headers = await authHeaders(currentUser);
        if (contentType) headers['Content-Type'] = 'application/json';
        return headers;
    }

    async function loadEditData() {
        document.getElementById('formTitle').innerText = '자료 수정하기';
        document.getElementById('submitBtn').innerText = '수정 완료';
        const res = await fetch(`${API_BASE_URL}/api/syrtn/board/${COLLECTION}/${editPostId}`, { headers: await getHeaders() });
        if (!res.ok) { alert('자료를 찾을 수 없습니다.'); location.replace('resource.html'); return; }
        const data = await res.json();
        const canEdit = data.uid === currentUser.uid || WRITABLE_ROLES.includes(currentRole);
        if (!canEdit) { alert('수정 권한이 없습니다.'); location.replace('resource.html'); return; }
        document.getElementById('postTitle').value = data.title || '';
        document.getElementById('postContent').value = data.content || data.description || '';
        document.getElementById('category').value = data.category || '천체 관측 데이터';
        if (data.links && data.links.length > 0) {
            document.getElementById('linkContainer').innerHTML = '';
            data.links.forEach(link => addLinkField(link.url, link.name));
        }
    }

    async function submitPost() {
        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const category = document.getElementById('category').value;
        if (!title || !content) { alert('제목과 내용을 입력해주세요.'); return; }
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = '처리 중...';
        const links = Array.from(document.querySelectorAll('.postFileUrl')).map((input, index) => {
            let url = input.value.trim();
            if (!url) return null;
            if (!url.startsWith('http')) url = 'https://' + url;
            const name = document.querySelectorAll('.postFileName')[index].value.trim() || '첨부 링크';
            return { url, name, type: url.includes('/api/syrtn/uploads/') ? 'file' : 'link' };
        }).filter(Boolean);
        try {
            const uploadedFiles = await uploadSelectedFiles();
            links.push(...uploadedFiles);
            const url = editPostId ? `${API_BASE_URL}/api/syrtn/board/${COLLECTION}/${editPostId}` : `${API_BASE_URL}/api/syrtn/board/${COLLECTION}`;
            const res = await fetch(url, { method: editPostId ? 'PUT' : 'POST', headers: await getHeaders(true), body: JSON.stringify({ title, content, category, links, authorName: currentUserName }) });
            if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || '저장 실패'); }
            alert(editPostId ? '수정되었습니다.' : '등록되었습니다.');
            location.replace('resource.html');
        } catch (err) {
            alert('저장 실패: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = editPostId ? '수정 완료' : '자료 등록하기';
        }
    }

    async function uploadSelectedFiles() {
        const files = Array.from(document.getElementById('fileInput')?.files || []);
        const uploaded = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE_URL}/api/syrtn/uploads/${COLLECTION}`, {
                method: 'POST',
                headers: await getHeaders(false),
                body: formData
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(`${file.name}: ${data.error || '업로드 실패'}`);
            }
            uploaded.push(await res.json());
        }
        return uploaded;
    }

    function addLinkField(url = '', name = '') {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.innerHTML = `<input type="text" class="postFileUrl" value="${escapeAttr(url)}" placeholder="링크 주소 (https://...)" style="flex:2; margin-bottom:0;"><input type="text" class="postFileName" value="${escapeAttr(name)}" placeholder="이름" style="flex:1; margin-bottom:0;"><button type="button" class="btn-remove-link" style="width:40px; background:#ff4d4d; color:white; border:none; border-radius:5px; cursor:pointer;">-</button>`;
        document.getElementById('linkContainer').appendChild(div);
        div.querySelector('.btn-remove-link').onclick = () => div.remove();
    }
    function escapeAttr(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
    document.getElementById('submitBtn').addEventListener('click', submitPost);
