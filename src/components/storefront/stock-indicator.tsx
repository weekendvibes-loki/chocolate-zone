export function StockIndicator({ stock }: { stock: number | null }) {
  if (stock === null || stock > 10) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        In stock
      </span>
    );
  }
  if (stock === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-danger">
        <span className="size-1.5 rounded-full bg-danger" aria-hidden="true" />
        Out of stock
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-terracotta-700">
      <span className="size-1.5 rounded-full bg-gold-400" aria-hidden="true" />
      Only {stock} left
    </span>
  );
}
