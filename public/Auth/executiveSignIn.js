import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import { withLoading, submitOnEnter, notify, friendlyError, checkRequired } from "./auth-ui.js";
// ✅ UPDATED TO NEW PROJECT CONFIG
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0fYgeJM4CDQCgFCv9jK1lObbtSQ8VyqA",
  authDomain: "fx-13-valour-robotics-club-web.firebaseapp.com",
  projectId: "fx-13-valour-robotics-club-web",
  storageBucket: "fx-13-valour-robotics-club-web.firebasestorage.app",
  messagingSenderId: "720455152690",
  appId: "1:720455152690:web:d19e18da770a2eb970782b",
  measurementId: "G-GCS4EENQ9R",
};

// INITIALIZE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// ... rest of your listener code

const loginBtn = document.getElementById("signInBtn");
const signInScreen = document.getElementById("signInScreen");
const successSignInExecutive = document.getElementById(
  "successSignInExecutive",
);
const notExecutive = document.getElementById("notExecutive");

loginBtn.addEventListener('click', withLoading(loginBtn, async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    notify("Please enter your email and password.", ["email", "password"].filter((id) => !document.getElementById(id).value));
    return;
  }

  try {
    // The core Firebase magic
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    console.log("Logged in as:", user.email);

    const executiveRef = doc(db, "authorized_emails", email);
    const executiveSnap = await getDoc(executiveRef);

    if (executiveSnap.exists()) {
      signInScreen.style.display = "none";
      successSignInExecutive.style.display = "flex";
    } else {
      signInScreen.style.display = "none";
      notExecutive.style.display = "flex";
    }
  } catch (error) {
    // Handle common login errors gracefully
    if (error.code === "auth/invalid-credential") {
      notify("Incorrect email or password. Please try again.", ["email", "password"]);
    } else if (error.code === "auth/user-not-found") {
      notify("No account found with this email.", ["email"]);
    } else {
      notify(friendlyError(error));
    }
  }
}));

// Enter key submits the form
submitOnEnter(loginBtn);
