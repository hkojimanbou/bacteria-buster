import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDv_9o_RKCBvKVo63NVZuVZmcN7ZAwa27c",
  authDomain: "cbt-training-f6ceb.firebaseapp.com",
  projectId: "cbt-training-f6ceb",
  storageBucket: "cbt-training-f6ceb.firebasestorage.app",
  messagingSenderId: "1030285317733",
  appId: "1:1030285317733:web:82bf4bd42a2bdfb722588c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
