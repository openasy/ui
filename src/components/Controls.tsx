import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown, CircleAlert, Search } from "lucide-react";
import { cn } from "../lib/cn";

const field =
  "h-8 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-fg placeholder:text-fg-subtle disabled:bg-subtle disabled:text-fg-subtle";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  mono?: boolean;
  /** Content inside the field on the right, e.g. "256 addresses". */
  adornment?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, mono, adornment, id, className, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? hintId : undefined}
          className={cn(field, mono && "font-mono", error && "border-danger", adornment && "pr-24")}
          {...rest}
        />
        {adornment && <span className="absolute inset-y-0 right-1.5 flex items-center">{adornment}</span>}
      </div>
      {error ? (
        <span id={hintId} className="flex items-center gap-1 text-xs text-danger-text">
          <CircleAlert aria-hidden className="size-3.5" />
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-xs text-fg-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  options: Array<{ value: string; label: string }>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField({ label, options, id, className, ...rest }, ref) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-fg">
          {label}
        </label>
      )}
      <div className="relative">
        <select ref={ref} id={selectId} className={cn(field, "appearance-none pr-8")} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-2 right-2 size-4 text-fg-muted" />
      </div>
    </div>
  );
});

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  /** Accessible label; also used as placeholder when none is given. */
  label: string;
  /** Keyboard hint shown on the right, e.g. "/". */
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ label, shortcut, className, placeholder, ...rest }, ref) {
  return (
    <div className={cn("relative flex h-8 items-center", className)}>
      <Search aria-hidden className="pointer-events-none absolute left-2.5 size-3.5 text-fg-muted" />
      <input ref={ref} type="search" aria-label={label} placeholder={placeholder ?? label} className={cn(field, "pl-8", shortcut && "pr-8")} {...rest} />
      {shortcut && <kbd className="pointer-events-none absolute right-2 rounded border border-line px-1 font-mono text-2xs text-fg-muted">{shortcut}</kbd>}
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, ...rest }, ref) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2 text-sm", className)}>
      <input ref={ref} type="checkbox" className="mt-0.5 size-3.5 accent-[var(--oa-accent)]" {...rest} />
      <span className="flex flex-col">
        <span className="text-fg">{label}</span>
        {description && <span className="text-xs text-fg-muted">{description}</span>}
      </span>
    </label>
  );
});

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="flex flex-col">
        <span id={id} className="text-sm font-medium text-fg">
          {label}
        </span>
        {description && <span className="text-xs text-fg-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span className={cn("size-4 rounded-full bg-white shadow-raised transition-transform", checked && "translate-x-4")} />
      </button>
    </div>
  );
}
