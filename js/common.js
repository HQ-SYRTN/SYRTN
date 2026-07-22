import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const API_BASE_URL = "https://hypocrite-depletion-until.ngrok-free.dev";

export const firebaseConfig = {
    apiKey: "AIzaSyB-0z16OPjp1wY0-U_EHKY9kbRCVba4DkU",
    authDomain: "syrt-2026.firebaseapp.com",
    projectId: "syrt-2026",
    storageBucket: "syrt-2026.firebasestorage.app",
    messagingSenderId: "848896876364",
    appId: "1:848896876364:web:42edc690489962f76df9e9",
    measurementId: "G-Q0BKR95VH2"
};

export const roleLabelMap = {
    admin: "관리자",
    teacher: "교사",
    "s-leader": "순천고 리더",
    "h-leader": "해룡고 리더",
    "b-leader": "복성고 리더",
    "s-student": "순천고 학생",
    "h-student": "해룡고 학생",
    "b-student": "복성고 학생",
    member: "일반 회원",
    guest: "비회원"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let appCheckEnabled = false;

export function ensureAppCheck() {
    if (appCheckEnabled) return;
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6Lfnw9ksAAAAAAoBVTPO6fqtCUMeteYlsk5OYjnq"),
        isTokenAutoRefreshEnabled: true
    });
    appCheckEnabled = true;
}

ensureAppCheck();

export const auth = getAuth(app);

let profileUid = null;
let profilePromise = null;

export async function authHeaders(user = auth.currentUser, json = false) {
    if (!user) throw new Error("로그인이 필요합니다.");
    const headers = {
        Authorization: `Bearer ${await user.getIdToken()}`,
        "ngrok-skip-browser-warning": "69420"
    };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
}

export async function apiRequest(path, options = {}, user = auth.currentUser) {
    const headers = new Headers(options.headers || {});
    const authValues = await authHeaders(user);
    Object.entries(authValues).forEach(([key, value]) => headers.set(key, value));
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `요청에 실패했습니다. (${response.status})`);
    }
    return response;
}

export function clearProfileCache() {
    profileUid = null;
    profilePromise = null;
}

export async function getCurrentProfile(user = auth.currentUser, force = false) {
    if (!user) return { uid: null, email: "", name: "", school: "", role: "guest" };
    if (!force && profileUid === user.uid && profilePromise) return profilePromise;
    profileUid = user.uid;
    profilePromise = apiRequest("/api/syrtn/me", {}, user)
        .then(response => response.json())
        .catch(error => {
            clearProfileCache();
            throw error;
        });
    return profilePromise;
}

export async function updateCurrentProfile(profile, user = auth.currentUser) {
    const response = await apiRequest("/api/syrtn/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    }, user);
    clearProfileCache();
    return response.json();
}

export async function logoutTo(target = "index.html") {
    clearProfileCache();
    await signOut(auth);
    location.href = target;
}
