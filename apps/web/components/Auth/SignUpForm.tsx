"use client";

import React, { useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/api/client";
import styles from '../../app/signup/signup.module.css';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Link from 'next/link';

const SignUpForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, isRegisterLoading, registerError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await register({ email, username, password });
      setSuccess("Account created successfully! Redirecting to login...");
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Create your account</h2>
        <p className={styles.formSubtitle}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {success && (
          <div className={`${styles.message} ${styles.success}`}>
            {success}
          </div>
        )}
        {(error || registerError) && (
          <div className={`${styles.message} ${styles.error}`}>
            {error || extractErrorMessage(registerError)}
          </div>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="username" className={styles.label}>Username</label>
          <input
            id="username"
            type="text"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            required
            disabled={isRegisterLoading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
            disabled={isRegisterLoading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${styles.input} ${styles.passwordInput}`}
              required
              disabled={isRegisterLoading}
            />
            <button
              type="button"
              className={styles.showBtn}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isRegisterLoading}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />} 
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className={styles.submitBtn}
          disabled={isRegisterLoading}
        >
          {isRegisterLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className={styles.footer}>
        By signing up, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  );
};

export default SignUpForm;