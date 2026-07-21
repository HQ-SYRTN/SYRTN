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
const loginLink=document.getElementById("login-link");
const logoutBtn=document.getElementById("logout-btn");
const userName=document.getElementById("user-name");

logoutBtn?.addEventListener("click",async()=>{
  await signOut(auth);
  location.href="index.html";
});

onAuthStateChanged(auth,async user=>{
  if(!user) return;
  const snap=await getDoc(doc(db,"users",user.uid));
  const data=snap.exists()?snap.data():{};
  loginLink.style.display="none";
  logoutBtn.style.display="inline-flex";
  userName.style.display="inline";
  userName.textContent=data.name||user.displayName||"User";
});
