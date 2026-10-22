import { useRef, useState, type KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Languages } from "lucide-react";
import { cn } from "../lib/cn";

export interface Language {
  /** A language tag, such as "en" or "tr". */
  code: string;
  /** The language's name in that language, such as "Türkçe", so people find their own. */
  name: string;
}

export interface LanguageMenuProps {
  value: string;
  languages: Language[];
  onChange: (code: string) => void;
  className?: string;
}

/**
 * One button that opens the languages to choose from. The shell puts it next
 * to the theme menu when a product gives it languages.
 */
export function LanguageMenu({ value, languages, onChange, className }: LanguageMenuProps) {
  const [open, setOpen] = useState(false);
  const items = useRef<Array<HTMLButtonElement | null>>([]);
  const current = languages.find((l) => l.code === value);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const at = items.current.findIndex((el) => el === document.activeElement);
    const next = (at + (e.key === "ArrowDown" ? 1 : languages.length - 1)) % languages.length;
    items.current[next]?.focus();
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={current ? `Language: ${current.name}` : "Language"}
        title="Language"
        className={cn("grid size-10 place-items-center rounded-md", className)}
      >
        <Languages aria-hidden className="size-[18px]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            items.current[Math.max(0, languages.findIndex((l) => l.code === value))]?.focus();
          }}
          className="oa-root z-50 w-48 rounded-lg border border-line bg-surface p-1 shadow-overlay"
        >
          <div role="menu" aria-label="Language" onKeyDown={onKey} className="flex flex-col gap-0.5">
            {languages.map((l, i) => {
              const on = l.code === value;
              return (
                <button
                  key={l.code}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  lang={l.code}
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm",
                    on ? "bg-accent-soft font-medium text-accent-text" : "text-fg hover:bg-subtle",
                  )}
                >
                  <Check aria-hidden className={cn("size-4 shrink-0", !on && "invisible")} />
                  {l.name}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
