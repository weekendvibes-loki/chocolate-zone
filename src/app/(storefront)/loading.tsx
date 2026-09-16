import { ProductGridSkeleton } from '@/components/storefront/product-card-skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p role="status" className="mb-6 text-sm text-cocoa-500">Loading the store…</p>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
