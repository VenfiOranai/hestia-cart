import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import AddItemForm from "./AddItemForm";

describe("AddItemForm", () => {
  it("disables the input and button when no user is signed in", () => {
    render(<AddItemForm userId={null} onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText(/join the list/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });

  it("keeps the Add button disabled until the input has content", async () => {
    const user = userEvent.setup();
    render(<AddItemForm userId={1} onSubmit={vi.fn()} />);

    const button = screen.getByRole("button", { name: /add/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/add an item/i), "milk");
    expect(button).toBeEnabled();
  });

  it("submits the trimmed name, calls onSubmit, and clears the input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddItemForm userId={1} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText(/add an item/i) as HTMLInputElement;
    await user.type(input, "  eggs  ");
    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(onSubmit).toHaveBeenCalledWith("eggs");
    expect(input.value).toBe("");
  });

  it("does nothing when the input is only whitespace", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddItemForm userId={1} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText(/add an item/i);
    await user.type(input, "   ");
    // The button stays disabled, but submitting the form via Enter shouldn't fire onSubmit either.
    await user.type(input, "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
