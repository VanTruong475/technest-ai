import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useRecentlyViewed, getRecentlyViewed, addToRecentlyViewed } from "./useRecentlyViewed"
import type { RecentlyViewedProduct } from "./useRecentlyViewed"

const STORAGE_KEY = "techsphere_recently_viewed"

const mockProduct: RecentlyViewedProduct = {
  id: 1,
  name: "iPhone 15 Pro",
  image_url: "https://example.com/iphone.jpg",
  price: 30000000,
  sale_price: 28000000,
}

const mockProduct2: RecentlyViewedProduct = {
  id: 2,
  name: "Samsung Galaxy S24",
  image_url: "https://example.com/samsung.jpg",
  price: 25000000,
  sale_price: null,
}

describe("useRecentlyViewed", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns empty array when no items stored", () => {
    const { result } = renderHook(() => useRecentlyViewed())
    expect(result.current.getRecentlyViewed()).toEqual([])
  })

  it("adds a product to recently viewed", () => {
    const { result } = renderHook(() => useRecentlyViewed())
    act(() => {
      result.current.addToRecentlyViewed(mockProduct)
    })
    const items = result.current.getRecentlyViewed()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(1)
  })

  it("moves duplicate product to front", () => {
    const { result } = renderHook(() => useRecentlyViewed())
    act(() => {
      result.current.addToRecentlyViewed(mockProduct)
      result.current.addToRecentlyViewed(mockProduct2)
      result.current.addToRecentlyViewed(mockProduct)
    })
    const items = result.current.getRecentlyViewed()
    expect(items).toHaveLength(2)
    expect(items[0].id).toBe(1)
    expect(items[1].id).toBe(2)
  })

  it("limits items to MAX_ITEMS (10)", () => {
    const { result } = renderHook(() => useRecentlyViewed())
    act(() => {
      for (let i = 1; i <= 15; i++) {
        result.current.addToRecentlyViewed({
          ...mockProduct,
          id: i,
          name: `Product ${i}`,
        })
      }
    })
    const items = result.current.getRecentlyViewed()
    expect(items).toHaveLength(10)
    expect(items[0].id).toBe(15) // Most recent first
  })
})

describe("getRecentlyViewed (standalone)", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns empty array when localStorage is empty", () => {
    expect(getRecentlyViewed()).toEqual([])
  })

  it("returns parsed items from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([mockProduct]))
    expect(getRecentlyViewed()).toEqual([mockProduct])
  })

  it("handles invalid JSON gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "invalid json")
    expect(getRecentlyViewed()).toEqual([])
  })

  it("handles non-array JSON gracefully", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ invalid: true }))
    expect(getRecentlyViewed()).toEqual([])
  })
})

describe("addToRecentlyViewed (standalone)", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("adds product to localStorage", () => {
    addToRecentlyViewed(mockProduct)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(1)
  })

  it("deduplicates by id", () => {
    addToRecentlyViewed(mockProduct)
    addToRecentlyViewed(mockProduct2)
    addToRecentlyViewed(mockProduct)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    expect(stored).toHaveLength(2)
    expect(stored[0].id).toBe(1) // Moved to front
  })
})
