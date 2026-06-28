import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Sparkles, Trash2, User as UserIcon, MessageSquareText,
  Lightbulb, Bot, Square,
} from "lucide-react";
import { formatPrice, formatTime } from "@/utils/format";
import { getErrorMessage } from "@/utils/api";
import { SaleBadge } from "@/components/common/SaleBadge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { streamChat } from "@/lib/aiStream";
import type { AISearchResult, ChatMessage } from "@/types";

const CHAT_STORAGE_KEY = "techsphere-chat-messages";

// Chips gợi ý nhanh — chỉ hiện khi chat trống. Click → điền input + submit luôn.
const QUICK_CHIPS = [
  "Laptop gaming",
  "Điện thoại dưới 10 triệu",
  "Tai nghe không dây",
  "Màn hình 4K",
];

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  // Token AI đang được stream về (chưa commit vào messages). isStreaming bật
  // từ lúc gửi tới lúc done — dùng để disable input & hiện bubble live.
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const autoSendRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Textarea tự co giãn theo nội dung, tối đa ~4 dòng (112px) rồi scroll.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`;
  }, [input]);

  // Mirror messages vào ref để handleSend (async, ngoài render) đọc context
  // mới nhất mà không cần thêm vào dependency.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persist messages to localStorage (keep last 100)
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // localStorage full — silently drop oldest messages on next save
      console.warn("Failed to save chat messages to localStorage (storage may be full)");
    }
  }, [messages]);

  // Hủy stream đang chạy khi rời trang để tránh setState trên unmounted component.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingText("");
    setIsStreaming(false);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  // Auto scroll TRONG container chat (không scroll page) — block:"nearest"
  // giữ scroll context local, không bubble lên window/document.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isStreaming, streamingText]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || isStreaming) return;
    setInput("");

    // Context = 10 tin gần nhất TRƯỚC câu mới (message gửi riêng qua body).
    const history = messagesRef.current.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    // Thêm user message ngay lập tức (optimistic).
    setMessages((prev) => [...prev, { role: "user", content: message, createdAt: Date.now() }]);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    setStreamingText("");

    let acc = "";
    let committed = false;
    const commit = (
      products: AISearchResult[] = [],
      suggestions: string[] = []
    ) => {
      if (committed || !acc) return;
      committed = true;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: acc, products, suggestions, createdAt: Date.now() },
      ]);
    };

    try {
      await streamChat(
        message,
        history,
        {
          onToken: (t) => {
            acc += t;
            setStreamingText(acc);
          },
          onDone: ({ products, suggestions }) => commit(products, suggestions),
        },
        controller.signal
      );
      commit(); // an toàn: stream kết thúc mà chưa nhận event done
    } catch (err) {
      if (controller.signal.aborted) return; // người dùng hủy — bỏ qua im lặng
      if (acc) {
        commit(); // đã có token → giữ lại phần đã nhận, không rollback
      } else {
        // Chưa có gì → rollback user message cuối cùng
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "user") return prev.slice(0, -1);
          return prev;
        });
        toast.error(getErrorMessage(err, "Không thể kết nối AI"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
        setStreamingText("");
      }
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  // Dừng stream giữa chừng (nút Stop). Giữ lại phần text đã nhận làm tin assistant.
  // Khi abort: handleSend bỏ qua commit + bỏ qua reset state trong finally (guard
  // `!signal.aborted`) → ở đây tự commit & reset, không lo double-commit.
  const handleStop = () => {
    abortRef.current?.abort();
    if (streamingText) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: streamingText, products: [], suggestions: [], createdAt: Date.now() },
      ]);
    }
    setStreamingText("");
    setIsStreaming(false);
  };

  // Auto-send from URL param ?q=... (e.g. from HomePage suggestions)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSendRef.current) {
      autoSendRef.current = true;
      handleSend(q);
      // Clean URL param without re-triggering
      window.history.replaceState({}, "", "/chat");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Chat header — sticky top với pulse dot online */}
      <header className="shrink-0 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
              </span>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">TechSphere AI</h1>
              <p className="text-xs text-muted-foreground leading-tight">Trợ lý mua sắm · Online</p>
            </div>
          </div>
          {messages.length > 0 && (
            <ConfirmDialog
              title="Xóa cuộc trò chuyện?"
              description="Tin nhắn sẽ bị xóa vĩnh viễn và không thể khôi phục."
              variant="destructive"
              onConfirm={clearChat}
            >
              <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label="Xóa cuộc trò chuyện">
                <Trash2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Cuộc trò chuyện mới</span>
              </Button>
            </ConfirmDialog>
          )}
        </div>
      </header>

      {/* Messages area — flex-1, scroll bên trong */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {messages.length === 0 ? (
            // Empty state polished
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/20 to-violet-500/20 blur-2xl rounded-full" />
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-xl">
                  <Sparkles className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Mình có thể giúp gì cho bạn?</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Hỏi mình về sản phẩm phù hợp nhu cầu, ngân sách, thương hiệu —
                mình sẽ gợi ý từ kho hàng TechSphere.
              </p>

              {/* Quick suggestion chips — outline, rounded-full. Click → điền + gửi luôn. */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {QUICK_CHIPS.map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-sm"
                    onClick={() => { setInput(chip); handleSend(chip); }}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageRow key={index} msg={msg} onSuggestion={(s) => handleSend(s)} />
            ))
          )}

          {/* Streaming bubble: chấm bouncing khi chưa có token, rồi text live
              kèm con trỏ nhấp nháy khi token đang chảy về. */}
          {isStreaming && (
            <div className="flex items-end gap-2.5">
              <AssistantAvatar />
              <div className="bg-muted text-foreground rounded-[18px] rounded-bl-[4px] px-4 py-3 max-w-[85%]">
                {streamingText ? (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-muted-foreground/70 animate-pulse" aria-hidden="true" />
                  </p>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar sticky bottom — floating với shadow */}
      <div className="shrink-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2 rounded-3xl border border-border bg-background pl-4 pr-1.5 py-1.5 shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Hỏi mình về sản phẩm bạn quan tâm…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground disabled:opacity-50 max-h-28 overflow-y-auto py-1.5"
              aria-label="Câu hỏi cho AI Assistant"
            />
            {isStreaming ? (
              <Button
                onClick={handleStop}
                type="button"
                variant="destructive"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                aria-label="Dừng tạo câu trả lời"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                aria-label="Gửi tin nhắn"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5 flex items-center justify-center gap-1.5">
            <Lightbulb className="h-3 w-3" aria-hidden="true" />
            AI có thể nhầm — sản phẩm/giá/tồn kho lấy từ DB cửa hàng
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────


function AssistantAvatar() {
  return (
    <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
      <Bot className="h-4 w-4 text-primary" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="shrink-0 h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center">
      <UserIcon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function MessageRow({ msg, onSuggestion }: { msg: ChatMessage; onSuggestion: (s: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {isUser ? <UserAvatar /> : <AssistantAvatar />}
      <div className={`flex-1 min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}>
        {/* Bubble — radius 18px, góc nhọn 4px phía đuôi (user: dưới-phải, bot: dưới-trái) */}
        <div
          className={`max-w-[85%] rounded-[18px] px-4 py-2.5 ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-[4px]"
              : "bg-muted text-foreground rounded-bl-[4px]"
          }`}
        >
          <p className="text-sm no-underline whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        </div>

        {/* Timestamp HH:mm dưới bubble */}
        {msg.createdAt && (
          <span className="mt-1 px-1 text-xs text-muted-foreground">
            {formatTime(msg.createdAt)}
          </span>
        )}

        {/* Products — scroll ngang, card 160px, snap-x mandatory */}
        {!isUser && msg.products && msg.products.length > 0 && (
          <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 pb-1 w-full max-w-2xl">
            {msg.products.map((item) => {
              const p = item.product;
              const hasSale = p.sale_price != null && p.sale_price < p.price;
              return (
                <Card
                  key={p.id}
                  className="snap-start shrink-0 w-40 overflow-hidden border-border/60 hover:shadow-md transition-all"
                >
                  <Link to={`/products/${p.id}`} className="block relative aspect-square bg-muted overflow-hidden">
                    {hasSale && <SaleBadge price={p.price} salePrice={p.sale_price!} />}
                    {p.image_url ? (
                      <OptimizedImage src={p.image_url} alt={p.name} width={160} height={160} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MessageSquareText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                  </Link>
                  <CardContent className="p-2.5 space-y-1.5">
                    <Link to={`/products/${p.id}`} className="block">
                      <p className="font-medium text-xs leading-snug line-clamp-2 min-h-[2rem] hover:text-primary transition-colors">{p.name}</p>
                    </Link>
                    {hasSale ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-destructive">{formatPrice(p.sale_price!)}</span>
                        <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.price)}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-primary">{formatPrice(p.price)}</span>
                    )}
                    {/* Lý do gợi ý từ AI (nếu có) */}
                    {item.reason && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium max-w-full">
                        <Sparkles className="h-2.5 w-2.5 shrink-0" />
                        <span className="line-clamp-1">{item.reason}</span>
                      </div>
                    )}
                    <Link to={`/products/${p.id}`} className="block">
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs rounded-lg">Xem</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Suggestion pills */}
        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(suggestion)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-accent/50 text-xs font-medium px-3 py-1.5 transition-colors"
              >
                <Lightbulb className="h-3 w-3 text-primary" aria-hidden="true" />
                <span className="line-clamp-1">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
