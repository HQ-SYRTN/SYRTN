import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyB-0z16OPjp1wY0-U_EHKY9kbRCVba4DkU",authDomain:"syrt-2026.firebaseapp.com",projectId:"syrt-2026",storageBucket:"syrt-2026.firebasestorage.app",messagingSenderId:"848896876364",appId:"1:848896876364:web:42edc690489962f76df9e9"};
const app=initializeApp(firebaseConfig);
initializeAppCheck(app,{provider:new ReCaptchaV3Provider("6Lfnw9ksAAAAAAoBVTPO6fqtCUMeteYlsk5OYjnq"),isTokenAutoRefreshEnabled:true});
const auth=getAuth(app);
const db=getFirestore(app);

document.getElementById("signup-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=document.getElementById("submit-btn");
  btn.disabled=true;
  try{
    const name=document.getElementById("name").value.trim();
    const school=document.getElementById("school").value;
    const email=document.getElementById("email").value.trim();
    const cred=await createUserWithEmailAndPassword(auth,email,document.getElementById("password").value);
    await setDoc(doc(db,"users",cred.user.uid),{name,school,email,role:"member",createdAt:serverTimestamp()});
    await sendEmailVerification(cred.user);
    alert("Signup complete. Verify your email before logging in.");
    location.href="login.html";
  }catch(err){
    alert("Signup failed: "+err.message);
  }finally{
    btn.disabled=false;
  }
});
