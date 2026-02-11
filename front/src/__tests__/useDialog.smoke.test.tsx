import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useDialog } from "../hooks/useDialog";

function markVisible(element: HTMLElement) {
  Object.defineProperty(element, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
}

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useDialog(open, () => setOpen(false));

  return (
    <div>
      <button type="button">Outside action</button>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          tabIndex={-1}
        >
          <h2 id="dialog-title">Smoke dialog</h2>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
    </div>
  );
}

describe("useDialog smoke", () => {
  it("traps focus, restores focus, and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const openButton = screen.getByRole("button", { name: "Open dialog" });
    const outsideButton = screen.getByRole("button", { name: "Outside action" });
    outsideButton.focus();
    expect(outsideButton).toHaveFocus();

    await user.click(openButton);

    const dialog = screen.getByRole("dialog", { name: "Smoke dialog" });
    const firstAction = within(dialog).getByRole("button", { name: "First action" });
    const lastAction = within(dialog).getByRole("button", { name: "Last action" });
    markVisible(firstAction);
    markVisible(lastAction);

    await waitFor(() => {
      expect(firstAction).toHaveFocus();
    });
    expect(document.body.style.overflow).toBe("hidden");

    await user.tab();
    expect(lastAction).toHaveFocus();

    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastAction).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Smoke dialog" })).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("");
    expect(openButton).toHaveFocus();
  });
});
