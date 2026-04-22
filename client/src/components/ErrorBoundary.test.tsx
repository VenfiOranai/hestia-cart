import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";

function Boom({ blow }: { blow: boolean }) {
  if (blow) throw new Error("kaboom");
  return <p>all good</p>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <Boom blow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("shows the fallback UI when a child throws during render", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom blow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("resets its state when Try again is clicked", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    function Harness() {
      // Ref-flag so we can flip the child from a button, outside of ErrorBoundary.
      const [blow, setBlow] = React.useState(true);
      return (
        <>
          <button onClick={() => setBlow(false)}>fix it</button>
          <ErrorBoundary>
            <Boom blow={blow} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Fix the underlying state first, then click Try again to clear the boundary.
    await user.click(screen.getByText("fix it"));
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("all good")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
