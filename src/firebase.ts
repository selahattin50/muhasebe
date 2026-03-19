import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase yapılandırması - OnMuasbe projesi
const firebaseConfig = {
  apiKey: "AIzaSyBg0W2RoMi-XtqTOoBpbIpZV1uFM5kXf78",
  authDomain: "on-muhasebe-sistemi.firebaseapp.com",
  projectId: "on-muhasebe-sistemi",
  storageBucket: "on-muhasebe-sistemi.firebasestorage.app",
  messagingSenderId: "936426996224",
  appId: "1:936426996224:web:e9dac001b1b20964b38ee5"
};

let app;
let db: any;
let auth: any;

try {
  // Firebase'i başlat
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Firestore ve Auth servislerini dışa aktar
export { db, auth, firebaseConfig };
export default app;
