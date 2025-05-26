
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBe-hc61Gf0SI5n09hmTLaE3Z0qLWNv-Co",
  authDomain: "ramifinal-19c6f.firebaseapp.com",
  databaseURL: "https://ramifinal-19c6f-default-rtdb.firebaseio.com",
  projectId: "ramifinal-19c6f",
  storageBucket: "ramifinal-19c6f.firebasestorage.app",
  messagingSenderId: "529672441666",
  appId: "1:529672441666:web:885e55d4997b8ec42102db"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Add connection state monitoring for debugging
if (typeof window !== 'undefined') {
  console.log('Firebase initialized for project:', firebaseConfig.projectId);
}
