import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/shell';
import { getAdminUser } from '@/lib/auth/session';
import { LOGIN_PATH } from '@/lib/auth/constants';

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const headersList = await headers();
  const pathname = headersList.get('x-cz-pathname') ?? '';
  const isLoginPage = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);

  const user = await getAdminUser();

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    const query = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
    redirect(`${LOGIN_PATH}${query}`);
  }

  return <AdminShell email={user.email}>{children}</AdminShell>;
}
