import React, { useState } from 'react';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaEnvelope } from 'react-icons/fa';

const Home = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setlastName] = useState('');

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#A3D0D6] shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img
            src="/assets/synctex.svg"
            alt="SyncTex Logo"
            className="w-36 h-auto"
          />
          <div className="hidden md:flex space-x-4">
            <button
              onClick={() => setIsLogin(true)}
              className={`px-6 py-2 rounded-full transition-colors duration-300 ${isLogin
                ? 'bg-teal-600 text-white'
                : 'bg-white text-teal-600 hover:bg-teal-50'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`px-6 py-2 rounded-full transition-colors duration-300 ${!isLogin
                ? 'bg-teal-600 text-white'
                : 'bg-white text-teal-600 hover:bg-teal-50'
                }`}
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 flex-grow flex flex-col justify-center items-center pt-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to SyncTex
          </h1>
          <p className="text-xl text-gray-600 italic">
            Where LaTeX meets collaboration
          </p>
        </div>

        <div className="w-full max-w-md bg-gray-100 rounded-xl shadow-lg p-8">
          {isLogin ? (
            <LoginForm
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              handleLogin={handleLogin}
              googleSignIn={googleSignIn}
              togglePasswordVisibility={togglePasswordVisibility}
              showPassword={showPassword}
              error={error}
              setIsLogin={setIsLogin}
            />
          ) : (
            <RegisterForm
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setlastName={setlastName}
              registerEmail={registerEmail}
              setRegisterEmail={setRegisterEmail}
              registerPassword={registerPassword}
              setRegisterPassword={setRegisterPassword}
              handleRegistration={handleRegistration}
              googleSignIn={googleSignIn}
              togglePasswordVisibility={togglePasswordVisibility}
              showPassword={showPassword}
              error={error}
              setIsLogin={setIsLogin}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const LoginForm = ({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  handleLogin,
  googleSignIn,
  togglePasswordVisibility,
  showPassword,
  error,
  setIsLogin
}) => (
  <>
    <div className="text-center mb-6">
      <p className="text-gray-600 mb-2">
        Don't have an account?
        <span
          onClick={() => setIsLogin(false)}
          className="text-teal-600 ml-1 cursor-pointer hover:underline"
        >
          Sign Up
        </span>
      </p>
      <h2 className="text-2xl font-semibold text-teal-600">Login</h2>
    </div>

    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Username or Email"
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
        />
        <FaUser className="absolute left-3 top-3 text-gray-500" />
      </div>

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />
        <FaLock className="absolute left-3 top-3 text-gray-500" />
        <button
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-3 text-gray-500"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      <div className="flex justify-between items-center">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2 text-teal-600 focus:ring-teal-500"
          />
          Remember Me
        </label>
        <a href="#" className="text-teal-600 hover:underline">
          Forgot Password?
        </a>
      </div>

      <button
        onClick={handleLogin}
        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors"
      >
        Sign In
      </button>

      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <button
        onClick={googleSignIn}
        className="w-full flex items-center justify-center border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
      >
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google Logo"
          className="w-6 h-6 mr-2"
        />
        Continue with Google
      </button>

      {error && (
        <div className="text-red-600 text-sm text-center mt-4">
          {error}
        </div>
      )}
    </div>
  </>
);

const RegisterForm = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  handleRegistration,
  googleSignIn,
  togglePasswordVisibility,
  showPassword,
  error,
  setIsLogin
}) => (
  <>
    <div className="text-center mb-6">
      <p className="text-gray-600 mb-2">
        Already have an account?
        <span
          onClick={() => setIsLogin(true)}
          className="text-teal-600 ml-1 cursor-pointer hover:underline"
        >
          Login
        </span>
      </p>
      <h2 className="text-2xl font-semibold text-teal-600">Sign Up</h2>
    </div>

    <div className="space-y-4">
      <div className="flex space-x-4">
        <div className="relative w-1/2">
          <input
            type="text"
            placeholder="First Name"
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <FaUser className="absolute left-3 top-3 text-gray-500" />
        </div>
        <div className="relative w-1/2">
          <input
            type="text"
            placeholder="Last Name"
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <FaUser className="absolute left-3 top-3 text-gray-500" />
        </div>
      </div>

      <div className="relative">
        <input
          type="email"
          placeholder="Email"
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={registerEmail}
          onChange={(e) => setRegisterEmail(e.target.value)}
        />
        <FaEnvelope className="absolute left-3 top-3 text-gray-500" />
      </div>

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={registerPassword}
          onChange={(e) => setRegisterPassword(e.target.value)}
        />
        <FaLock className="absolute left-3 top-3 text-gray-500" />
        <button
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-3 text-gray-500"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      <button
        onClick={handleRegistration}
        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors"
      >
        Sign Up
      </button>

      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <button
        onClick={googleSignIn}
        className="w-full flex items-center justify-center border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
      >
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google Logo"
          className="w-6 h-6 mr-2"
        />
        Continue with Google
      </button>

      {error && (
        <div className="text-red-600 text-sm text-center mt-4">
          {error}
        </div>
      )}
    </div>
  </>
);
export default Home;
