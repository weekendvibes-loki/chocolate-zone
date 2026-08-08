'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient, type SupabaseBrowserClient } from '@/lib/supabase/client';

type Status = 'recovering' | 'ready' | 'saving' | 'error';

const inputClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 pr-11 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none';

export default function ResetPasswordPage() {
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);
  const [status, setStatus] = useState<Status>('recovering');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ password: boolean; confirm: boolean }>({
    password: false,
    confirm: false,
  });

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    (async () => {
      try {
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const code = search.get('code');
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        } else {
          const accessToken = hash.get('access_token');
          const refreshToken = hash.get('refresh_token');
          if (!accessToken || !refreshToken) throw new Error('Missing recovery tokens.');
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw new Error(error.message);
        }
        setSupabase(client);
        setStatus('ready');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Invalid or expired reset link.');
        setStatus('error');
      }
    })();
  }, []);

  const passwordError =
    password.length < 8 ? 'Password must be at least 8 characters.' : undefined;
  const confirmError = confirm !== password ? 'Passwords do not match.' : undefined;
  const canSubmit = status === 'ready' && !passwordError && !confirmError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ password: true, confirm: true });
    if (!supabase || passwordError || confirmError) return;
    setStatus('saving');
    setErrorMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message);
      setStatus('ready');
      return;
    }
    await supabase.auth.signOut().catch(() => {});
    window.location.href = '/admin/login?reset=success';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-white">Set a new password</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Choose a strong password you don&apos;t use elsewhere.
        </p>

        {status === 'recovering' && (
          <p className="mt-6 text-sm text-neutral-400">Verifying your reset link…</p>
        )}

        {status === 'error' && (
          <div className="mt-6 rounded-xl border border-neutral-800 p-4 text-sm">
            <p className="font-medium text-red-400">This reset link is invalid or expired.</p>
            <p className="mt-1 text-neutral-400">{errorMessage}</p>
            <Link
              href="/admin/forgot-password"
              className="mt-3 inline-block text-neutral-300 underline underline-offset-2 hover:text-white"
            >
              Request a new link
            </Link>
          </div>
        )}

        {status !== 'recovering' && status !== 'error' && (
          <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="reset-password" className="mb-1 block text-sm text-neutral-400">
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="At least 8 characters"
                  aria-invalid={touched.password && Boolean(passwordError)}
                  className={inputClass}
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

            <div>
              <label htmlFor="reset-confirm" className="mb-1 block text-sm text-neutral-400">
                Confirm new password
              </label>
              <input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                placeholder="Re-enter your password"
                aria-invalid={touched.confirm && Boolean(confirmError)}
                className={inputClass}
              />
              {touched.confirm && confirmError && (
                <p className="mt-1 text-sm text-red-400">{confirmError}</p>
              )}
            </div>

            {errorMessage && (
              <p role="alert" className="text-sm text-red-400">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'saving' ? 'Saving…' : 'Update password'}
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
