'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

const POST_LOGIN_PATH = '/admin';
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function LoginForm({ next = POST_LOGIN_PATH }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    setResetSuccess(new URLSearchParams(window.location.search).get('reset') === 'success');
  }, []);

  const emailError = !email.trim()
    ? 'Email is required.'
    : EMAIL_RE.test(email.trim())
      ? undefined
      : 'Enter a valid email address.';
  const passwordError = !password ? 'Password is required.' : undefined;
  const canSubmit = status !== 'loading' && !emailError && !passwordError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError) return;
    setStatus('loading');
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        window.location.href = next;
        return;
      }
      const body = await res.json().catch(() => null);
      setErrorMessage(body?.error?.message ?? 'Invalid email or password.');
      setStatus('error');
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div>
      {resetSuccess && (
        <p className="mt-6 rounded-xl border border-emerald-700 bg-emerald-950 p-3 text-sm text-emerald-300">
          Password updated successfully. Please sign in with your new password.
        </p>
      )}

      <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm text-neutral-400">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@shop.com"
            aria-invalid={touched.email && Boolean(emailError)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
          />
          {touched.email && emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm text-neutral-400">
              Password
            </label>
            <Link
              href="/admin/forgot-password"
              className="text-sm text-neutral-400 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="••••••••"
              aria-invalid={touched.password && Boolean(passwordError)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 pr-11 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-neutral-500 transition-colors hover:text-neutral-200"
            >
              {showPassword ? (
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path d="M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 7 10 7a17.9 17.9 0 0 1-2.2 3.2M6.3 6.3A17.6 17.6 0 0 0 2 13s3.5 7 10 7a10.7 10.7 0 0 0 4.4-.9" strokeLinecap="round" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {touched.password && passwordError && (
            <p className="mt-1 text-sm text-red-400">{passwordError}</p>
          )}
        </div>

        {status === 'error' && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
