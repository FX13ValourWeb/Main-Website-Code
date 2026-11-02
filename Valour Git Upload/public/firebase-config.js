  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAjp_E7YQOOsaIRG6ccfE7LLouqoJVEz20",
    authDomain: "fx-13-valour-robotics-cl-4360c.firebaseapp.com",
    projectId: "fx-13-valour-robotics-cl-4360c",
    storageBucket: "fx-13-valour-robotics-cl-4360c.firebasestorage.app",
    messagingSenderId: "437598149080",
    appId: "1:437598149080:web:ade6f60196dc6c91b13aad",
    measurementId: "G-SRVGK18RW1"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);