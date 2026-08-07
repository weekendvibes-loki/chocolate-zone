'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
    >
      Sign out
    </button>
  );
}
