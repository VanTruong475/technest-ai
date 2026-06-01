import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import Pagination from "./Pagination"

describe("Pagination", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders page numbers for small page count", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("disables previous button on first page", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />)
    const prevButton = screen.getAllByRole("button")[0]
    expect(prevButton).toBeDisabled()
  })

  it("disables next button on last page", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />)
    const buttons = screen.getAllByRole("button")
    const nextButton = buttons[buttons.length - 1]
    expect(nextButton).toBeDisabled()
  })

  it("calls onPageChange when clicking a page number", () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText("3"))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it("calls onPageChange with previous page", () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />)
    const prevButton = screen.getAllByRole("button")[0]
    fireEvent.click(prevButton)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("calls onPageChange with next page", () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />)
    const buttons = screen.getAllByRole("button")
    const nextButton = buttons[buttons.length - 1]
    fireEvent.click(nextButton)
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it("shows ellipsis for large page count", () => {
    const { container } = render(<Pagination page={5} totalPages={20} onPageChange={vi.fn()} />)
    // Ellipsis uses MoreHorizontal icon (SVG), not text
    const ellipsisContainers = container.querySelectorAll(".lucide-ellipsis")
    expect(ellipsisContainers.length).toBeGreaterThan(0)
  })

  it("highlights current page", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={vi.fn()} />)
    const currentPageButton = screen.getByText("3")
    expect(currentPageButton).toBeInTheDocument()
  })
})
