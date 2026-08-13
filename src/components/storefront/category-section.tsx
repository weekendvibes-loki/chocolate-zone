import Link from 'next/link';
import Image from 'next/image';
import { EmptyState } from '@/components/admin/empty-state';
import type { Category } from '@/types/domain';

export function CategorySection({ categories }: { categories: Category[] }) {
  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#B3703D]">The menu</span>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#2A1710] sm:text-4xl">
            Browse by category
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#6B4A33]">
            From waffles to brownies — find your favourite treat.
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-semibold text-[#B3703D] transition-colors hover:text-[#2A1710]"
        >
          View all products →
        </Link>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" description="New categories are on their way." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.id}`}
              className="group block overflow-hidden rounded-2xl border border-[#E7D5C1] bg-white transition-all hover:-translate-y-1 hover:border-[#B3703D]/50 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#f5ede1]">
                {c.image_url ? (
                  <Image
                    src={c.image_url}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : c.emoji ? (
                  <span className="grid h-full w-full place-items-center text-5xl" aria-hidden="true">
                    {c.emoji}
                  </span>
                ) : (
                  <span className="grid h-full w-full place-items-center text-zinc-300">
                    <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="p-4">
                <h3 className="font-serif text-base font-semibold text-[#2A1710] sm:text-lg">{c.name}</h3>
                <span className="mt-1 inline-block text-xs font-medium text-[#8A6A52] transition-colors group-hover:text-[#B3703D]">
                  Shop {c.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
