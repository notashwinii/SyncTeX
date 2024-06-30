import React, { useState } from 'react';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './home.css';

const Home = () => {
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate(); // Access the navigate function

    const googleSignIn = () => {
        const provider = new GoogleAuthProvider();

        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;
                console.log("User signed in: ", user);

                // Redirect to projects page after successful sign-in
                navigate('/projects');
            })
            .catch((error) => {
                console.error("Error during Google sign-in: ", error);
                // Handle errors, e.g., display error message
            });
    };

    const togglePasswordVisibility = (inputId) => {
        const passwordInput = document.getElementById(inputId);
        const icon = passwordInput.nextElementSibling.querySelector('i');

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.classList.remove('bx-hide');
            icon.classList.add('bx-show');
        } else {
            passwordInput.type = "password";
            icon.classList.remove('bx-show');
            icon.classList.add('bx-hide');
        }
    };

    const handleLogin = () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
    
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in
                const user = userCredential.user;
                console.log('User logged in:', user);
    
                // Redirect or perform other actions upon successful login
                navigate('/projects');
            })
            .catch((error) => {
                console.error('Error signing in:', error.message);
                // Display error message to the user, e.g., set state for error message display
            });
    };
    

    const handleRegistration = () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
    
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed up
                const user = userCredential.user;
                console.log('User registered:', user);
    
                // Display success message or handle next steps after registration
                // For example, you could navigate to a different page or display a success message
            })
            .catch((error) => {
                console.error('Error registering:', error.message);
                // Display error message to the user, e.g., set state for error message display
            });
    };
    
 

    return (
        <div className="min-h-screen flex flex-col items-center bg-white">
            
            <nav  className="fixed top-0 left-0 right-0 w-full flex justify-between items-center h-20 px-5 bg-light-blue shadow-lg z-50">
                <div className="nav-logo">
                    <img src={"/assets/synctex.svg"} alt="Logo" className="w-36 h-auto" />
                </div>
                
                <div className="hidden md:flex space-x-6">
                    <button className={`btn ${isLogin ?  'bg-white': 'bg-teal-600'}`} onClick={() => setIsLogin(true)}>Sign In</button>
                    <button className={`btn ${isLogin ? 'bg-white' : 'bg-teal-600'}`} onClick={() => setIsLogin(false)}>Sign Up</button>
                </div>
                <div className="md:hidden">
                    <i className="bx bx-menu text-2xl text-white"></i>
                </div>
            </nav>

            <div className="flex flex-col items-center mt-32">
                <h1 className="text-4xl font-bold text-black">Welcome to SyncTex</h1>
                <p className="text-xl text-gray-900 italic mt-2">Where LaTeX meets collaboration</p>
            </div>

            <div className="form-box mt-10 bg-gray-300 p-8 rounded-2xl ">
                {isLogin ? (
                    <div className="login-container">
                        <div className="success-message hidden">You have been logged in.</div>
                        <div className="error-message-login hidden"></div>
                        <div className="text-center">
                            <span>Don't have an account? <a href="#" onClick={() => setIsLogin(false)}>Sign Up</a></span>
                            <h2 className="text-teal-600 text-2xl font-semibold mt-4">Login</h2>
                        </div>
                        <div className="mt-6">
                            <input type="text" id="login-email" className="input-field mt-2" placeholder="Username or Email" />
                            <i className="bx bx-user"></i>
                        </div>
                        <div className="mt-4">
                            <input type="password" id="login-password" className="input-field mt-2" placeholder="Password" />
                            <i className="bx bx-lock-alt"></i>
                            <span className="toggle-password cursor-pointer" onClick={() => togglePasswordVisibility('login-password')}>
                                <i className="bx bx-hide"></i>
                            </span>
                        </div>
                        <div className="mt-4">
                            <button type="button" className="btn login-submit w-full" onClick={handleLogin}>Sign In</button>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center">
                                <input type="checkbox" id="login-check" />
                                <label htmlFor="login-check" className="ml-2 text-black"> Remember Me</label>
                            </div>
                            <div>
                                <label><a href="#" className="text-black">Forgot password?</a></label>
                            </div>
                        </div>
                        <div className="google-container mt-6">
                            <button className="g-sign-in-button w-full" onClick={googleSignIn}>
                                <div className="content-wrapper">
                                    <div className="logo-wrapper">
                                        <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo" />
                                    </div>
                                    <span className="text-container">
                                        <span>Continue with Google</span>
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="register-container">
                        <div className="register-message hidden">Your account has been registered.</div>
                        <div className="error-message hidden"></div>
                        <div className="text-center">
                            <span>Have an account? <a href="#" onClick={() => setIsLogin(true)}>Login</a></span>
                            <h2 className="text-teal-600 text-2xl font-semibold mt-4">Sign Up</h2>
                        </div>
                        <div className="flex space-x-4 mt-6">
                            <div>
                                <input type="text" id="first-name" className="input-field mt-2" placeholder="Firstname" />
                                <i className="bx bx-user"></i>
                            </div>
                            <div>
                                <input type="text" id="last-name" className="input-field mt-2" placeholder="Lastname" />
                                <i className="bx bx-user"></i>
                            </div>
                        </div>
                        <div className="mt-4">
                            <input type="text" id="register-email" className="input-field mt-2" placeholder="Email" />
                            <i className="bx bx-envelope"></i>
                        </div>
                        <div className="mt-4">
                            <input type="password" id="register-password" className="input-field mt-2" placeholder="Password" />
                            <i className="bx bx-lock-alt"></i>
                            <span className="toggle-password cursor-pointer" onClick={() => togglePasswordVisibility('register-password')}>
                                <i className="bx bx-hide"></i>
                            </span>
                        </div>
                        <div className="mt-4">
                            <button type="button" className="btn submit w-full" onClick={handleRegistration}>Sign Up</button>
                        </div>
                        <div className="flex items-center mt-4">
                            <input type="checkbox" id="register-check" />
                            <label htmlFor="register-check" className="ml-2 text-black"> Remember Me</label>
                        </div>
                        <div className="google-container mt-6">
                            <a href="#">
                                <button className="g-sign-in-button w-full">
                                    <div className="content-wrapper">
                                        <div className="logo-wrapper">
                                            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo" />
                                        </div>
                                        <span className="text-container">
                                            <span>Continue with Google</span>
                                        </span>
                                    </div>
                                </button>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
