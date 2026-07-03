import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL = "2jw5464@gmail.com";
const firebaseConfig = {
    apiKey: "AIzaSyB-0z16OPjp1wY0-U_EHKY9kbRCVba4DkU",
    authDomain: "syrt-2026.firebaseapp.com",
    projectId: "syrt-2026",
    storageBucket: "syrt-2026.firebasestorage.app",
    messagingSenderId: "848896876364",
    appId: "1:848896876364:web:42edc690489962f76df9e9"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ROLES = {
    loggedIn: ["admin", "teacher", "s-leader", "h-leader", "b-leader", "s-student", "h-student", "b-student", "member"],
    resourceWrite: ["admin", "teacher", "s-leader", "h-leader", "b-leader"],
    suggestions: ["admin", "teacher", "s-leader", "h-leader", "b-leader", "s-student", "h-student", "b-student"],
    suggestionRead: ["admin", "teacher", "s-leader", "h-leader", "b-leader"],
    schoolS: ["admin", "teacher", "s-leader", "s-student"],
    schoolH: ["admin", "teacher", "h-leader", "h-student"],
    schoolB: ["admin", "teacher", "b-leader", "b-student"]
};

const PAGE_RULES = [
    { match: /^admin\.html$/, roles: ["admin"] },
    { match: /^write\.html$/, roles: ROLES.resourceWrite },
    { match: /^suggest\.html$/, roles: ROLES.suggestions },
    { match: /^resource\.html$/, roles: ROLES.loggedIn },
    { match: /^view\.html$/, roles: ROLES.loggedIn },
    { match: /^mypage\.html$/, roles: ROLES.loggedIn },
    { match: /^adjust\.html$/, roles: ROLES.loggedIn },
    { match: /^school-board\.html$/, roles: schoolRolesFromQuery },
    { match: /^school-view\.html$/, roles: schoolRolesFromQuery },
    { match: /^school-write\.html$/, roles: schoolRolesFromQuery }
];

function schoolRolesFromQuery() {
    const school = new URLSearchParams(location.search).get("school");
    if (school === "s") return ROLES.schoolS;
    if (school === "h") return ROLES.schoolH;
    if (school === "b") return ROLES.schoolB;
    return [];
}

function currentPage() {
    return location.pathname.split("/").pop() || "index.html";
}

function findRule() {
    const page = currentPage();
    return PAGE_RULES.find(rule => rule.match.test(page));
}

function canAccess(role, rule) {
    if (!rule) return true;
    const roles = typeof rule.roles === "function" ? rule.roles() : rule.roles;
    return roles.includes(role);
}

function setLinkVisibility(selector, visible) {
    document.querySelectorAll(selector).forEach(link => {
        link.style.display = visible ? "" : "none";
    });
}

function hardenNavigation(role) {
    const isLoggedIn = role !== "guest";
    setLinkVisibility('a[href="admin.html"]', role === "admin");
    setLinkVisibility('a[href="suggest.html"]', ROLES.suggestions.includes(role));
    setLinkVisibility('a[href="resource.html"]', isLoggedIn);
    setLinkVisibility('a[href="mypage.html"]', isLoggedIn);
    setLinkVisibility('a[href="adjust.html"]', isLoggedIn);

    document.querySelectorAll('a[href="write.html"], button[onclick*="write.html"]').forEach(el => {
        el.style.display = ROLES.resourceWrite.includes(role) ? "" : "none";
    });
}

async function resolveRole(user) {
    if (!user) return "guest";
    if (user.email === ADMIN_EMAIL) return "admin";
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return "member";
    return snap.data().role || "member";
}

onAuthStateChanged(auth, async user => {
    let role = "guest";
    try {
        role = await resolveRole(user);
    } catch (err) {
        role = "guest";
    }

    hardenNavigation(role);

    const rule = findRule();
    if (!canAccess(role, rule)) {
        const isLoginRequired = role === "guest" && currentPage() !== "block.html";
        location.replace(isLoginRequired ? "login.html" : "block.html");
    }
});
