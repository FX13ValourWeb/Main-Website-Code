import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  runTransaction 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import { withLoading, submitOnEnter, notify, friendlyError, checkRequired } from "./auth-ui.js?v=20261104";
// MOVE THIS UP HERE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyC0fYgeJM4CDQCgFCv9jK1lObbtSQ8VyqA",
    authDomain: "fx-13-valour-robotics-club-web.firebaseapp.com",
    projectId: "fx-13-valour-robotics-club-web",
    storageBucket: "fx-13-valour-robotics-club-web.firebasestorage.app",
    messagingSenderId: "720455152690",
    appId: "1:720455152690:web:d19e18da770a2eb970782b",
    measurementId: "G-GCS4EENQ9R"
  };
// NOW INITIALIZE
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ... rest of your listener code

// 1. Add 'async' here so we can use 'await' inside
const continueBtn = document.getElementById('continueBtn')
const signUpScreen = document.getElementById('signUpScreen')
const successfullAccountCreation = document.getElementById('successfullAccountCreation')

continueBtn.addEventListener('click', withLoading(continueBtn, async () => {

     const email = document.getElementById('email').value.trim()
     const password = document.getElementById('password').value
     const confirmPassword = document.getElementById('confirmPassword').value
     const fullName = document.getElementById('fullName').value
     const phoneNumber = document.getElementById('phoneNumber').value
     const executiveClass = document.getElementById('class').value
     const gender = document.getElementById('gender').value
     const section = document.getElementById('section').value.toLowerCase().trim()
     const joiningYear = document.getElementById('joiningYear').value

     if (!checkRequired(["email", "fullName", "phoneNumber", "password", "confirmPassword"])) return;

     if (!email) {
        notify("Please enter an email address first.", ["email"]);
        return; // This prevents the code from running the 'doc()' function with 1 segment
    }

     if(password === confirmPassword){
          try {
               const executiveRef = doc(db , 'authorized_emails' , email)
               const executiveSnap = await getDoc(executiveRef)

               if(executiveSnap.exists()){
                    
                    const executiveCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const executive = executiveCredential.user;

                    //Registration Number Generation Code
                    const generatedRegistrationNumber = await runTransaction(db , async (transaction) =>{
                         const counterRef = doc(db, 'metadata' , 'counters')
                         const counterSnap = await transaction.get(counterRef)
                         const currentVal = counterSnap.data().memberRegistrationNumber;
                         const newRegNo = Number(currentVal) + 1
                         transaction.update(counterRef, { memberRegistrationNumber: newRegNo });
                         return newRegNo
                    })

                    // 3. Fixed the parentheses here: doc(db, 'coll', id), { data }
                    await setDoc(doc(db , 'Users' , `${fullName} Cl: ${executiveClass}`), {
                         email : email,
                         role : "executive",
                         fullName : fullName,
                         phoneNumber : phoneNumber,
                         executiveClass : executiveClass,
                         section: section,
                         gender: gender,
                         joiningYear: joiningYear,
                         registrationNumber: `VALOUR-${generatedRegistrationNumber}`,
                         contributions: {},
                         attendance: {},
                         achievements: {},
                         specialPosition: "",
                         specialTag1: "",
                         specialTag2: "",
                         specialTag3: "",
                         specialTag4: "",
                         specialTag5: "",
                         specialTag6: "",
                         specialTag7: "",
                         specialTag8: "",
                         specialTag9: "",
                         specialTag10: "",
                    });
                    
                    signUpScreen.style.display = 'none'
                    successfullAccountCreation.style.display = 'flex'
                    
               } else {
                    notify("This email is not authorized as an Executive.", ["email"]);
               }

          } catch (error) {
               console.error(error);
               notify(friendlyError(error));
          }
     } else {
          notify("Your password and confirm password do not match.", ["password", "confirmPassword"]);
     }
}));

// Enter key submits the form
submitOnEnter(continueBtn);
