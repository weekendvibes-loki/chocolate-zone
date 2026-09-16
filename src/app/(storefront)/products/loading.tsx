import { ProductGridSkeleton } from '@/components/storefront/product-card-skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <p role="status" className="sr-only">Loading products…</p>
      <div className="mb-10 max-w-2xl">
        <div className="h-3 w-24 animate-pulse rounded bg-cream-300" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded bg-cream-300 sm:w-80" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-cream-200" />
      </div>
      <div className="mb-8 flex gap-2">
        <div className="h-11 w-16 animate-pulse rounded-full bg-cream-200" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-cream-200" />
        <div className="h-11 w-24 animate-pulse rounded-full bg-cream-200" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
