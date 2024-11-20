// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-analytics.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnhW21D3rzXLYlE04_h9-zlsV5fB4fxfk",
  authDomain: "autobillingapp-88ec8.firebaseapp.com",
  projectId: "autobillingapp-88ec8",
  storageBucket: "autobillingapp-88ec8.appspot.com",
  messagingSenderId: "419787787499",
  appId: "1:419787787499:web:a9b19f0639e4e8e06bc2ae",
  measurementId: "G-5CTRQBY0J3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics
const analytics = getAnalytics(app);

// Export Firestore database for use in other parts of your project
export { db };

// Log initialization for debugging
console.log("Firebase and Firestore initialized!");
console.log("Firebase App Initialized: ", app);