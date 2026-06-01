import { describe, it, expect } from "vitest"
import { formatPrice, formatDate } from "./format"

describe("formatPrice", () => {
  it("formats positive number with Vietnamese currency", () => {
    expect(formatPrice(100000)).toBe("100.000đ")
  })

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0đ")
  })

  it("formats large number with thousand separators", () => {
    expect(formatPrice(15000000)).toBe("15.000.000đ")
  })

  it("formats small number", () => {
    expect(formatPrice(50000)).toBe("50.000đ")
  })
})

describe("formatDate", () => {
  it("formats ISO date string to Vietnamese format", () => {
    const result = formatDate("2026-05-30T14:30:00Z")
    // Should contain date parts (day/month/year) and time
    expect(result).toContain("30")
    expect(result).toContain("05")
    expect(result).toContain("2026")
  })

  it("formats date string with time", () => {
    const result = formatDate("2026-01-15T09:00:00Z")
    expect(result).toContain("15")
    expect(result).toContain("01")
    expect(result).toContain("2026")
  })
})
