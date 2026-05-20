import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import axiosClient from "@/api/axiosClient";
import { formatPrice } from "@/utils/format";

interface Product {
  id: number;
  name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  category_id: number;
  brand_id: number;
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface SearchAutocompleteProps {
  onSearch: (query: string) => void;
  initialValue?: string;
  categories?: Category[];
  brands?: Brand[];
}

export default function SearchAutocomplete({
  onSearch,
  initialValue = "",
  categories = [],
  brands = [],
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initialValue when it changes externally
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // Debounce 300ms
  useEffect(() => {
    if (inputValue.length < 2) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fetch suggestions
  const { data, isLoading } = useQuery<{ items: Product[] }>({
    queryKey: ["product-suggest", debouncedQuery],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", {
        params: { search: debouncedQuery, limit: 5, status: "ACTIVE" },
      });
      return res.data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const suggestions = data?.items || [];

  // Open dropdown when we have results or are loading
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCategoryName = useCallback(
    (id: number) => categories.find((c) => c.id === id)?.name,
    [categories]
  );

  const getBrandName = useCallback(
    (id: number) => brands.find((b) => b.id === id)?.name,
    [brands]
  );

  const handleSelect = (productId: number) => {
    setIsOpen(false);
    navigate(`/products/${productId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    onSearch(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = isOpen && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Tìm kiếm sản phẩm..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (debouncedQuery.length >= 2) setIsOpen(true);
            }}
            className="pl-10 h-11 rounded-xl bg-white"
          />
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-border shadow-lg z-50 max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tìm kiếm...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy sản phẩm phù hợp
            </div>
          ) : (
            <ul>
              {suggestions.map((product) => {
                const brandName = getBrandName(product.brand_id);
                const categoryName = getCategoryName(product.category_id);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      {/* Image */}
                      <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <OptimizedImage
                            src={product.image_url}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {brandName && (
                            <span className="text-xs text-primary font-medium">{brandName}</span>
                          )}
                          {categoryName && (
                            <span className="text-xs text-muted-foreground">{categoryName}</span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        {product.sale_price && product.sale_price < product.price ? (
                          <>
                            <p className="text-sm font-bold text-destructive">
                              {formatPrice(product.sale_price)}
                            </p>
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.price)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-bold">{formatPrice(product.price)}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
