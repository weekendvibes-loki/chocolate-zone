'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const inputClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = !email.trim()
    ? 'Email is required.'
    : EMAIL_RE.test(email.trim())
      ? undefined
      : 'Enter a valid email address.';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (emailError) return;
    setStatus('loading');
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setStatus('sent');
        return;
      }
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Enter your admin email and we&apos;ll send you a reset link.
        </p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-xl border border-neutral-800 p-4 text-sm">
            <p className="font-medium text-emerald-400">Check your inbox.</p>
            <p className="mt-1 text-neutral-400">
              If an account exists for <span className="font-semibold">{email}</span>, a
              password reset link is on its way. It expires in a few minutes.
            </p>
            <Link
              href="/admin/login"
              className="mt-3 inline-block text-neutral-300 underline underline-offset-2 hover:text-white"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="forgot-email" className="mb-1 block text-sm text-neutral-400">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="you@shop.com"
                aria-invalid={touched && Boolean(emailError)}
                className={inputClass}
              />
              {touched && emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
            </div>

            {status === 'error' && (
              <p role="alert" className="text-sm text-red-400">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm">
              <Link
                href="/admin/login"
                className="text-neutral-400 transition-colors hover:text-white"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
