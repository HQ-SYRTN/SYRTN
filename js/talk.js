import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig={
    apiKey:"AIzaSyB-0z16OPjp1wY0-U_EHKY9kbRCVba4DkU",
    authDomain:"syrt-2026.firebaseapp.com",
    projectId:"syrt-2026",
    storageBucket:"syrt-2026.firebasestorage.app",
    messagingSenderId:"848896876364",
    appId:"1:848896876364:web:42edc690489962f76df9e9"
};

const app=initializeApp(firebaseConfig);
initializeAppCheck(app,{
    provider:new ReCaptchaV3Provider("6Lfnw9ksAAAAAAoBVTPO6fqtCUMeteYlsk5OYjnq"),
    isTokenAutoRefreshEnabled:true
});

const auth=getAuth(app);
const db=getFirestore(app);
let userDataCache=null;

const loginLink=document.getElementById("login-link");
const logoutBtn=document.getElementById("logout-btn");
const userName=document.getElementById("user-name");

logoutBtn.addEventListener("click",async()=>{
    await signOut(auth);
    location.reload();
});

onAuthStateChanged(auth,async user=>{
    if(!user){
        userDataCache=null;
        loginLink.style.display="inline-flex";
        logoutBtn.style.display="none";
        userName.style.display="none";
        return;
    }

    const snap=await getDoc(doc(db,"users",user.uid));
    userDataCache=snap.exists()?snap.data():{role:"member"};
    loginLink.style.display="none";
    logoutBtn.style.display="inline-flex";
    userName.style.display="inline";
    userName.textContent=userDataCache.name||user.displayName||"User";
});

window.gateCheck=(targetUrl,studentRole,leaderRole)=>{
    if(!auth.currentUser){
        location.href="block.html";
        return;
    }
    if(!userDataCache){
        alert("권한 정보를 불러오는 중입니다. 잠시 후 다시 시도하세요.");
        return;
    }
    const role=userDataCache.role||"member";
    if(role==="admin"||role==="teacher"||role===studentRole||role===leaderRole){
        location.href=targetUrl;
        return;
    }
    location.href="block.html";
};
