import { describe, it, expect } from "vitest";
import { parseSSEEvent } from "./aiStream";

describe("parseSSEEvent", () => {
  it("parses a token event", () => {
    const evt = parseSSEEvent('data: {"type":"token","text":"xin chào"}');
    expect(evt).toEqual({ type: "token", text: "xin chào" });
  });

  it("parses a done event with products/suggestions", () => {
    const evt = parseSSEEvent(
      'data: {"type":"done","products":[],"suggestions":["a"],"total":3}'
    );
    expect(evt?.type).toBe("done");
    expect(evt?.suggestions).toEqual(["a"]);
    expect(evt?.total).toBe(3);
  });

  it("joins multiple data: lines in one event (SSE spec)", () => {
    const raw = 'data: {"type":"token",\ndata: "text":"abc"}';
    expect(parseSSEEvent(raw)).toEqual({ type: "token", text: "abc" });
  });

  it("strips a single leading space after data:", () => {
    expect(parseSSEEvent('data:{"type":"token","text":"x"}')).toEqual({
      type: "token",
      text: "x",
    });
  });

  it("returns null when there is no data: line", () => {
    expect(parseSSEEvent(": keep-alive comment")).toBeNull();
    expect(parseSSEEvent("event: ping")).toBeNull();
    expect(parseSSEEvent("")).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(parseSSEEvent("data: not-json")).toBeNull();
  });

  it("returns null on empty payload", () => {
    expect(parseSSEEvent("data: ")).toBeNull();
  });
});
