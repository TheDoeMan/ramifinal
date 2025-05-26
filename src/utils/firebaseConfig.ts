// Firebase Configuration
// To set up Firebase for your project:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing one
// 3. Enable Realtime Database
// 4. Get your config from Project Settings > General > Your apps
// 5. Replace the values below with your actual Firebase config

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  // Replace these with your actual Firebase project config
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://your-project-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Add connection state monitoring for debugging
if (typeof window !== 'undefined') {
  import('firebase/database').then(({ connectDatabaseEmulator, goOffline, goOnline }) => {
    // Add connection logging for debugging
    console.log('Firebase initialized for project:', firebaseConfig.projectId);
  });
}