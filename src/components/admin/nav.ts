export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', description: 'Overview and quick actions' },
  { href: '/admin/categories', label: 'Categories', description: 'Organize your menu' },
  { href: '/admin/products', label: 'Products', description: 'Manage items and variants' },
  { href: '/admin/offers', label: 'Offers', description: 'Discounts and promotions' },
  { href: '/admin/settings', label: 'Settings', description: 'Shop configuration' },
];
