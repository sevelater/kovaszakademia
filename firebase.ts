import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAoOaTe-LmN91oF3YINYWfntXjy_xVMUS0",
  authDomain: "kovaszakademia.firebaseapp.com",
  projectId: "kovaszakademia",
  storageBucket: "kovaszakademia.firebasestorage.app",
  messagingSenderId: "239696862556",
  appId: "1:239696862556:web:879dd3b88d364fdd5ab599",
  measurementId: "G-2D9EZ2TBQ3",
};

// Inicializálja a Firebase alkalmazást
const app = initializeApp(firebaseConfig);

// Inicializálja a Firestore-t
const db = getFirestore(app);
const auth = getAuth(app);

export const storage = getStorage(app);

export { db, auth };
