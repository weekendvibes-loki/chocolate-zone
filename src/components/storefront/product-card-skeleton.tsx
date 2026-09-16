export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-100">
      <div className="aspect-[4/5] animate-pulse bg-cream-200" />
      <div className="p-3 sm:p-4">
        <div className="h-2.5 w-16 animate-pulse rounded bg-cream-200" />
        <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-cream-200" />
        <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-cream-200" />
        <div className="mt-3 h-3 w-24 animate-pulse rounded bg-cream-200" />
        <div className="mt-4 h-11 animate-pulse rounded-xl bg-cream-200" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
