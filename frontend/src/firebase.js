import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCwrs38Xda1lvwXXb7xHM2R_7_DJc52PQg",
  authDomain: "deadline-project-f400e.firebaseapp.com",
  projectId: "deadline-project-f400e",
  storageBucket: "deadline-project-f400e.firebasestorage.app",
  messagingSenderId: "75554630068",
  appId: "1:75554630068:web:d6a22e3654e3fcd9842ae1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
