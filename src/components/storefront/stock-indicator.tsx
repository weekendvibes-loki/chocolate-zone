export function StockIndicator({ stock }: { stock: number | null }) {
  if (stock === null || stock > 10) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        In stock
      </span>
    );
  }
  if (stock === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <span className="size-1.5 rounded-full bg-red-500" aria-hidden="true" />
        Out of stock
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-amber-600">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Only {stock} left
    </span>
  );
}
