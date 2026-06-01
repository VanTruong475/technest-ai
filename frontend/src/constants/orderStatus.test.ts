import { describe, it, expect } from "vitest"
import {
  ORDER_STATUS_MAP,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_MAP,
  PAYMENT_METHOD_MAP,
  PRODUCT_STATUS_LABELS,
} from "./orderStatus"

describe("ORDER_STATUS_MAP", () => {
  it("has all required statuses", () => {
    expect(ORDER_STATUS_MAP).toHaveProperty("PENDING")
    expect(ORDER_STATUS_MAP).toHaveProperty("CONFIRMED")
    expect(ORDER_STATUS_MAP).toHaveProperty("SHIPPING")
    expect(ORDER_STATUS_MAP).toHaveProperty("COMPLETED")
    expect(ORDER_STATUS_MAP).toHaveProperty("CANCELLED")
  })

  it("each status has label and color", () => {
    for (const [key, value] of Object.entries(ORDER_STATUS_MAP)) {
      expect(value).toHaveProperty("label")
      expect(value).toHaveProperty("color")
      expect(typeof value.label).toBe("string")
      expect(typeof value.color).toBe("string")
    }
  })
})

describe("ORDER_STATUS_OPTIONS", () => {
  it("contains all statuses", () => {
    expect(ORDER_STATUS_OPTIONS).toHaveLength(5)
    expect(ORDER_STATUS_OPTIONS).toContain("PENDING")
    expect(ORDER_STATUS_OPTIONS).toContain("COMPLETED")
  })
})

describe("PAYMENT_STATUS_MAP", () => {
  it("has all payment statuses", () => {
    expect(PAYMENT_STATUS_MAP).toHaveProperty("UNPAID")
    expect(PAYMENT_STATUS_MAP).toHaveProperty("PENDING")
    expect(PAYMENT_STATUS_MAP).toHaveProperty("PAID")
    expect(PAYMENT_STATUS_MAP).toHaveProperty("FAILED")
  })
})

describe("PAYMENT_METHOD_MAP", () => {
  it("has COD and VNPAY", () => {
    expect(PAYMENT_METHOD_MAP).toHaveProperty("COD")
    expect(PAYMENT_METHOD_MAP).toHaveProperty("VNPAY")
  })
})

describe("PRODUCT_STATUS_LABELS", () => {
  it("has ACTIVE and INACTIVE", () => {
    expect(PRODUCT_STATUS_LABELS).toHaveProperty("ACTIVE")
    expect(PRODUCT_STATUS_LABELS).toHaveProperty("INACTIVE")
    expect(PRODUCT_STATUS_LABELS.ACTIVE).toBe("Đang bán")
    expect(PRODUCT_STATUS_LABELS.INACTIVE).toBe("Ngừng bán")
  })
})
