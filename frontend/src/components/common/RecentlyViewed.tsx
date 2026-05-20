import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Card, CardContent } from "@/components/ui/card";
import { SaleBadge } from "@/components/common/SaleBadge";
import { formatPrice } from "@/utils/format";
import { getRecentlyViewed } from "@/hooks/useRecentlyViewed";
import type { RecentlyViewedProduct } from "@/hooks/useRecentlyViewed";

const MAX_DISPLAY = 5;

interface RecentlyViewedProps {
  currentProductId: number;
}

export default function RecentlyViewed({ currentProductId }: RecentlyViewedProps) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    const all = getRecentlyViewed();
    setItems(all.filter((item) => item.id !== currentProductId).slice(0, MAX_DISPLAY));
  }, [currentProductId]);

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Sản phẩm đã xem gần đây</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {items.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`}>
            <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden border-border/60 shadow-sm rounded-2xl group">
              {p.sale_price && p.sale_price < p.price && (
                <SaleBadge price={p.price} salePrice={p.sale_price} />
              )}
              <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                {p.image_url ? (
                  <OptimizedImage src={p.image_url} alt={p.name} width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>
              <CardContent className="space-y-2">
                <h3 className="font-medium line-clamp-2 text-sm">{p.name}</h3>
                <div className="flex items-center gap-2">
                  {p.sale_price ? (
                    <>
                      <span className="text-base font-bold text-destructive">{formatPrice(p.sale_price)}</span>
                      <span className="text-xs text-muted-foreground line-through">{formatPrice(p.price)}</span>
                    </>
                  ) : (
                    <span className="text-base font-bold">{formatPrice(p.price)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
