import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowLeft, Building2, Fingerprint, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { useBrand } from "../../components/BrandProvider";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { TextField } from "../../components/Controls";

const meta = {
  title: "Identity/Sign-in",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Brand logo, theme-aware, or a square with the first letter of the brand name. */
function BrandMark({ size = 40 }: { size?: number }) {
  const { brand, theme } = useBrand();
  const logo = theme === "dark" ? (brand.logoDarkUrl ?? brand.logoUrl) : brand.logoUrl;
  if (logo) return <img src={logo} alt="" width={size} height={size} className="rounded-lg object-contain" />;
  return (
    <span aria-hidden className="grid place-items-center rounded-lg bg-accent text-lg font-semibold text-accent-contrast" style={{ width: size, height: size }}>
      {brand.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function AuthLayout({ children }: { children: ReactNode }) {
  const { brand } = useBrand();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 py-10 text-fg">
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-raised">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark />
          <span className="text-sm font-semibold text-fg">{brand.name}</span>
          {brand.organization && <span className="-mt-1.5 text-xs text-fg-muted">{brand.organization}</span>}
        </div>
        {children}
      </div>
      <footer className="flex flex-col items-center gap-1 text-xs text-fg-muted">
        <span>
          <a href="#privacy" className="text-fg-muted hover:text-fg">
            Privacy
          </a>{" "}
          ·{" "}
          <a href="#help" className="text-fg-muted hover:text-fg">
            Help
          </a>
        </span>
        {!brand.hidePoweredBy && <span>Powered by OpenAsy</span>}
      </footer>
    </main>
  );
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-fg-muted">
      <span aria-hidden className="h-px grow bg-line" />
      {children}
      <span aria-hidden className="h-px grow bg-line" />
    </div>
  );
}

/** Email and password, then SSO providers. */
export const Default: Story = {
  render: () => {
    const { brand } = useBrand();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const submit = (e: FormEvent) => {
      e.preventDefault();
      setError(email && password ? null : "Enter your email and password.");
    };
    return (
      <AuthLayout>
        <h1 className="text-center text-lg font-semibold text-fg">Sign in to {brand.name}</h1>
        {error && (
          <Callout tone="danger" title="Could not sign in">
            {error}
          </Callout>
        )}
        <form className="flex flex-col gap-2.5" onSubmit={submit} noValidate>
          <TextField label="Email" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={
              <a href="#reset" className="text-accent-text">
                Forgot password?
              </a>
            }
          />
          <Button type="submit" variant="primary" icon={<LogIn />} className="w-full">
            Sign in
          </Button>
        </form>
        <Divider>or</Divider>
        <div className="flex flex-col gap-1.5">
          <Button className="w-full" icon={<Fingerprint />}>
            Continue with OpenAsy Identity
          </Button>
          <Button className="w-full" icon={<KeyRound />}>
            Continue with Keycloak
          </Button>
          <Button className="w-full" icon={<Building2 />}>
            Continue with SAML SSO
          </Button>
        </div>
      </AuthLayout>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: /^Sign in to / })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Sign in" }));
    await expect(c.getByRole("alert")).toHaveTextContent("Enter your email and password.");
    await userEvent.type(c.getByLabelText("Email"), "elif.arslan@example.com");
    await userEvent.type(c.getByLabelText("Password"), "correct horse battery");
    await userEvent.click(c.getByRole("button", { name: "Sign in" }));
    await expect(c.queryByRole("alert")).not.toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Continue with SAML SSO" })).toBeInTheDocument();
  },
};

const DIGITS = 6;

function CodeInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const focus = (i: number) => refs.current[Math.max(0, Math.min(DIGITS - 1, i))]?.focus();
  const setAt = (i: number, ch: string) => {
    const next = value.slice();
    next[i] = ch;
    onChange(next);
  };
  const onInput = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, "").slice(-1);
    setAt(i, ch);
    if (ch && i < DIGITS - 1) focus(i + 1);
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!digits) return;
    e.preventDefault();
    onChange(Array.from({ length: DIGITS }, (_, k) => digits[k] ?? ""));
    focus(digits.length);
  };
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-fg">Authentication code</legend>
      <div className="flex justify-between gap-1.5">
        {Array.from({ length: DIGITS }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1}`}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={value[i] ?? ""}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 w-10 rounded-md border border-line-strong bg-surface text-center font-mono text-lg text-fg"
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Second step: a six-digit TOTP code or a passkey. */
export const MfaStep: Story = {
  render: () => {
    const { brand } = useBrand();
    const [code, setCode] = useState<string[]>(Array(DIGITS).fill(""));
    const [verified, setVerified] = useState(false);
    const complete = code.every((d) => d !== "");
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-lg font-semibold text-fg">Two-step verification</h1>
          <p className="text-sm text-fg-muted">Enter the 6-digit code from your authenticator app for elif.arslan@example.com.</p>
        </div>
        {verified && (
          <Callout tone="success" title="Verified">
            Redirecting to {brand.name}…
          </Callout>
        )}
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setVerified(true);
          }}
        >
          <CodeInput value={code} onChange={setCode} />
          <Button type="submit" variant="primary" icon={<ShieldCheck />} className="w-full" disabled={!complete}>
            Verify
          </Button>
        </form>
        <Divider>or</Divider>
        <Button className="w-full" icon={<Fingerprint />}>
          Use a passkey instead
        </Button>
        <div className="flex items-center justify-between text-xs">
          <Button size="xs" variant="ghost" icon={<ArrowLeft />}>
            Back
          </Button>
          <a href="#recovery" className="text-accent-text">
            Use a recovery code
          </a>
        </div>
      </AuthLayout>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const verify = c.getByRole("button", { name: "Verify" });
    await expect(verify).toBeDisabled();
    await userEvent.click(c.getByLabelText("Digit 1"));
    await userEvent.keyboard("48");
    await expect(c.getByLabelText("Digit 3")).toHaveFocus();
    await userEvent.keyboard("2915");
    await expect(c.getByLabelText("Digit 6")).toHaveFocus();
    await expect(c.getByLabelText("Digit 6")).toHaveValue("5");
    await expect(verify).toBeEnabled();
    await userEvent.keyboard("{Backspace}{Backspace}");
    await expect(c.getByLabelText("Digit 5")).toHaveFocus();
    await expect(verify).toBeDisabled();
    await userEvent.keyboard("15");
    await userEvent.click(verify);
    await expect(c.getByText("Verified")).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Use a passkey instead" })).toBeInTheDocument();
  },
};
