export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-8 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-8 border-b border-zinc-100 px-4 py-4 last:border-0">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className={`h-3 animate-pulse rounded bg-zinc-100 ${j === 0 ? 'w-48' : 'w-24'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
