import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Card, CardContent } from "@/components/ui/card";
import { SaleBadge } from "@/components/common/SaleBadge";
import { formatPrice } from "@/utils/format";
import type { RecommendResponse } from "@/types";

interface Props {
  productId: number;
  limit?: number;
}

export default function CustomersAlsoBought({ productId, limit = 4 }: Props) {
  const { data, isLoading, isError } = useQuery<RecommendResponse>({
    queryKey: ["co-occurrence", productId, limit],
    queryFn: async () => {
      const res = await axiosClient.get("/api/ai/recommend", {
        params: { strategy: "co_occurrence", product_id: productId, limit },
      });
      return res.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError) return null;

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xl font-bold mb-4">Có thể bạn cũng thích</h2>
        <div className="flex gap-4 overflow-x-auto snap-x pb-1 -mx-1 px-1 md:grid md:grid-cols-4 md:overflow-visible md:mx-0 md:px-0">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[45%] sm:w-[31%] md:w-auto aspect-[4/3] bg-muted rounded-2xl animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.results.length === 0) return null;

  return (
    <section aria-label="Sản phẩm gợi ý">
      <h2 className="text-xl font-bold mb-4">Có thể bạn cũng thích</h2>
      <div className="flex gap-4 overflow-x-auto snap-x pb-1 -mx-1 px-1 md:grid md:grid-cols-4 md:overflow-visible md:mx-0 md:px-0">
        {data.results.map(({ product: p }) => (
          <Link key={p.id} to={`/products/${p.id}`} className="snap-start shrink-0 w-[45%] sm:w-[31%] md:w-auto">
            <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden border-border/60 shadow-sm rounded-2xl group">
              {p.sale_price && p.sale_price < p.price && (
                <SaleBadge price={p.price} salePrice={p.sale_price} />
              )}
              <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                {p.image_url ? (
                  <OptimizedImage
                    src={p.image_url}
                    alt={p.name}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-4xl" aria-hidden="true">📦</span>
                )}
              </div>
              <CardContent className="space-y-2">
                <h3 className="font-medium line-clamp-2 text-sm">{p.name}</h3>
                <div className="flex items-center gap-2">
                  {p.sale_price ? (
                    <>
                      <span className="text-base font-bold text-sale">
                        {formatPrice(p.sale_price)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(p.price)}
                      </span>
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
