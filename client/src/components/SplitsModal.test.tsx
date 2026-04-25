import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { SplitsResponse } from "shared";
import SplitsModal from "./SplitsModal";

function makeSplits(): SplitsResponse {
  const alice = {
    id: 1,
    name: "Alice",
    color: "#4f46e5",
    createdAt: new Date("2025-01-01").toISOString(),
  };
  const bob = {
    id: 2,
    name: "Bob",
    color: "#10b981",
    createdAt: new Date("2025-01-01").toISOString(),
  };
  return {
    totalCents: 4210,
    debts: [
      { from: bob, to: alice, amountCents: 1250 },
      { from: alice, to: bob, amountCents: 820 },
    ],
  };
}

describe("SplitsModal", () => {
  it("renders the total and one row per debt", () => {
    const onClose = vi.fn();
    render(<SplitsModal splits={makeSplits()} onClose={onClose} />);

    expect(screen.getByRole("heading", { name: "Cost Splitting" })).toBeInTheDocument();
    expect(screen.getByText(/total purchased: \$42\.10/i)).toBeInTheDocument();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Bob");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[0]).toHaveTextContent("$12.50");
    expect(rows[1]).toHaveTextContent("$8.20");
  });

  it("calls onClose when the × button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SplitsModal splits={makeSplits()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /close splits/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <SplitsModal splits={makeSplits()} onClose={onClose} />,
    );

    // Backdrop is the absolute-positioned dim layer behind the modal panel.
    const backdrop = container.querySelector(".bg-black\\/40") as HTMLElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
