import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, push, set, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";


const firebaseConfig = {
    apiKey: "AIzaSyCkRs-4YJk27U8ugfIw99k3_dv0OIWvQ-4",
    authDomain: "synctex-53952.firebaseapp.com",
    databaseURL: "https://synctex-53952-default-rtdb.firebaseio.com",
    projectId: "synctex-53952",
    storageBucket: "synctex-53952.appspot.com",
    messagingSenderId: "282257968594",
    appId: "1:282257968594:web:de32fc03faabb353cb0c0b"
};

// Initializing Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);


var logInForm = document.getElementById('login-form');
console.log("logInForm: ", logInForm);
logInForm.addEventListener('submit', function(event) {
    event.preventDefault();
    handleLogIn();
});

function handleLogIn() {
    debugger;
    var signInEmail = getElementVal("login-email");
    var signInPassword = getElementVal("login-password");

    var errorMessageLogin = validateSignInForm(signInEmail, signInPassword);
    if (errorMessageLogin) {
        displayErrorLogin(errorMessageLogin);
    } else {
        signInUser(signInEmail, signInPassword);
    }
}


function submitForm(e) {
    e.preventDefault();

    var firstName = getElementVal("first-name");
    var lastName = getElementVal("last-name");
    var registerEmail = getElementVal("register-email");
    var registerPassword = getElementVal("register-password");

    var errorMessage = validateForm(firstName, lastName, registerEmail, registerPassword);
    if (errorMessage) {
        displayError(errorMessage);
    } else {
        checkEmailAndRegister(firstName, lastName, registerEmail, registerPassword);
    }
}

const saveData = (firstName, lastName, registerEmail) => {
    var newAuthForm = push(ref(database, 'auth-form'));

    set(newAuthForm, {
        firstName: firstName,
        lastName: lastName,
        registerEmail: registerEmail
    }, (error) => {
        if (error) {
            console.error("Data could not be saved." + error);
            displayError("Data could not be saved.");
        } else {
            console.log("Data saved successfully.");
        }
    });
};

const getElementVal = (id) => {
    return document.getElementById(id).value;
};

const validateForm = (firstName, lastName, registerEmail, registerPassword) => {
    if (!firstName || !lastName || !registerEmail || !registerPassword) {
        return "All fields are required.";
    }

    if (!validateEmail(registerEmail)) {
        return "Invalid email format.";
    }

    if (!validatePassword(registerPassword)) {
        return "Password must be at least 8 characters long and include a mix of upper and lower case letters, numbers, and special characters.";
    }

    return null;
};

const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
};

const displayError = (message) => {
    const errorMessageElement = document.querySelector('.error-message');
    errorMessageElement.innerText = message;
    errorMessageElement.style.display = 'block';

    setTimeout(() => {
        errorMessageElement.style.display = 'none';
    }, 5000);
};

const displaySuccessMessage = (message) => {
    const successMessageElement = document.querySelector('.success-message');
    successMessageElement.innerText = message;
    successMessageElement.style.display = 'block';

    setTimeout(() => {
        successMessageElement.style.display = 'none';
    }, 3000);
};

const checkEmailAndRegister = (firstName, lastName, registerEmail, registerPassword) => {
    createUserWithEmailAndPassword(auth, registerEmail, registerPassword)
        .then((userCredential) => {
            // User registered successfully
            saveData(firstName, lastName, registerEmail);

            displaySuccessMessage("Registration successful!");

            // Reset the form
            document.getElementById("auth-form").reset();
        })
        .catch((error) => {
            var errorCode = error.code;
            var errorMessage = error.message;

            if (errorCode === 'auth/email-already-in-use') {
                displayError('The email address is already in use by another account.');
            } else if (errorCode === 'auth/invalid-email') {
                displayError('The email address is not valid.');
            } else if (errorCode === 'auth/operation-not-allowed') {
                displayError('Email/password accounts are not enabled. Please enable them in the Firebase Console.');
            } else if (errorCode === 'auth/weak-password') {
                displayError('The password is too weak.');
            } else {
                displayError(errorMessage);
            }
        });
};

function signInUser(email, password) {
    debugger;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {

            // successfully signed-in
            var user = userCredential.user;
            console.log("User signed in:", user.uid);

            // Updating timestamp
            updateSignInData(user.uid);

            // displaySuccessMessage("You have been logged in.");

            window.location.href = '/landing page/index.html';
        })
        .catch((error) => {
            var errorCode = error.code;
            var errorMessageLogin;
            if (errorCode === 'auth/user-not-found') {
                errorMessageLogin = "Account doesn't exist.";
            } else if (errorCode === 'auth/wrong-password') {
                errorMessageLogin = "Incorrect email or password.";
            } else if (errorCode === 'auth/invalid-email') {
                errorMessageLogin = "Invalid email format.";
            } else {
                errorMessageLogin = error.message;
            }
            displayErrorLogin(errorMessageLogin);
        });
}

function validateSignInForm(email, password) {
    if (!email || !password) {
        return "Both email and password are required.";
    }
    if (!validateEmail(email)) {
        return "Invalid email format.";
    }
    return null;
}

function displayErrorLogin(messageLogin) {
    const errorMessageLoginElement = document.querySelector('.error-message-login');
    errorMessageLoginElement.innerText = messageLogin;
    errorMessageLoginElement.style.display = 'block';

    setTimeout(() => {
        errorMessageLoginElement.style.display = 'none';
    }, 3000);
}

function updateSignInData(uid) {
    var userRef = ref(database, 'users/' + uid);
    update(userRef, {
        lastSignInTime: serverTimestamp()
    });
}

function googleSignIn(e) {
    e.preventDefault();

    var provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
        .then((result) => {
            var user = result.user;
            console.log("User signed in: ", user);

            displaySuccessMessage("Google sign-in successful!");

            window.location.href = '/landing page/index.html';

        })
        .catch((error) => {
            console.error("Error during Google sign-in: ", error);
            displayError("Error during Google sign-in: " + error.message);
        });
}