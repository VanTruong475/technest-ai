import { describe, it, expect } from "vitest"
import { getOptimizedImageUrl } from "./cloudinary"

describe("getOptimizedImageUrl", () => {
  it("returns empty string for null/undefined", () => {
    expect(getOptimizedImageUrl(null, 400)).toBe("")
    expect(getOptimizedImageUrl(undefined, 400)).toBe("")
  })

  it("returns non-Cloudinary URL unchanged", () => {
    const url = "https://example.com/image.jpg"
    expect(getOptimizedImageUrl(url, 400)).toBe(url)
  })

  it("inserts transformations into Cloudinary URL", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg"
    const result = getOptimizedImageUrl(url, 400)
    expect(result).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1234/sample.jpg")
  })

  it("handles Cloudinary URL without version prefix", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    const result = getOptimizedImageUrl(url, 600)
    expect(result).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/sample.jpg")
  })

  it("preserves different widths", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"
    expect(getOptimizedImageUrl(url, 200)).toContain("w_200")
    expect(getOptimizedImageUrl(url, 800)).toContain("w_800")
  })
})
