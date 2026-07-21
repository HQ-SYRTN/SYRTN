  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
  const firebaseConfig={apiKey:"AIzaSyB-0z16OPjp1wY0-U_EHKY9kbRCVba4DkU",
                        authDomain:"syrt-2026.firebaseapp.com",
                        projectId:"syrt-2026",
                        storageBucket:"syrt-2026.firebasestorage.app",
                        messagingSenderId:"848896876364",
                        appId:"1:848896876364:web:42edc690489962f76df9e9"};
  const app=initializeApp(firebaseConfig);initializeAppCheck(app,{provider:new ReCaptchaV3Provider("6Lfnw9ksAAAAAAoBVTPO6fqtCUMeteYlsk5OYjnq"),isTokenAutoRefreshEnabled:true});
  const auth=getAuth(app);
  const db=getFirestore(app);
  let currentUser=null;
  document.getElementById("logout-btn").onclick=async()=>{await signOut(auth);location.href="index.html";};onAuthStateChanged(auth,async user=>{if(!user){location.href="login.html";return;}currentUser=user;document.getElementById("login-link").style.display="none";document.getElementById("logout-btn").style.display="inline";const snap=await getDoc(doc(db,"users",user.uid));const data=snap.exists()?snap.data():{};document.getElementById("user-name").style.display="inline";document.getElementById("user-name").textContent=data.name||"User";document.getElementById("request-name").value=data.name||"";});document.getElementById("request-form").addEventListener("submit",async e=>{e.preventDefault();const pending=query(collection(db,"requests"),where("uid","==",currentUser.uid),where("status","==","pending"));const existing=await getDocs(pending);if(!existing.empty){alert("A pending request already exists.");return;}await addDoc(collection(db,"requests"),{uid:currentUser.uid,email:currentUser.email,name:document.getElementById("request-name").value.trim(),school:document.getElementById("request-school").value,requestedRole:document.getElementById("request-role").value,reason:document.getElementById("request-reason").value.trim(),status:"pending",createdAt:serverTimestamp()});alert("Request submitted.");location.href="mypage.html";});
