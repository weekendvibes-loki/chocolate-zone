import Link from 'next/link';
import Image from 'next/image';
import { EmptyState } from '@/components/admin/empty-state';
import type { Category } from '@/types/domain';

export function CategorySection({ categories }: { categories: Category[] }) {
  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">Browse the menu</h2>
        <p className="mt-1 text-sm text-zinc-500">Explore our chocolates by category.</p>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" description="New categories are on their way." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.id}`}
              className="group block rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"
            >
              <div className="relative mb-3 grid h-24 place-items-center overflow-hidden rounded-xl bg-zinc-50 text-zinc-400 transition-colors group-hover:bg-amber-50">
                {c.image_url ? (
                  <Image
                    src={c.image_url}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : c.emoji ? (
                  <span className="text-4xl" aria-hidden="true">
                    {c.emoji}
                  </span>
                ) : (
                  <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <h3 className="text-center text-sm font-semibold text-zinc-900">{c.name}</h3>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
