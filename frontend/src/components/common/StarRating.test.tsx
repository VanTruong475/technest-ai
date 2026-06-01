import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { StarRating } from "./StarRating"

describe("StarRating", () => {
  it("renders correct number of stars", () => {
    const { container } = render(<StarRating rating={3} />)
    const stars = container.querySelectorAll("svg")
    expect(stars).toHaveLength(5)
  })

  it("renders custom maxRating", () => {
    const { container } = render(<StarRating rating={3} maxRating={10} />)
    const stars = container.querySelectorAll("svg")
    expect(stars).toHaveLength(10)
  })

  it("fills stars up to rating value", () => {
    const { container } = render(<StarRating rating={3} />)
    const filledStars = container.querySelectorAll(".fill-yellow-400")
    expect(filledStars).toHaveLength(3)
  })

  it("renders all empty when rating is 0", () => {
    const { container } = render(<StarRating rating={0} />)
    const emptyStars = container.querySelectorAll(".fill-none")
    expect(emptyStars).toHaveLength(5)
  })

  it("renders all filled when rating equals maxRating", () => {
    const { container } = render(<StarRating rating={5} />)
    const filledStars = container.querySelectorAll(".fill-yellow-400")
    expect(filledStars).toHaveLength(5)
  })

  it("calls onRatingChange when interactive and clicked", () => {
    const onChange = vi.fn()
    render(<StarRating rating={0} interactive onRatingChange={onChange} />)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[2]) // Click 3rd star
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("does not call onRatingChange when not interactive", () => {
    const onChange = vi.fn()
    render(<StarRating rating={3} onRatingChange={onChange} />)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[0])
    expect(onChange).not.toHaveBeenCalled()
  })

  it("disables buttons when not interactive", () => {
    render(<StarRating rating={3} />)
    const buttons = screen.getAllByRole("button")
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
