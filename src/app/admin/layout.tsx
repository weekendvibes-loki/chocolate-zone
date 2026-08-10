import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth/session';
import { LOGIN_PATH } from '@/lib/auth/constants';

const PUBLIC_AUTH_PATHS = ['/admin/forgot-password', '/admin/reset-password'];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const headersList = await headers();
  const pathname = headersList.get('x-cz-pathname') ?? '';
  const isLoginPage = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
  const isPublicAdminPath = isLoginPage || PUBLIC_AUTH_PATHS.includes(pathname);

  if (isPublicAdminPath) {
    return <>{children}</>;
  }

  const user = await getAdminUser();

  if (!user) {
    const query = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
    redirect(`${LOGIN_PATH}${query}`);
  }

  return <>{children}</>;
}
