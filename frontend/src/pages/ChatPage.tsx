import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Sparkles, Trash2, User as UserIcon, MessageSquareText,
  Lightbulb,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import { getErrorMessage } from "@/utils/api";
import { SaleBadge } from "@/components/common/SaleBadge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { streamChat } from "@/lib/aiStream";
import type { AISearchResult, ChatMessage } from "@/types";

const CHAT_STORAGE_KEY = "techsphere-chat-messages";

const QUICK_PROMPTS = [
  { icon: "💻", text: "Tư vấn laptop Dell cho học tập" },
  { icon: "📱", text: "Điện thoại Apple chụp ảnh đẹp" },
  { icon: "🎧", text: "Tai nghe chống ồn pin lâu" },
  { icon: "💰", text: "Sản phẩm giá rẻ dưới 5 triệu" },
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
    setMessages((prev) => [...prev, { role: "user", content: message }]);

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
        { role: "assistant", content: acc, products, suggestions },
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

              {/* Quick prompts với icon emoji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5 transition-all px-4 py-3 text-left"
                    onClick={() => handleSend(prompt.text)}
                  >
                    <span className="text-xl shrink-0" aria-hidden="true">{prompt.icon}</span>
                    <span className="text-sm font-medium leading-snug">{prompt.text}</span>
                    <Send className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
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
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%]">
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
          <div className="flex items-center gap-2 rounded-full border border-border bg-background pl-4 pr-1.5 py-1.5 shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all">
            <input
              type="text"
              placeholder="Hỏi mình về sản phẩm bạn quan tâm…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground disabled:opacity-50"
              aria-label="Câu hỏi cho AI Assistant"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
              aria-label="Gửi tin nhắn"
            >
              <Send className="h-4 w-4" />
            </Button>
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
    <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm">
      <Sparkles className="h-4 w-4 text-primary-foreground" />
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
        {/* Bubble — corner radius khác bên user/assistant để có chat feel */}
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          }`}
        >
          <p className="text-sm no-underline whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        </div>

        {/* Products grid — 1 col mobile, 2 col từ md để compact hơn */}
        {!isUser && msg.products && msg.products.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
            {msg.products.map((item) => (
              <Link key={item.product.id} to={`/products/${item.product.id}`}>
                <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden border-border/60 h-full">
                  {item.product.sale_price && item.product.sale_price < item.product.price && (
                    <SaleBadge price={item.product.price} salePrice={item.product.sale_price} />
                  )}
                  <CardContent className="flex items-center gap-3 py-3 px-3">
                    <div className="w-14 h-14 bg-muted flex items-center justify-center rounded-lg shrink-0 overflow-hidden">
                      {item.product.image_url ? (
                        <OptimizedImage src={item.product.image_url} alt={item.product.name} width={56} height={56} className="w-full h-full object-cover" />
                      ) : (
                        <MessageSquareText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
                      {item.product.sale_price ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm font-bold text-destructive">{formatPrice(item.product.sale_price)}</span>
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(item.product.price)}</span>
                        </div>
                      ) : (
                        <p className="text-sm font-bold mt-0.5">{formatPrice(item.product.price)}</p>
                      )}
                      {/* Lý do gợi ý từ AI */}
                      {item.reason && (
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium max-w-full">
                          <Sparkles className="h-2.5 w-2.5 shrink-0" />
                          <span className="line-clamp-1">{item.reason}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
