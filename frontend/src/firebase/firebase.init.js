import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyA350EJ1nsLh7nTIkwgaPMony20OFT_JSw",
  authDomain: "financeflow-user.firebaseapp.com",
  projectId: "financeflow-user",
  storageBucket: "financeflow-user.firebasestorage.app",
  messagingSenderId: "977292837300",
  appId: "1:977292837300:web:73e3e6644ca4194561b2e1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export default auth;