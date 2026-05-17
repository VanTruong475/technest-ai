import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/categories", { params: { limit: 100 } });
      return res.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getCategoryIdBySlug(categories: Category[], slug: string): number | undefined {
  return categories.find((c) => c.slug === slug)?.id;
}
