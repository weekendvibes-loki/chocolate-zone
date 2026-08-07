export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  variant = 'empty',
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'empty' | 'search';
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-zinc-100">
        {variant === 'search' ? (
          <svg className="size-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="size-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 7h18M4 7h16l-1 13H5L4 7Z" />
            <path d="M9 7a3 3 0 0 1 6 0" />
          </svg>
        )}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
