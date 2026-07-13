import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useNavigate } from "react-router-dom";
import {
  Search, Loader2, Clock, X, Trash2,
  Smartphone, Laptop, Tablet, Headphones, Cable, Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import axiosClient from "@/api/axiosClient";
import { formatPrice } from "@/utils/format";
import type { Product, Category, Brand } from "@/types";

interface SearchAutocompleteProps {
  onSearch: (query: string) => void;
  initialValue?: string;
  categories?: Category[];
  brands?: Brand[];
}

const RECENT_KEY = "ts_recent_searches";
const RECENT_MAX = 5;

/** Icon đại diện cho từng danh mục (theo slug). */
const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  "dien-thoai": Smartphone,
  "laptop": Laptop,
  "laptop-gaming": Laptop,
  "tablet": Tablet,
  "tai-nghe": Headphones,
  "phu-kien": Cable,
};

/** Đọc danh sách tìm kiếm gần đây từ localStorage (an toàn nếu lỗi). */
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* bỏ qua lỗi quota/private mode */
  }
}

/** Escape ký tự đặc biệt regex trong từ khoá người dùng nhập. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bọc phần khớp từ khoá bằng <span> in đậm + màu primary. */
function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <span key={i} className="font-semibold text-primary">{part}</span>
    ) : (
      part
    )
  );
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecent());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initialValue when it changes externally
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  // Debounce 300ms  ── GIỮ NGUYÊN logic debounce ──
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

  // Fetch suggestions  ── GIỮ NGUYÊN API call ──
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

  const getCategoryIcon = useCallback(
    (id: number) => {
      const slug = categories.find((c) => c.id === id)?.slug;
      return (slug && CATEGORY_ICONS[slug]) || Package;
    },
    [categories]
  );

  const getBrandName = useCallback(
    (id: number) => brands.find((b) => b.id === id)?.name,
    [brands]
  );

  // ── Recent searches helpers ──
  const pushRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => {
      const next = [t, ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
      saveRecent(next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((r) => r !== term);
      saveRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    saveRecent([]);
  }, []);

  // ── Mode tính toán ──
  const trimmed = inputValue.trim();
  const showSuggestions = isOpen && debouncedQuery.length >= 2;
  const showRecent = isOpen && trimmed === "" && recentSearches.length > 0;
  const showDropdown = showSuggestions || showRecent;

  // Số hàng điều hướng được bằng bàn phím trong mode hiện tại.
  const navCount = showSuggestions ? suggestions.length : showRecent ? recentSearches.length : 0;

  const submitSearch = (term: string) => {
    const t = term.trim();
    setIsOpen(false);
    if (!t) {
      onSearch(t);
      return;
    }
    pushRecent(t);
    onSearch(t);
  };

  const handleSelectProduct = (productId: number) => {
    setIsOpen(false);
    navigate(`/products/${productId}`);
  };

  const handleSelectRecent = (term: string) => {
    setInputValue(term);
    submitSearch(term);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setActiveIndex((i) => Math.min(i + 1, navCount - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        if (activeIndex >= 0 && showDropdown) {
          e.preventDefault();
          if (showSuggestions && suggestions[activeIndex]) {
            handleSelectProduct(suggestions[activeIndex].id);
          } else if (showRecent && recentSearches[activeIndex]) {
            handleSelectRecent(recentSearches[activeIndex]);
          }
        }
        // activeIndex === -1 → để form submit (tìm theo text đang gõ)
        break;
      case "Escape":
        // Đóng dropdown, GIỮ NGUYÊN text
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
      case "Tab":
        // Tab đóng dropdown (không chặn focus chuyển tiếp)
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder="Tìm kiếm sản phẩm..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            className="pl-10 pr-10 h-11 rounded-xl bg-card"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
          {/* Loading spinner 16px bên phải — hiện khi đang fetch */}
          {showSuggestions && isLoading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl border border-border shadow-lg z-50 max-h-[360px] overflow-y-auto py-1"
        >
          {/* ── Mode: Sản phẩm gợi ý ── */}
          {showSuggestions && (
            <>
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
                <>
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sản phẩm gợi ý
                  </p>
                  <ul>
                    {suggestions.map((product, idx) => {
                      const brandName = getBrandName(product.brand_id);
                      const categoryName = getCategoryName(product.category_id);
                      const CategoryIcon = getCategoryIcon(product.category_id);
                      const hasSale = product.sale_price != null && product.sale_price < product.price;
                      return (
                        <li key={product.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={activeIndex === idx}
                            onClick={() => handleSelectProduct(product.id)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left",
                              activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                            )}
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
                                <span className="text-lg" aria-hidden="true">📦</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">
                                {highlightMatch(product.name, debouncedQuery)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {/* Icon category 16px bên trái meta */}
                                <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                                {brandName && (
                                  <span className="text-xs text-primary font-medium">{brandName}</span>
                                )}
                                {categoryName && (
                                  <span className="text-xs text-muted-foreground line-clamp-1">{categoryName}</span>
                                )}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-right flex-shrink-0">
                              {hasSale ? (
                                <>
                                  <p className="text-sm font-bold text-sale">
                                    {formatPrice(product.sale_price!)}
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
                </>
              )}
            </>
          )}

          {/* ── Mode: Tìm kiếm gần đây ── */}
          {showRecent && (
            <>
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tìm kiếm gần đây
              </p>
              <ul>
                {recentSearches.map((term, idx) => (
                  <li key={term}>
                    <div
                      role="option"
                      aria-selected={activeIndex === idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "group/recent flex items-center gap-3 px-3 py-2.5 transition-colors",
                        activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectRecent(term)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="text-sm line-clamp-1">{term}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(term)}
                        aria-label={`Xóa "${term}" khỏi lịch sử`}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Xóa lịch sử */}
              <div className="px-2 pt-1 mt-1 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearRecent}
                  className="w-full h-8 gap-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa lịch sử
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
