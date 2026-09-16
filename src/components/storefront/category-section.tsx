import Link from 'next/link';
import Image from 'next/image';
import { EmptyState } from '@/components/storefront/ui/empty-state';
import { SectionHeading } from '@/components/storefront/ui/section-heading';
import { buttonClass } from '@/components/storefront/ui/button';
import type { Category } from '@/types/domain';

export function CategorySection({ categories }: { categories: Category[] }) {
  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        eyebrow="The menu"
        title="Browse by category"
        description="Find your favourite treat, made with care."
        className="mb-8 sm:mb-10"
        action={
          <Link href="/products" className={buttonClass({ variant: 'quiet' })}>
            View all products <span aria-hidden="true">→</span>
          </Link>
        }
      />

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" description="New categories are on their way." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.id}`}
              className="group block min-w-0 overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 transition-[border-color,box-shadow] duration-[var(--dur-base)] hover:border-terracotta-600/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory motion-reduce:transition-none"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
                {c.image_url ? (
                  <Image
                    src={c.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-[var(--dur-base)] group-hover:scale-105 motion-reduce:transform-none"
                  />
                ) : c.emoji ? (
                  <span className="grid h-full w-full place-items-center text-5xl" aria-hidden="true">
                    {c.emoji}
                  </span>
                ) : (
                  <span className="grid h-full w-full place-items-center text-terracotta-600">
                    <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-display text-base font-semibold text-cocoa-900 sm:text-lg">{c.name}</h3>
                <span className="mt-1 inline-block text-xs font-medium text-cocoa-500 transition-colors group-hover:text-terracotta-700">
                  Explore treats <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
