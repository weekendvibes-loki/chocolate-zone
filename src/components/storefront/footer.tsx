import Link from 'next/link';

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'WhatsApp', href: '#' },
];

export function StorefrontFooter() {
  return (
    <footer id="contact" className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-zinc-900 text-amber-400">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-base font-bold text-zinc-900">Chocolate Zone</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-500">
            Handcrafted chocolates made fresh every day with premium cocoa and real ingredients.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>Phone / WhatsApp: +91 98765 43210</li>
            <li>Email: hello@chocolatezone.in</li>
            <li>Address: 123 Cocoa Lane, Indiranagar, Bengaluru 560038</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">Store timings</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li className="flex justify-between gap-4">
              <span>Mon – Fri</span>
              <span>10:00 AM – 9:30 PM</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Sat – Sun</span>
              <span>10:00 AM – 10:00 PM</span>
            </li>
          </ul>
          <div className="mt-5 flex items-center gap-3">
            {socialLinks.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="grid size-9 place-items-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
              >
                {socialIcon(s.label)}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-zinc-200 py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Chocolate Zone. All rights reserved.
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
