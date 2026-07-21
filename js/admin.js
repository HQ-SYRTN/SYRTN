import { API_BASE_URL, ADMIN_EMAIL, auth, db } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const roleMap = { admin:"관리자", "s-student":"순천고 부원", "b-student":"복성고 부원", "h-student":"해룡고 부원", "s-leader":"순천고 리더", "b-leader":"복성고 리더", "h-leader":"해룡고 리더", teacher:"교사", member:"일반 회원" };
const userNameDisplay = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    let currentAdminUser = null;
    let currentAdminRole = 'guest';

    onAuthStateChanged(auth, async (user) => {
        if (!user) { location.replace('block.html'); return; }
        try {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            const userData = userDocSnap.exists() ? userDocSnap.data() : { name:'관리자', role:'member' };
            const role = user.email === ADMIN_EMAIL ? 'admin' : (userData.role || 'member');
            if (role !== 'admin') { location.replace('block.html'); return; }
            currentAdminUser = user;
            currentAdminRole = role;
            userNameDisplay.style.display = 'inline';
            userNameDisplay.innerText = `${userData.name || '관리자'}님`;
            logoutBtn.style.display = 'inline';
            await Promise.all([loadUsers(), loadSuggestions(), loadRequests()]);
        } catch (error) {
            console.error('권한 확인 실패:', error);
            location.replace('block.html');
        }
    });

    async function apiHeaders() {
        return { Authorization:`Bearer ${await currentAdminUser.getIdToken()}`, 'X-User-Role':currentAdminRole, 'ngrok-skip-browser-warning':'69420' };
    }

    async function loadUsers() {
        const userList = document.getElementById('user-list');
        try {
            const snapshot = await getDocs(query(collection(db, 'users'), orderBy('name', 'asc')));
            userList.innerHTML = '';
            if (snapshot.empty) { userList.innerHTML = '<tr><td colspan="5" style="text-align:center;">등록된 사용자가 없습니다.</td></tr>'; return; }
            snapshot.forEach((docSnap) => {
                const u = docSnap.data();
                const uid = docSnap.id;
                const options = Object.entries(roleMap).map(([value, label]) => `<option value="${value}" ${u.role === value ? 'selected' : ''}>${label}</option>`).join('');
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${escapeHtml(u.name || '이름 없음')}</td><td>${escapeHtml(u.school || '-')}</td><td>${escapeHtml(u.email || '-')}</td><td><span style="color:var(--accent)">${escapeHtml(roleMap[u.role] || u.role || 'member')}</span></td><td><select id="role-${uid}" class="role-select">${options}</select><button class="btn-update" data-uid="${uid}">변경</button></td>`;
                tr.querySelector('button').onclick = () => updateUserRole(uid);
                userList.appendChild(tr);
            });
        } catch (err) {
            console.error('사용자 로드 실패:', err);
            userList.innerHTML = '<tr><td colspan="5" style="text-align:center;">사용자 목록을 불러올 수 없습니다.</td></tr>';
        }
    }

    async function loadSuggestions() {
        const suggestionList = document.getElementById('suggestion-list');
        try {
            const res = await fetch(`${API_BASE_URL}/api/syrtn/suggestions`, { headers: await apiHeaders() });
            if (!res.ok) throw new Error('건의사항 로드 실패');
            const suggestions = await res.json();
            suggestionList.innerHTML = '';
            if (!suggestions.length) { suggestionList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">접수된 건의 사항이 없습니다.</td></tr>'; return; }
            suggestions.forEach((s) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${formatDate(s.created_at || s.createdAt)}</td><td><span style="color:var(--accent)">[${escapeHtml(s.category || '-')}]</span></td><td><strong>${escapeHtml(s.subject || '제목 없음')}</strong><br><small style="color:#ccc">${escapeHtml(s.content || '')}</small></td><td>${escapeHtml(s.author_name || s.authorName || '익명')}</td><td><button class="btn-update btn-danger" data-id="${s.id}">해결 완료</button></td>`;
                tr.querySelector('button').onclick = () => deleteSuggestion(s.id);
                suggestionList.appendChild(tr);
            });
        } catch (err) {
            console.error('건의사항 로드 실패:', err);
            suggestionList.innerHTML = '<tr><td colspan="5" style="text-align:center;">건의사항을 불러올 수 없습니다.</td></tr>';
        }
    }

    async function loadRequests() {
        const requestList = document.getElementById('request-list');
        try {
            const snapshot = await getDocs(query(collection(db, 'pending_requests'), orderBy('timestamp', 'desc')));
            requestList.innerHTML = '';
            if (snapshot.empty) { requestList.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">접수된 요청이 없습니다.</td></tr>'; return; }
            snapshot.forEach((docSnap) => {
                const r = docSnap.data();
                const uid = docSnap.id;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${formatDate(r.timestamp || r.createdAt)}</td><td>${escapeHtml(r.name || '이름 없음')}</td><td>${escapeHtml(r.school || '-')}</td><td><span style="color:var(--accent)">${escapeHtml(roleMap[r.requestedRole] || r.requestedRole || '-')}</span></td><td><small style="color:#ccc">${escapeHtml(r.reason || '-')}</small></td><td><button class="btn-update" data-action="approve">승인</button><button class="btn-update btn-danger" data-action="reject">거절</button></td>`;
                tr.querySelector('[data-action="approve"]').onclick = () => handleRequest(uid, r.requestedRole, 'approve');
                tr.querySelector('[data-action="reject"]').onclick = () => handleRequest(uid, null, 'reject');
                requestList.appendChild(tr);
            });
        } catch (err) {
            console.error('요청 로드 실패:', err);
            requestList.innerHTML = `<tr><td colspan="6" style="text-align:center;">요청 목록을 불러올 수 없습니다: ${escapeHtml(err.message)}</td></tr>`;
        }
    }

    window.updateUserRole = async (uid) => {
        const newRole = document.getElementById(`role-${uid}`).value;
        if (!confirm(`해당 사용자의 등급을 ${roleMap[newRole] || newRole}(으)로 변경하시겠습니까?`)) return;
        try { await updateDoc(doc(db, 'users', uid), { role:newRole }); alert('등급이 변경되었습니다.'); await loadUsers(); }
        catch (err) { console.error(err); alert('등급 변경에 실패했습니다.'); }
    };

    window.handleRequest = async (uid, requestedRole, action) => {
        if (!confirm(`이 요청을 ${action === 'approve' ? '승인' : '거절'}하시겠습니까?`)) return;
        try {
            if (action === 'approve') await updateDoc(doc(db, 'users', uid), { role:requestedRole });
            await deleteDoc(doc(db, 'pending_requests', uid));
            alert(action === 'approve' ? '요청이 승인되었습니다.' : '요청이 거절되었습니다.');
            await Promise.all([loadRequests(), loadUsers()]);
        } catch (err) { console.error(err); alert('요청 처리에 실패했습니다.'); }
    };

    window.deleteSuggestion = async (id) => {
        if (!confirm('이 건의 사항을 해결 완료 처리하고 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/syrtn/suggestions/${id}`, { method:'DELETE', headers: await apiHeaders() });
            if (!res.ok) throw new Error('삭제 실패');
            alert('삭제되었습니다.');
            await loadSuggestions();
        } catch (err) { console.error(err); alert('처리 중 오류가 발생했습니다.'); }
    };

    logoutBtn.onclick = async () => { if (confirm('로그아웃 하시겠습니까?')) { await signOut(auth); location.href = 'index.html'; } };

    function formatDate(value) {
        if (!value) return '-';
        if (value.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
        return new Date(value).toLocaleDateString();
    }

    function escapeHtml(value) {
        return String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
    }
