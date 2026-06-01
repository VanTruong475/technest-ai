import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SaleBadge } from "./SaleBadge"

describe("SaleBadge", () => {
  it("renders discount percentage correctly", () => {
    render(<SaleBadge price={1000} salePrice={800} />)
    expect(screen.getByText("-20%")).toBeInTheDocument()
  })

  it("renders 50% discount", () => {
    render(<SaleBadge price={2000} salePrice={1000} />)
    expect(screen.getByText("-50%")).toBeInTheDocument()
  })

  it("renders small discount", () => {
    render(<SaleBadge price={1000} salePrice={950} />)
    expect(screen.getByText("-5%")).toBeInTheDocument()
  })

  it("renders large discount", () => {
    render(<SaleBadge price={1000} salePrice={100} />)
    expect(screen.getByText("-90%")).toBeInTheDocument()
  })
})
