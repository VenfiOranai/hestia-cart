import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("It worked")}>fire success</button>
      <button onClick={() => toast.error("It broke")}>fire error</button>
    </div>
  );
}

describe("Toast", () => {
  // Fake timers let us step past the 2.8s auto-dismiss without actually waiting.
  // We use fireEvent (sync) instead of userEvent to avoid the known issue where
  // user-event's async scheduling stalls under vi.useFakeTimers().
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a pushed success toast", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("fire success"));
    expect(screen.getByRole("status")).toHaveTextContent("It worked");
  });

  it("auto-dismisses after the timeout", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("fire error"));
    expect(screen.getByRole("status")).toHaveTextContent("It broke");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("throws if useToast is used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/useToast must be used/);
    spy.mockRestore();
  });
});
