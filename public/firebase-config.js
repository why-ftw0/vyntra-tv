// Firebase configuration for Vyntra.tv
const firebaseConfig = {
    apiKey: "AIzaSyDpl6gthEkGvKkHOUJhNrh7_L8VL_ll1ls",
    authDomain: "yuntra-tv.firebaseapp.com",
    projectId: "yuntra-tv",
    storageBucket: "yuntra-tv.firebasestorage.app",
    messagingSenderId: "841787490492",
    appId: "1:841787490492:web:127a9d1a5bfff5cd8e756b",
    measurementId: "G-K55K1D1HJ8S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Admin emails (premium forever)
const ADMIN_EMAILS = ['chapanzisagir@gmail.com'];