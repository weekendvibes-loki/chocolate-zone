import Link from 'next/link';
import { getCatalog } from '@/lib/services/catalog';
import type { TimingRule } from '@/types/domain';

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
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
  const email = shop?.contact_email?.trim() ?? '';
  const address = shop?.address?.trim() ?? '';
  const timings = timingSummary(shop?.timings ?? null);

  const exploreLinks = [
    { href: '/', label: 'Home' },
    { href: '/#menu', label: 'Menu' },
    { href: '/products', label: 'Shop' },
    { href: '/offers', label: 'Offers' },
  ];

  return (
    <footer className="border-t border-cream-300/15 bg-cocoa-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-display text-xl font-semibold tracking-wide text-ivory">{brand}</span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-cream-200/75">
            Handcrafted chocolates made fresh every day with premium cocoa and real ingredients.
          </p>
          <div aria-hidden="true" className="mt-6 h-px w-16 bg-cream-300/20" />
        </div>

        <nav aria-label="Footer">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-gold-400">Explore</h2>
          <div aria-hidden="true" className="mt-3 h-px w-8 bg-cream-300/20" />
          <ul className="mt-4 text-sm text-cream-200">
            {exploreLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="group inline-flex min-h-11 items-center gap-2.5 transition-colors duration-[var(--dur-base)] ease-out-soft hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa-900 motion-reduce:transition-none"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-gold-400 transition-transform duration-[var(--dur-base)] group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section id="contact" aria-label="Contact" className="scroll-mt-16 lg:scroll-mt-20 lg:border-l lg:border-cream-300/15 lg:pl-8">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-gold-400">Contact</h2>
          <div aria-hidden="true" className="mt-3 h-px w-8 bg-cream-300/20" />
          <ul className="mt-4 text-sm text-cream-200/80">
            {phone ? (
              <li>
                <span className="block pt-2.5">Phone / WhatsApp:</span>
                <a
                  href={phoneHref ?? undefined}
                  className="inline-flex min-h-11 items-center font-medium text-ivory transition-colors duration-[var(--dur-base)] hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa-900 motion-reduce:transition-none"
                >
                  {phone}
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <span className="block pt-2.5">Email:</span>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex min-h-11 items-center font-medium text-ivory transition-colors duration-[var(--dur-base)] hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa-900 motion-reduce:transition-none"
                >
                  {email}
                </a>
              </li>
            ) : null}
            {address ? <li className="pt-2.5">Address: {address}</li> : null}
            {!phone && !email && !address && (
              <li className="pt-2.5">Reach out through the shop for orders and enquiries.</li>
            )}
          </ul>
        </section>

        <section aria-label="Store timings">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-gold-400">Store timings</h2>
          <div aria-hidden="true" className="mt-3 h-px w-8 bg-cream-300/20" />
          <ul className="mt-4 space-y-3 pt-2.5 text-sm text-cream-200/80">
            {timings.rows.map((row, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{row.label}</span>
                <span className="text-ivory">{row.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="border-t border-cream-300/10 bg-cocoa-950 py-5 text-center text-xs text-cream-200/60">
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </div>
    </footer>
  );
}
