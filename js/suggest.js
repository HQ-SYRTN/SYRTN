import { API_BASE_URL, auth, authHeaders, getCurrentProfile } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name');
    const nameInput = document.getElementById('user-name-input');
    const anonCheck = document.getElementById('anon-check');
    const submitBtn = document.querySelector('.submit-btn');
    let currentUser = null;
    let currentUserData = null;
    let currentRole = 'guest';

    onAuthStateChanged(auth, async (user) => {
        if (!user) { location.replace('block.html'); return; }
        currentUser = user;
        try {
            currentUserData = await getCurrentProfile(user);
            currentRole = currentUserData.role || 'member';
            if (!['admin', 'teacher', 's-leader', 'h-leader', 'b-leader', 's-student', 'h-student', 'b-student'].includes(currentRole)) { location.replace('block.html'); return; }
            loginLink.style.display = 'none';
            userNameDisplay.style.display = 'inline';
            userNameDisplay.innerText = `${currentUserData.name || '사용자'}님`;
            logoutBtn.style.display = 'inline';
            if (!anonCheck.checked) nameInput.value = currentUserData.name || '';
        } catch (error) {
            console.error(error);
            location.replace('block.html');
        }
    });

    anonCheck.addEventListener('change', () => {
        if (anonCheck.checked) {
            nameInput.value = '';
            nameInput.disabled = true;
            nameInput.placeholder = '익명으로 안전하게 제출합니다';
            nameInput.required = false;
        } else {
            nameInput.disabled = false;
            nameInput.placeholder = '성함을 입력하세요';
            nameInput.required = true;
            if (currentUserData) nameInput.value = currentUserData.name || '';
        }
    });

    document.getElementById('suggestion-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = '제출 중...';
        const isAnon = anonCheck.checked;
        const authorName = isAnon ? '익명' : nameInput.value.trim();
        try {
            const res = await fetch(`${API_BASE_URL}/api/syrtn/suggestions`, {
                method: 'POST',
                headers: { ...(await authHeaders(currentUser)), 'Content-Type': 'application/json' },
                body: JSON.stringify({ authorName, isAnonymous: isAnon, category: document.getElementById('category').value, subject: document.getElementById('subject').value.trim(), content: document.getElementById('content').value.trim(), userEmail: currentUser.email })
            });
            if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || '제출 실패'); }
            alert('소중한 의견이 제출되었습니다. 관리자가 확인 후 반영하겠습니다.');
            document.getElementById('suggestion-form').reset();
            if (currentUserData) nameInput.value = currentUserData.name || '';
        } catch (err) {
            alert('제출 중 오류가 발생했습니다: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = '제출하기';
        }
    });

    logoutBtn.onclick = async () => { if (confirm('로그아웃 하시겠습니까?')) { await signOut(auth); location.replace('index.html'); } };
