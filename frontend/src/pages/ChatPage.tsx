import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Sparkles, MessageSquare, Trash2 } from "lucide-react";
import { formatPrice } from "@/utils/format";
import { SaleBadge } from "@/components/common/SaleBadge";

const CHAT_STORAGE_KEY = "techsphere-chat-messages";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
}

interface ChatProductResult {
  product: Product;
  score: number;
  reason: string;
}

interface ChatResponse {
  message: string;
  reply: string;
  products: ChatProductResult[];
  total: number;
  suggestions: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: ChatProductResult[];
  suggestions?: string[];
}

const QUICK_PROMPTS = [
  "Tư vấn laptop Dell cho học tập",
  "Điện thoại Apple chụp ảnh đẹp",
  "Tai nghe chống ồn",
  "Sản phẩm giá rẻ",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await axiosClient.post("/api/ai/chat", { message, limit: 5 });
      return res.data as ChatResponse;
    },
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: variables },
        {
          role: "assistant",
          content: data.reply,
          products: data.products,
          suggestions: data.suggestions,
        },
      ]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Không thể kết nối AI");
    },
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const message = text || input.trim();
    if (!message || chatMutation.isPending) return;
    setInput("");
    chatMutation.mutate(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          AI Assistant
        </h1>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
            <Trash2 className="h-4 w-4 mr-1.5" />
            Cuộc trò chuyện mới
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">
              Hỏi tôi về sản phẩm phù hợp với nhu cầu của bạn
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="text-sm h-auto py-3 whitespace-normal text-left justify-start"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${msg.role === "user" ? "order-1" : ""}`}>
                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>

                {/* Products */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.products.map((item) => (
                      <Link key={item.product.id} to={`/products/${item.product.id}`}>
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer relative overflow-hidden">
                          {item.product.sale_price && item.product.sale_price < item.product.price && (
                            <SaleBadge price={item.product.price} salePrice={item.product.sale_price} />
                          )}
                          <CardContent className="flex items-center gap-3 py-3">
                            <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-lg shrink-0 overflow-hidden">
                              {item.product.image_url ? (
                                <OptimizedImage src={item.product.image_url} alt={item.product.name} width={48} height={48} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg" aria-hidden="true">📦</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.reason}</p>
                            </div>
                            <div className="text-right shrink-0">
                              {item.product.sale_price ? (
                                <p className="text-sm font-bold text-destructive">{formatPrice(item.product.sale_price)}</p>
                              ) : (
                                <p className="text-sm font-bold">{formatPrice(item.product.price)}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-muted-foreground"
                        onClick={() => handleSend(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <p className="text-sm text-muted-foreground animate-pulse">Đang suy nghĩ...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Hỏi về sản phẩm bạn quan tâm..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={chatMutation.isPending}
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || chatMutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
