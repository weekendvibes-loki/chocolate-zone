import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/shell';
import { getAdminUser } from '@/lib/auth/session';
import { LOGIN_PATH } from '@/lib/auth/constants';

export default async function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  const user = await getAdminUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return <AdminShell email={user.email}>{children}</AdminShell>;
}
