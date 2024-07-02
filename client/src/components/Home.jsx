import React, { useState } from 'react';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaEnvelope } from 'react-icons/fa';

const Home = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [error, setError] = useState(null); // State to hold error messages
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
        setError('Google sign-in failed. Please try again.');
      });
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, loginEmail, loginPassword)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User logged in:', user);
        navigate('/projects');
      })
      .catch((error) => {
        console.error('Error signing in:', error.message);
        setError('Invalid email or password. Please check your credentials.');
      });
  };

  const handleRegistration = () => {
    createUserWithEmailAndPassword(auth, registerEmail, registerPassword)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User registered:', user);
        navigate('/projects');
      })
      .catch((error) => {
        let errorMessage = '';
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters long.';
            break;
          default:
            errorMessage = 'Registration failed. Please try again later.';
        }
        console.error('Error registering:', errorMessage);
        setError(errorMessage);
      });
  };

  return (
    <div className="max-h-screen overflow-auto">
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

        <div className="form-box mt-8 bg-gray-300 p-8 rounded-9xl">
          {isLogin ? (
            <div className="login-container">
              <div className="text-center">
                <span>Don't have an account? <a href="#" onClick={() => setIsLogin(false)}><u>Sign Up</u></a></span>
                <h2 className="text-teal-600 text-2xl font-semibold mt-4">Login</h2>
              </div>
              <div className="mt-6 relative">
                <input
                  type="text"
                  id="login-email"
                  className="input-field mt-2"
                  placeholder="Username or Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <FaUser className="absolute left-3 top-4 text-gray-600" />
              </div>
              <div className="mt-4 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  className="input-field mt-2"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <FaLock className="absolute left-3 top-4 text-gray-600" />
                <span className="toggle-password absolute right-3 top-4 cursor-pointer" onClick={togglePasswordVisibility}>
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
                <span>Have an account? <a href="#" onClick={() => setIsLogin(true)}><u>Login</u></a></span>
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
                <input
                  type="text"
                  id="register-email"
                  className="input-field mt-2"
                  placeholder="Email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <FaEnvelope className="absolute left-3 top-4 text-gray-600" />
              </div>
              <div className="mt-4 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  className="input-field mt-2"
                  placeholder="Password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
                <FaLock className="absolute left-3 top-4 text-gray-600" />
                <span className="toggle-password absolute right-3 top-4 cursor-pointer" onClick={togglePasswordVisibility}>
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
    </div>
  );
};

export default Home;
