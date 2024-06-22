// firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCkRs-4YJk27U8ugfIw99k3_dv0OIWvQ-4",
    authDomain: "synctex-53952.firebaseapp.com",
    databaseURL: "https://synctex-53952-default-rtdb.firebaseio.com",
    projectId: "synctex-53952",
    storageBucket: "synctex-53952.appspot.com",
    messagingSenderId: "282257968594",
    appId: "1:282257968594:web:de32fc03faabb353cb0c0b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
