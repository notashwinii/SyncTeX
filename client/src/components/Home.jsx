import React, { useState } from 'react';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaEnvelope } from 'react-icons/fa';
import './home.css';

const Home = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        console.log("User signed in: ", user);
        navigate('/projects');
      })
      .catch((error) => {
        console.error("Error during Google sign-in: ", error);
      });
  };

  const togglePasswordVisibility = (inputId) => {
    setShowPassword((prevState) => !prevState);
    const passwordInput = document.getElementById(inputId);
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
    } else {
      passwordInput.type = "password";
    }
  };

  const handleLogin = () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User logged in:', user);
        navigate('/projects');
      })
      .catch((error) => {
        console.error('Error signing in:', error.message);
      });
  };

  const handleRegistration = () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User registered:', user);
      })
      .catch((error) => {
        console.error('Error registering:', error.message);
      });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white">
      <header className="w-full flex items-center justify-between px-12 py-4 h-19 relative"></header>

      <nav className="fixed top-0 left-0 right-0 w-full flex justify-between items-center h-20 px-5 bg-[#A3D0D6] shadow-lg z-50">
        <div className="nav-logo">
          <img src={"/assets/synctex.svg"} alt="Logo" className="w-36 h-auto" />
        </div>

        <div className="hidden md:flex space-x-6">
          <button
            className={`btn ${isLogin ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'} px-4 py-2 rounded-full hover:bg-teal-700 hover:text-white transition duration-300`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button
            className={`btn ${isLogin ? 'bg-white text-teal-600' : 'bg-teal-600 text-white'} px-4 py-2 rounded-full hover:bg-teal-700 hover:text-white transition duration-300`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>
        <div className="md:hidden">
          <i className="bx bx-menu text-2xl text-white"></i>
        </div>
      </nav>

      <div className="flex flex-col items-center mt-20">
        <h1 className="text-4xl font-bold text-black">Welcome to SyncTex</h1>
        <p className="text-xl text-gray-900 italic mt-2">Where LaTeX meets collaboration</p>
      </div>

      <div className="form-box mt-8 bg-gray-300 p-8 rounded-2xl">
        {isLogin ? (
          <div className="login-container">
            <div className="text-center">
              <span>Don't have an account? <a href="#" onClick={() => setIsLogin(false)}><u>Sign Up</u></a></span>
              <h2 className="text-teal-600 text-2xl font-semibold mt-4">Login</h2>
            </div>
            <div className="mt-6 relative">
              <input type="text" id="login-email" className="input-field mt-2" placeholder="Username or Email" />
              <FaUser className="absolute left-3 top-4 text-gray-600" />
            </div>
            <div className="mt-4 relative">
              <input type="password" id="login-password" className="input-field mt-2" placeholder="Password" />
              <FaLock className="absolute left-3 top-4 text-gray-600" />
              <span className="toggle-password absolute right-3 top-4 cursor-pointer" onClick={() => togglePasswordVisibility('login-password')}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
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
            <div className="text-center">
              <span>Have an account? <a href="#" onClick={() => setIsLogin(true)}>Login</a></span>
              <h2 className="text-teal-600 text-2xl font-semibold mt-4">Sign Up</h2>
            </div>
            <div className="flex space-x-4 mt-6">
              <div className="relative">
                <input type="text" id="first-name" className="input-field mt-2" placeholder="Firstname" />
                <FaUser className="absolute left-3 top-4 text-gray-600" />
              </div>
              <div className="relative">
                <input type="text" id="last-name" className="input-field mt-2" placeholder="Lastname" />
                <FaUser className="absolute left-3 top-4 text-gray-600" />
              </div>
            </div>
            <div className="mt-4 relative">
              <input type="text" id="register-email" className="input-field mt-2" placeholder="Email" />
              <FaEnvelope className="absolute left-3 top-4 text-gray-600" />
            </div>
            <div className="mt-4 relative">
              <input type="password" id="register-password" className="input-field mt-2" placeholder="Password" />
              <FaLock className="absolute left-3 top-4 text-gray-600" />
              <span className="toggle-password absolute right-3 top-4 cursor-pointer" onClick={() => togglePasswordVisibility('register-password')}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <div className="mt-4">
              <button type="button" className="btn submit w-full" onClick={handleRegistration}>Sign Up</button>
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
        )}
      </div>
    </div>
  );
};

export default Home;
