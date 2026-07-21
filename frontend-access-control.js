import { ADMIN_EMAIL, auth, db } from "./js/common.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

function schoolRolesFromQuery(searchParams = new URLSearchParams(location.search)) {
    const school = searchParams.get("school");
    if (school === "s") return ROLES.schoolS;
    if (school === "h") return ROLES.schoolH;
    if (school === "b") return ROLES.schoolB;
    return [];
}

function currentPage() {
    return location.pathname.split("/").pop() || "index.html";
}

function findRule(page = currentPage()) {
    return PAGE_RULES.find(rule => rule.match.test(page));
}

function canAccess(role, rule, searchParams = new URLSearchParams(location.search)) {
    if (!rule) return true;
    const roles = typeof rule.roles === "function" ? rule.roles(searchParams) : rule.roles;
    return roles.includes(role);
}

function setLinkVisibility(selector, visible) {
    document.querySelectorAll(selector).forEach(link => {
        link.style.display = visible ? "" : "none";
    });
}

function hardenNavigation(role) {
    setLinkVisibility(".nav-menu a", true);

    document.querySelectorAll('a[href="write.html"]:not(.nav-menu a), button[onclick*="write.html"]').forEach(el => {
        el.style.display = ROLES.resourceWrite.includes(role) ? "" : "none";
    });
}

function ruleForLink(link) {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return null;
    }

    const url = new URL(href, location.href);
    if (url.origin !== location.origin) {
        return null;
    }

    const page = url.pathname.split("/").pop() || "index.html";
    const rule = findRule(page);
    return { rule, searchParams: url.searchParams };
}

function installNavGuards(role) {
    window.__syrtnNavRole = role;
    if (window.__syrtnNavGuardsInstalled) return;
    window.__syrtnNavGuardsInstalled = true;

    document.querySelectorAll(".nav-menu a").forEach(link => {
        link.addEventListener("click", event => {
            const target = ruleForLink(link);
            if (!target) return;

            const currentRole = window.__syrtnNavRole || "guest";
            if (!canAccess(currentRole, target.rule, target.searchParams)) {
                event.preventDefault();
                location.href = "block.html";
            }
        });
    });
}

async function resolveRole(user) {
    if (!user) return "guest";
    if (user.email === ADMIN_EMAIL) return "admin";
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return "member";
    return snap.data().role || "member";
}

installNavGuards("guest");

onAuthStateChanged(auth, async user => {
    let role = "guest";
    try {
        role = await resolveRole(user);
    } catch (err) {
        role = "guest";
    }

    hardenNavigation(role);
    installNavGuards(role);

    const rule = findRule();
    if (!canAccess(role, rule)) {
        const isLoginRequired = role === "guest" && currentPage() !== "block.html";
        location.replace(isLoginRequired ? "login.html" : "block.html");
    }
});
