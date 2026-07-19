'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints/auth';
import { extractErrorMessage } from '@/lib/api/client';
import styles from './AccountAction.module.css';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(token ? '' : 'This reset link is incomplete.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.resetPassword({ token, password });
      setMessage(response.message);
      setPassword('');
      setConfirmPassword('');
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
        <h1 className={styles.title}>Choose a new password</h1>
        <p className={styles.subtitle}>
          Your other signed-in sessions will be closed after the reset.
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
            <label className={styles.label} htmlFor="new-password">
              New password
            </label>
            <input
              className={styles.input}
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting || !token || Boolean(message)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              className={styles.input}
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting || !token || Boolean(message)}
              required
            />
          </div>
          <button
            className={styles.button}
            type="submit"
            disabled={isSubmitting || !token || Boolean(message)}
          >
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
