import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Sparkles, Home, ShoppingCart, Heart,
  Package, MessageSquareText, CornerDownLeft,
} from "lucide-react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import axiosClient from "@/api/axiosClient";
import { formatPrice } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface NavAction {
  id: string;
  label: string;
  icon: typeof Home;
  to: string;
}

const NAV_ACTIONS: NavAction[] = [
  { id: "home", label: "Trang chủ", icon: Home, to: "/" },
  { id: "products", label: "Tất cả sản phẩm", icon: Package, to: "/products" },
  { id: "cart", label: "Giỏ hàng", icon: ShoppingCart, to: "/cart" },
  { id: "wishlist", label: "Yêu thích", icon: Heart, to: "/wishlist" },
  { id: "chat", label: "Trợ lý AI", icon: MessageSquareText, to: "/chat" },
];

/**
 * Command Palette (⌘K / Ctrl+K): tìm sản phẩm nhanh, điều hướng, hoặc hỏi AI.
 * Tự xây bằng framer-motion + portal — không phụ thuộc thư viện ngoài.
 * Mount 1 lần ở MainLayout.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle bằng ⌘K / Ctrl+K (hoặc CustomEvent từ nút hint trong header)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpenEvent);
    };
  }, []);

  // Reset + focus khi mở
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
      setActiveIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Debounce 250ms
  useEffect(() => {
    if (query.trim().length < 2) {
      setDebounced("");
      return;
    }
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useQuery<{ items: Product[] }>({
    queryKey: ["palette-search", debounced],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", {
        params: { search: debounced, limit: 6, status: "ACTIVE" },
      });
      return res.data;
    },
    enabled: open && debounced.length >= 2,
  });

  const products = data?.items ?? [];
  const hasQuery = query.trim().length >= 2;
  const filteredNav = hasQuery
    ? NAV_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.trim().toLowerCase()))
    : NAV_ACTIONS;

  // Danh sách phẳng để điều hướng bằng phím mũi tên.
  type Row =
    | { kind: "product"; product: Product }
    | { kind: "nav"; action: NavAction }
    | { kind: "ai"; text: string };
  const rows: Row[] = [
    ...products.map((p) => ({ kind: "product" as const, product: p })),
    ...filteredNav.map((a) => ({ kind: "nav" as const, action: a })),
    ...(hasQuery ? [{ kind: "ai" as const, text: query.trim() }] : []),
  ];

  const close = useCallback(() => setOpen(false), []);

  const runRow = useCallback(
    (row: Row) => {
      close();
      if (row.kind === "product") navigate(`/products/${row.product.id}`);
      else if (row.kind === "nav") navigate(row.action.to);
      else navigate(`/chat?q=${encodeURIComponent(row.text)}`);
    },
    [close, navigate]
  );

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) runRow(row);
    }
  };

  // Giữ activeIndex hợp lệ khi danh sách đổi.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(rows.length - 1, 0)));
  }, [rows.length]);

  let rowCounter = -1;
  const nextIndex = () => (rowCounter += 1);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-xl bg-popover rounded-2xl border border-border shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Tìm kiếm nhanh"
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Tìm sản phẩm, điều hướng, hoặc hỏi AI…"
                className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <kbd className="hidden sm:inline-block text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {/* Sản phẩm */}
              {products.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sản phẩm
                  </p>
                  {products.map((p) => {
                    const idx = nextIndex();
                    const hasSale = p.sale_price != null && p.sale_price < p.price;
                    return (
                      <button
                        key={`p-${p.id}`}
                        onClick={() => runRow({ kind: "product", product: p })}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                          activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="w-9 h-9 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {p.image_url ? (
                            <OptimizedImage src={p.image_url} alt={p.name} width={36} height={36} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="flex-1 min-w-0 text-sm line-clamp-1">{p.name}</span>
                        <span className="text-xs font-bold shrink-0">
                          {formatPrice(hasSale ? p.sale_price! : p.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Điều hướng */}
              {filteredNav.length > 0 && (
                <div className="px-2 mt-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Điều hướng
                  </p>
                  {filteredNav.map((a) => {
                    const idx = nextIndex();
                    const Icon = a.icon;
                    return (
                      <button
                        key={`n-${a.id}`}
                        onClick={() => runRow({ kind: "nav", action: a })}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                          activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Hỏi AI */}
              {hasQuery && (
                <div className="px-2 mt-1">
                  {(() => {
                    const idx = nextIndex();
                    return (
                      <button
                        onClick={() => runRow({ kind: "ai", text: query.trim() })}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                          activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 text-sm">
                          Hỏi AI: <span className="font-medium">"{query.trim()}"</span>
                        </span>
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Empty */}
              {hasQuery && !isLoading && products.length === 0 && filteredNav.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Không có kết quả cho "{query.trim()}"
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
