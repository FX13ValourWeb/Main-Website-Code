import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ✅ UPDATED PROJECT CONFIG
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Check Authentication State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Logged in as:", user.email);
    await loadExecutiveData(user.email);
  } else {
    window.location.href = "Signin.html";
  }
});

// 2. Fetch Data by Email Query
async function loadExecutiveData(email) {
  try {
    const UserRef = collection(db, "Users");
    const q = query(UserRef, where("email", "==", email.trim()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      updateUI(data);
    } else {
      document.getElementById("fullNameDisplay").innerHTML =
        "<span>Profile Not Found</span>";
    }
  } catch (error) {
    console.error("Firestore Error:", error);
  }
}

// 3. Update the Dashboard UI
function updateUI(data) {
  // --- Name Display ---
  if (data.fullName) {
    const parts = data.fullName.split(" ");
    const first = parts[0];
    const rest = parts.slice(1).join(" ");
    document.getElementById("fullNameDisplay").innerHTML =
      `${first} <span>${rest}</span>`;
  }

  // --- Academic & Contact Info ---
  document.getElementById("displayClass").textContent =
    data.executiveClass || "N/A";
  document.getElementById("displaySection").textContent = data.section || "N/A";
  document.getElementById("displayGender").textContent = data.gender || "N/A";
  document.getElementById("displayYear").textContent =
    data.joiningYear || "N/A";
  document.getElementById("displayEmail").textContent = data.email || "N/A";
  document.getElementById("displayPhone").textContent =
    data.phoneNumber || "N/A";
  document.getElementById("displayMemberReg").textContent =
    data.registrationNumber || "N/A";

  // UI change based on executive or participant role

  const contributionsAndAttendanceUI = document.getElementById(
    "contributionsAndAttendance",
  );

  if (data.role === "participant") {
    contributionsAndAttendanceUI.style.display = "none";
  } else {
    contributionsAndAttendanceUI.style.display = "grid"; // its grid in CSS
  }

  // Certificate Management System

  //Text Invisibility
  const noAchievementsList = document.getElementById("noAchievementsList");

  // PathFinders 2
  const pathFinder2ValidMemberIds = ["", "", "VALOUR-1", ""];

  const pathFinders2CertificateView = document.getElementById(
    "pathFinders2CertificateView",
  );
  const pathFinders2Container = document.getElementById(
    "pathFinders2Container",
  );
  const memberRegNumber = data.registrationNumber;

  console.log(`Member Registration Number: ${memberRegNumber}`);

  // The Check:
  if (pathFinder2ValidMemberIds.includes(memberRegNumber)) {
    //invisibling the empty msg
    noAchievementsList.style.display = "none";

    // Show the section
    pathFinders2Container.style.display = "block";

    pathFinders2CertificateView.onclick = function () {
      let rawUrl = data.achievements.PathFinders2;

      if (rawUrl) {
        window.location.href = rawUrl;
      } else {
        console.log("not found");
      }
    };
  } else {
    console.log("Access Denied: ID not in registry for PathFinders 2 Award.");
    pathFinders2Container.style.display = "none";
  }

  //-------------------------------------------------------------

  // --- Role and Tags ---
  if (data.specialPosition) {
    const sPosition = document.getElementById("positionTag");
    sPosition.textContent = data.specialPosition;
    sPosition.style.display = "inline-block";
  }
  document.getElementById("roleTag").textContent = data.role;
  if (data.specialTag1) {
    const sTag = document.getElementById("specialTag1");
    sTag.textContent = data.specialTag1;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag2) {
    const sTag = document.getElementById("specialTag2");
    sTag.textContent = data.specialTag2;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag3) {
    const sTag = document.getElementById("specialTag3");
    sTag.textContent = data.specialTag3;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag4) {
    const sTag = document.getElementById("specialTag4");
    sTag.textContent = data.specialTag4;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag5) {
    const sTag = document.getElementById("specialTag5");
    sTag.textContent = data.specialTag5;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag6) {
    const sTag = document.getElementById("specialTag6");
    sTag.textContent = data.specialTag6;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag7) {
    const sTag = document.getElementById("specialTag7");
    sTag.textContent = data.specialTag7;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag8) {
    const sTag = document.getElementById("specialTag8");
    sTag.textContent = data.specialTag8;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag9) {
    const sTag = document.getElementById("specialTag9");
    sTag.textContent = data.specialTag9;
    sTag.style.display = "inline-block";
  }
  if (data.specialTag10) {
    const sTag = document.getElementById("specialTag10");
    sTag.textContent = data.specialTag10;
    sTag.style.display = "inline-block";
  }

  // --- Contributions Logic (INSIDE updateUI) ---
  const contributionsContainer = document.getElementById("contributionsList");
  if (data.contributions && Object.keys(data.contributions).length > 0) {
    contributionsContainer.innerHTML = "";
    Object.entries(data.contributions).forEach(([projectName, details]) => {
      const item = document.createElement("div");
      item.className = "data-item";
      item.innerHTML = `
                <p class="item-title"><strong>${projectName}</strong></p>
                <p class="item-detail">${details}</p>
            `;
      contributionsContainer.appendChild(item);
    });
  }

  // --- Attendance Logic (INSIDE updateUI) ---
  const attendanceContainer = document.getElementById("attendanceList");
  if (data.attendance && Object.keys(data.attendance).length > 0) {
    attendanceContainer.innerHTML = "";

    const sortedDates = Object.keys(data.attendance).sort().reverse();

    sortedDates.forEach((date) => {
      const status = data.attendance[date];
      const item = document.createElement("div");
      item.className = "attendance-row";
      item.innerHTML = `
                <span class="date-label">${date}</span>
                <span class="status-badge ${status.toLowerCase()}">${status}</span>
            `;
      attendanceContainer.appendChild(item);
    });
  }
} // <--- This closing brace must be AFTER all the logic that uses "data"

// 4. Button Actions
document.getElementById("website").addEventListener("click", () => {
  window.location.href = "/index.html";
});

document.getElementById("editProfile").addEventListener("click", () => {
  window.alert(
    "Profile editing is currently being integrated with the database. Check back soon!",
  );
});

// 5. Log Out Logic
const logOutBtn = document.getElementById("logOut");

if (logOutBtn) {
  logOutBtn.addEventListener("click", () => {
    // Confirmation popup
    const confirmLogout = confirm(
      "Are you sure you want to log out of the FX-13 Valour Dashboard?",
    );

    if (confirmLogout) {
      signOut(auth)
        .then(() => {
          console.log("Logged out successfully.");
          // Redirect back to the home page
          // Use ../ if this file is in a /pages folder
          window.location.href = "../index.html";
        })
        .catch((error) => {
          console.error("Logout Error:", error);
          alert("Error: " + error.message);
        });
    }
  });
}

// (The star background now comes from the shared /particles.js)
