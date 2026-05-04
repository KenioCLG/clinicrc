// Firebase Config - ClinicRC
const firebaseConfig = {
  apiKey: "AIzaSyCFR9jmFYTuvdDRj9p8AK7rXTRZEbUGIo8",
  authDomain: "clinicrc-8ba64.firebaseapp.com",
  projectId: "clinicrc-8ba64",
  storageBucket: "clinicrc-8ba64.firebasestorage.app",
  messagingSenderId: "325046795760",
  appId: "1:325046795760:web:f5b67f94b13b03f41c3135",
  measurementId: "G-TYFQ5WE761"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Services
const auth = firebase.auth();
const db = firebase.firestore();

// Auth state listener
auth.onAuthStateChanged(user => {
  const path = window.location.pathname;
  const isAppPage = path.includes("app.html");
  const isLoginPage = path === "/" || path.includes("index.html");

  if (user && isLoginPage) {
    window.location.href = "/app.html";
  }
  if (!user && isAppPage) {
    window.location.href = "/";
  }
});
