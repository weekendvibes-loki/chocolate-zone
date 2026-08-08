export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="aspect-[4/5] animate-pulse bg-[#f0e8da]" />
      <div className="p-4">
        <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-100" />
        <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
        <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
        <div className="mt-3 h-3 w-24 animate-pulse rounded bg-zinc-100" />
        <div className="mt-4 h-11 animate-pulse rounded-xl bg-zinc-100" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
