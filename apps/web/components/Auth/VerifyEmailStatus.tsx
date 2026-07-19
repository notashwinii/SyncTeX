'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints/auth';
import { extractErrorMessage } from '@/lib/api/client';
import styles from './AccountAction.module.css';

export default function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const requested = useRef(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(token ? 'Verifying your email...' : '');
  const [error, setError] = useState(token ? '' : 'This verification link is incomplete.');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    authApi
      .confirmVerification(token)
      .then((response) => setMessage(response.message))
      .catch((requestError) => {
        setMessage('');
        setError(extractErrorMessage(requestError));
      });
  }, [token]);

  const resend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResendMessage('');
    setResendError('');
    setIsSubmitting(true);

    try {
      const response = await authApi.resendVerification({ email });
      setResendMessage(response.message);
    } catch (requestError) {
      setResendError(extractErrorMessage(requestError));
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
        <h1 className={styles.title}>Email verification</h1>
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
        {error && (
          <form className={styles.form} onSubmit={resend}>
            {resendMessage && (
              <div className={`${styles.message} ${styles.success}`} aria-live="polite">
                {resendMessage}
              </div>
            )}
            {resendError && (
              <div className={`${styles.message} ${styles.error}`} role="alert">
                {resendError}
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="verification-email">
                Email address
              </label>
              <input
                className={styles.input}
                id="verification-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <button className={styles.button} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send a new link'}
            </button>
          </form>
        )}
        <p className={styles.footer}>
          <Link href="/login">Continue to sign in</Link>
        </p>
      </section>
    </main>
  );
}
