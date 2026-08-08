import { ProductGridSkeleton } from '@/components/storefront/product-card-skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded bg-zinc-200 sm:w-80" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="mb-8 flex gap-2">
        <div className="h-11 w-16 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-11 w-24 animate-pulse rounded-full bg-zinc-100" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
