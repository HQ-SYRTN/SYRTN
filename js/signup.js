import { auth, db } from "./common.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
