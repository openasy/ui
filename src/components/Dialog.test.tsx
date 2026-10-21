import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderUI } from "../test/render";
import { Button } from "./Button";
import { TextField } from "./Controls";
import { Dialog } from "./Dialog";

function AddPerson({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add person</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add a person"
        description="They get devices that may connect."
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(name);
          setOpen(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add
            </Button>
          </>
        }
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens over the page with its title and description, and focuses inside", async () => {
    const { user } = renderUI(<AddPerson onAdd={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Add person" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a person" });
    expect(dialog).toHaveAccessibleDescription("They get devices that may connect.");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("sends the form from the footer and with Enter", async () => {
    const onAdd = vi.fn();
    const { user } = renderUI(<AddPerson onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "Add person" }));
    await user.type(await screen.findByLabelText("Name"), "Dana{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Dana");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add person" }));
    await user.click(await screen.findByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it("closes with Escape and the close button, never with a click outside", async () => {
    const onOpenChange = vi.fn();
    const { user } = renderUI(
      <Dialog open onOpenChange={onOpenChange} title="Add a host">
        <p>Body</p>
      </Dialog>,
    );
    const overlay = document.querySelector(".bg-black\\/45") as HTMLElement;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    onOpenChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("shows an icon by the title and takes a size", () => {
    renderUI(
      <Dialog open onOpenChange={() => {}} title="Server added" icon={<svg data-testid="check" />} iconTone="success" size="lg">
        <p>Token</p>
      </Dialog>,
    );
    expect(screen.getByTestId("check").parentElement!.className).toContain("bg-success-soft");
    expect(screen.getByRole("dialog").className).toContain("max-w-2xl");
  });
});
