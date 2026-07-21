import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const API_BASE_URL = "https://hypocrite-depletion-until.ngrok-free.dev";
export const ADMIN_EMAIL = "2jw5464@gmail.com";

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
export const db = getFirestore(app);

export async function logoutTo(target = "index.html") {
    await signOut(auth);
    location.href = target;
}
