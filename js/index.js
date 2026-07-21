import { auth, db } from "./common.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
