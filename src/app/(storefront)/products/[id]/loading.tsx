export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 h-3 w-44 animate-pulse rounded bg-zinc-200" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-[#f0e8da]" />
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 sm:w-64" />
        </div>
      </div>
    </div>
  );
}
