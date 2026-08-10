import Link from 'next/link';
import { getCatalog } from '@/lib/services/catalog';
import type { TimingRule } from '@/types/domain';

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'WhatsApp', href: '#' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m === undefined ? '00' : String(m).padStart(2, '0')} ${period}`;
}

function timingSummary(timings: TimingRule[] | null): { rows: { label: string; value: string }[] } {
  if (!timings || timings.length === 0) {
    return {
      rows: [{ label: 'Open daily', value: '' }],
    };
  }

  const rows: { label: string; value: string }[] = [];
  for (const rule of timings) {
    const closed = rule.closed === true;
    if (closed) {
      rows.push({ label: dayLabel(rule.day), value: 'Closed' });
      continue;
    }
    const open = formatTime(rule.open);
    const close = formatTime(rule.close);
    rows.push({
      label: dayLabel(rule.day),
      value: open && close ? `${open} – ${close}` : 'Open',
    });
  }
  return { rows };
}

function dayLabel(day: number | string): string {
  if (day === 'all') return 'Every day';
  if (typeof day === 'number' && day >= 0 && day <= 6) return DAY_NAMES[day];
  const n = Number(day);
  if (!Number.isNaN(n) && n >= 0 && n <= 6) return DAY_NAMES[n];
  return 'Daily';
}

function formatPhone(value: string | null): string {
  if (!value?.trim()) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return value.trim();
}

export async function StorefrontFooter() {
  let shop:
    | {
        brand: string;
        address: string | null;
        timings: TimingRule[] | null;
        contact_phone: string | null;
        contact_email: string | null;
        whatsapp_number: string;
      }
    | null = null;

  try {
    const catalog = await getCatalog();
    shop = catalog.shop;
  } catch {
    shop = null;
  }

  const brand = shop?.brand ?? 'Chocolate Zone';
  const phone = shop?.contact_phone?.trim() || (shop?.whatsapp_number ? formatPhone(shop.whatsapp_number) : '');
  const email = shop?.contact_email?.trim() ?? '';
  const address = shop?.address?.trim() ?? '';
  const timings = timingSummary(shop?.timings ?? null);

  return (
    <footer id="contact" className="border-t border-[#1f1510] bg-[#241a15]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-zinc-900">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-serif text-lg font-semibold text-white">{brand}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-400">
            Handcrafted chocolates made fresh every day with premium cocoa and real ingredients.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-400">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-300">
            {phone ? <li>Phone / WhatsApp: {phone}</li> : null}
            {email ? <li>Email: {email}</li> : null}
            {address ? <li>Address: {address}</li> : null}
            {!phone && !email && !address && (
              <li>Reach out through the shop for orders and enquiries.</li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-400">Store timings</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-zinc-300">
            {timings.rows.map((row, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            {socialLinks.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="grid size-10 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition-colors hover:border-amber-400 hover:bg-amber-400 hover:text-zinc-900"
              >
                {socialIcon(s.label)}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </div>
    </footer>
  );
}

function socialIcon(label: string) {
  switch (label) {
    case 'Instagram':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'Facebook':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 21v-7h2.5l.5-3h-3V9c0-.9.3-1.5 1.7-1.5H16V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.4-3.7 3.9V11H7.5v3h2.5v7h3.5Z" />
        </svg>
      );
    default:
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 3a9 9 0 0 0-7.7 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" strokeLinejoin="round" />
          <path d="M8.5 9.5c0 3.5 2.5 6 6 6l1-1.5-2-1-.7.7a4.5 4.5 0 0 1-2.5-2.5l.7-.7-1-2Z" strokeLinejoin="round" />
        </svg>
      );
  }
}
