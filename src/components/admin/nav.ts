export type AdminNavIcon = 'dashboard' | 'categories' | 'products' | 'offers' | 'settings';

export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: AdminNavIcon;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', description: 'Overview and quick actions', icon: 'dashboard' },
  { href: '/admin/categories', label: 'Categories', description: 'Organize your menu', icon: 'categories' },
  { href: '/admin/products', label: 'Products', description: 'Manage items and variants', icon: 'products' },
  { href: '/admin/offers', label: 'Offers', description: 'Discounts and promotions', icon: 'offers' },
  { href: '/admin/settings', label: 'Settings', description: 'Shop configuration', icon: 'settings' },
];
