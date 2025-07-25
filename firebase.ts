import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAoOaTe-LmN91oF3YINYWfntXjy_xVMUS0",
  authDomain: "kovaszakademia.firebaseapp.com",
  projectId: "kovaszakademia",
  storageBucket: "kovaszakademia.firebasestorage.app",
  messagingSenderId: "239696862556",
  appId: "1:239696862556:web:879dd3b88d364fdd5ab599",
  measurementId: "G-2D9EZ2TBQ3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };