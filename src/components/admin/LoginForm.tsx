'use client';

import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const POST_LOGIN_PATH = '/admin';

export function LoginForm({ next = POST_LOGIN_PATH }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, next }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="mt-6 rounded-xl border border-neutral-800 p-4 text-sm">
        <p className="font-medium text-emerald-400">Check your inbox.</p>
        <p className="mt-1 text-neutral-400">
          If <span className="font-semibold">{email}</span> is the admin address, a
          magic sign-in link is on its way. It expires in 30 minutes.
        </p>
        <button
          className="mt-3 text-neutral-300 underline"
          onClick={() => setStatus('idle')}
          type="button"
        >
          Send another link
        </button>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={onSubmit}>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@shop.com"
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-400">
          Something went wrong. Please try again in a minute.
        </p>
      )}
    </form>
  );
}
