// Client cho endpoint streaming /api/ai/chat/stream (Server-Sent Events).
//
// Dùng fetch + ReadableStream thay vì axios vì axios trong browser buffer toàn
// bộ response, không cho đọc từng chunk. Token AI được phát dần qua onToken,
// metadata (products/suggestions/total từ DB) tới 1 lần qua onDone ở cuối.
import type { AISearchResult } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface StreamDoneData {
  products: AISearchResult[];
  suggestions: string[];
  total: number;
}

interface StreamChatCallbacks {
  onToken: (text: string) => void;
  onDone: (data: StreamDoneData) => void;
}

/**
 * Parse 1 SSE event block (đã tách theo `\n\n`) → object JSON, hoặc null nếu
 * không có dòng `data:` hợp lệ. Một event có thể trải nhiều dòng `data:` nên
 * ghép lại trước khi JSON.parse (theo spec SSE).
 */
export function parseSSEEvent(
  raw: string
): { type?: string; text?: string } & Partial<StreamDoneData> | null {
  const dataLines = raw
    .split("\n")
    .filter((line) => line.startsWith("data:"));
  if (dataLines.length === 0) return null;

  const payload = dataLines
    .map((line) => line.slice("data:".length).replace(/^ /, ""))
    .join("");
  if (!payload) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Gọi endpoint streaming, phát token qua callback. Resolve khi stream kết thúc;
 * reject nếu request lỗi (HTTP non-2xx, mất mạng) — caller tự fallback/rollback.
 * Truyền `signal` để hủy (clear chat / unmount).
 */
export async function streamChat(
  message: string,
  history: ChatHistoryItem[],
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, limit: 5, history }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events SSE ngăn cách bởi dòng trống (`\n\n`). Xử lý hết event hoàn chỉnh
    // trong buffer, giữ lại phần dở dang cho lần read kế.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      const event = parseSSEEvent(rawEvent);
      if (!event) continue;

      if (event.type === "token") {
        callbacks.onToken(event.text ?? "");
      } else if (event.type === "done") {
        callbacks.onDone({
          products: event.products ?? [],
          suggestions: event.suggestions ?? [],
          total: event.total ?? 0,
        });
      }
    }
  }
}
