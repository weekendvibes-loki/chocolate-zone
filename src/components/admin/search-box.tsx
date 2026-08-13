'use client';

export function SearchBox({
  value,
  onChange,
  placeholder,
  tone = 'zinc',
  clearable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  tone?: 'zinc' | 'amber';
  clearable?: boolean;
}) {
  const inputClass =
    tone === 'amber'
      ? `w-full min-h-11 rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 ${
          value ? 'pr-10' : 'pr-3'
        }`
      : 'w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200';

  return (
    <div className="relative w-full max-w-sm">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={inputClass}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
