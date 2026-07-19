"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/api/client";
import styles from "./LoginForm.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login, isLoginLoading, loginError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login({ email, password });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Welcome Back</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        {(error || loginError) && (
          <div style={{ 
            padding: '0.875rem 1rem', 
            borderRadius: '10px', 
            fontSize: '0.9rem', 
            fontWeight: '500', 
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            marginBottom: '0.5rem'
          }}>
            {error || extractErrorMessage(loginError)}
          </div>
        )}

        <div>
          <label className={styles.label}>Email Address</label>
          <input 
            type="email" 
            placeholder="john@example.com" 
            required 
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoginLoading}
          />
        </div>

        <div>
          <div className={styles.labelRow}>
            <label className={styles.label}>Password</label>
            <Link className={styles.forgotLink} href="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoginLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.showBtn}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoginLoading}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />} 
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className={styles.loginBtn}
          disabled={isLoginLoading}
        >
          {isLoginLoading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className={styles.footer}>
        New user? <Link href="/signup">Create new account</Link>
      </p>
    </div>
  );
}
