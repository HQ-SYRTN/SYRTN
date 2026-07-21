import { API_BASE_URL, ADMIN_EMAIL, auth, db } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const COLLECTION = "resources";
const WRITABLE_ROLES = ['teacher', 's-leader', 'h-leader', 'b-leader', 'admin'];
let currentUser = null;
    let currentRole = 'guest';
    let allPosts = [];

    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            location.href = "index.html";
        }
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            location.replace('login.html');
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            currentUser = user;

            if (userDoc.exists()) {
                const userData = userDoc.data();
                currentRole = user.email === ADMIN_EMAIL ? 'admin' : (userData.role || 'member');
                document.getElementById('user-name').style.display = 'inline';
                document.getElementById('user-name').innerText = `${userData.name || '사용자'}님`;
            } else {
                currentRole = 'member';
                document.getElementById('user-name').style.display = 'inline';
                document.getElementById('user-name').innerText = '사용자님';
            }

            document.getElementById('logout-btn').style.display = 'inline';
            document.getElementById('login-link').style.display = 'none';

            if (WRITABLE_ROLES.includes(currentRole)) {
                document.getElementById('write-btn').style.display = 'inline';
            }

            await loadPosts();
        } catch (err) {
            console.error(err);
            location.replace('block.html');
        }
    });
    async function loadPosts() {
        try {
            const headers = { "ngrok-skip-browser-warning": "69420", "X-User-Role": currentRole };
            if (currentUser) headers["Authorization"] = `Bearer ${await currentUser.getIdToken()}`;

            const res = await fetch(`${API_BASE_URL}/api/syrtn/board/${COLLECTION}`, { headers });
            if (!res.ok) {
                document.getElementById('resource-list').innerHTML = '<div style="padding:100px; text-align:center; color:#ff4d4d;">서버 연결에 실패했습니다.</div>';
                return;
            }
            allPosts = await res.json();
            renderPosts();
        } catch (err) {
            document.getElementById('resource-list').innerHTML = '<div style="padding:100px; text-align:center; color:#ff4d4d;">서버 연결에 실패했습니다.</div>';
        }
    }

    function renderPosts() {
        const keyword = document.getElementById('search-keyword').value.toLowerCase();
        const category = document.getElementById('filter-category').value;
        const listDiv = document.getElementById('resource-list');

        const filtered = allPosts.filter(p =>
            (category === 'all' || p.category === category) &&
            ((p.title || '').toLowerCase().includes(keyword) || (p.author_name || '').toLowerCase().includes(keyword))
        );

        if (filtered.length === 0) {
            listDiv.innerHTML = '<div style="padding:100px; text-align:center; color:#555;">등록된 자료가 없거나 검색 결과가 없습니다.</div>';
            return;
        }

        const canDelete = (p) => currentUser && (
            p.uid === currentUser.uid ||
            ['admin', 'teacher', 's-leader', 'h-leader', 'b-leader'].includes(currentRole)
        );

        listDiv.innerHTML = filtered.map(p => `
            <div class="resource-item" onclick="location.href='view.html?id=${p.id}'">
                ${canDelete(p) ? `<button class="btn-delete-left" onclick="deletePost(event, ${p.id})">삭제</button>` : ''}
                <div class="item-content">
                    <span class="tag" style="margin-bottom:8px; display:inline-block;">${p.category || '기타'}</span>
                    <span class="item-title">${p.title || '제목 없음'}</span>
                    <div class="item-meta">
                        <span>${p.author_name || '익명'}</span>
                        <span style="opacity:0.4;">|</span>
                        <span>${p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.deletePost = async (e, postId) => {
        e.stopPropagation();
        if (!confirm("이 자료를 삭제하시겠습니까?")) return;
        try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/syrtn/board/${COLLECTION}/${postId}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-User-Role": currentRole,
                    "ngrok-skip-browser-warning": "69420"
                }
            });
            if (res.ok) {
                alert("삭제되었습니다.");
                await loadPosts();
            } else {
                const data = await res.json();
                alert("삭제 실패: " + data.error);
            }
        } catch (err) {
            alert("서버 연결에 실패했습니다.");
        }
    };

    document.getElementById('search-keyword').oninput = renderPosts;
    document.getElementById('filter-category').onchange = renderPosts;
