import { describe, it, expect } from "vitest"
import { AxiosError } from "axios"
import { getErrorMessage } from "./api"

describe("getErrorMessage", () => {
  it("returns detail from AxiosError response", () => {
    const err = new AxiosError("Request failed")
    err.response = {
      data: { detail: "Email already registered" },
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: {} as never,
    }
    expect(getErrorMessage(err)).toBe("Email already registered")
  })

  it("returns fallback when AxiosError has no detail", () => {
    const err = new AxiosError("Request failed")
    err.response = {
      data: {},
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      config: {} as never,
    }
    expect(getErrorMessage(err, "Server error")).toBe("Server error")
  })

  it("returns error message from regular Error", () => {
    const err = new Error("Something went wrong")
    expect(getErrorMessage(err)).toBe("Something went wrong")
  })

  it("returns fallback for regular Error with empty message", () => {
    const err = new Error("")
    expect(getErrorMessage(err, "Unknown error")).toBe("Unknown error")
  })

  it("returns fallback for unknown error type", () => {
    expect(getErrorMessage("string error", "Default message")).toBe("Default message")
  })

  it("returns fallback for null/undefined", () => {
    expect(getErrorMessage(null)).toBe("Có lỗi xảy ra")
    expect(getErrorMessage(undefined)).toBe("Có lỗi xảy ra")
  })

  it("uses custom fallback", () => {
    expect(getErrorMessage(null, "Custom fallback")).toBe("Custom fallback")
  })
})
