import { LoginForm } from '@/components/admin/LoginForm';

export const metadata = { title: 'Admin sign in · Chocolate Zone' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; reset?: string | string[] }>;
}) {
  const { next, reset } = await searchParams;
  const nextPath = typeof next === 'string' ? next : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-white">Chocolate Zone</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Sign in to the admin dashboard with your shop email.
        </p>
        <LoginForm next={nextPath} resetSuccess={reset === 'success'} />
      </div>
    </main>
  );
}
