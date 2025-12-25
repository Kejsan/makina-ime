import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyC5Kt2Fp35GIJLq-bKuEMV7m4HnHwGQXiA",
  authDomain: "makina-ime-2025.firebaseapp.com",
  projectId: "makina-ime-2025",
  storageBucket: "makina-ime-2025.firebasestorage.app",
  messagingSenderId: "453241224558",
  appId: "1:453241224558:web:a661848e9dc954d9dc957f",
  measurementId: "G-WLP78NC8D9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
