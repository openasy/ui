import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Check, Copy } from "lucide-react";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Checkbox, TextField } from "../../components/Controls";
import { Dialog } from "../../components/Dialog";

const meta = {
  title: "Feedback/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
  args: { open: false, onOpenChange: () => {}, title: "Add a person" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Adding something: the page stays as it is and the form opens over it. */
export const AddForm: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Add person
        </Button>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Add a person"
          description="They get devices that may connect. Signing in to this VPN product is under Members."
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
          footer={
            <>
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add person
              </Button>
            </>
          }
        >
          <TextField label="Name" placeholder="Dana Kim" />
          <TextField label="Email" type="email" placeholder="dana@example.com" />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Groups</legend>
            <Checkbox label="Engineering" />
            <Checkbox label="Support" />
          </fieldset>
        </Dialog>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog", { name: "Add a person" });
    await expect(dialog).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
  },
};

/** A value shown once, such as an enrolment token, stays in the dialog until it is copied. */
export const OneTimeValue: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Show again</Button>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          icon={<Check aria-hidden className="size-4" />}
          iconTone="success"
          title="Server added. Start it with this token"
          description="The token is shown once and works for 24 hours."
          footer={
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          }
        >
          <div className="flex gap-2">
            <code className="flex h-8 min-w-0 grow items-center truncate rounded-md border border-line bg-subtle px-2 font-mono text-xs">
              olg_example-token-shown-once
            </code>
            <Button icon={<Copy aria-hidden className="size-3.5" />}>Copy</Button>
          </div>
          <Callout tone="warning" title="Closing this dialog hides the token" />
        </Dialog>
      </>
    );
  },
};
