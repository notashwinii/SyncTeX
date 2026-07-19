'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { authApi } from '@/lib/api/endpoints/auth';
import { extractErrorMessage } from '@/lib/api/client';
import styles from './AccountAction.module.css';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.message);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <Link className={styles.logo} href="/">
        <Image src="/SyncTex.png" alt="SyncTeX" width={180} height={38} />
      </Link>
      <section className={styles.panel}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter the email address associated with your account.
        </p>
        <form className={styles.form} onSubmit={submit}>
          {message && (
            <div className={`${styles.message} ${styles.success}`} aria-live="polite">
              {message}
            </div>
          )}
          {error && (
            <div className={`${styles.message} ${styles.error}`} role="alert">
              {error}
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="recovery-email">
              Email address
            </label>
            <input
              className={styles.input}
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <button className={styles.button} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
