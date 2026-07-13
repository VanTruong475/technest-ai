export function SaleBadge({ price, salePrice }: { price: number; salePrice: number }) {
  const percent = Math.round((1 - salePrice / price) * 100);
  return (
    <span className="absolute top-2 left-2 bg-sale text-sale-foreground text-xs font-bold px-2 py-0.5 rounded-full">
      -{percent}%
    </span>
  );
}
