import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label. */
  icon?: ReactNode;
  /** Icon after the label. */
  iconRight?: ReactNode;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast border-accent hover:bg-accent-hover hover:border-accent-hover",
  secondary: "bg-surface text-fg border-line-strong hover:bg-subtle",
  ghost: "bg-transparent text-fg border-transparent hover:bg-subtle",
  danger: "bg-danger text-white border-danger hover:brightness-90",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-xs gap-1 [&_svg]:size-3.5",
  sm: "h-7 px-2.5 text-xs gap-1.5 [&_svg]:size-3.5",
  md: "h-8 px-3 text-sm gap-1.5 [&_svg]:size-4",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, loading = false, disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border font-medium whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "icon" | "iconRight" | "children"> {
  /** Required: icon-only buttons must be named for screen readers. */
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", variant = "ghost", className, children, ...rest },
  ref,
) {
  const square = size === "xs" ? "w-6 px-0" : size === "sm" ? "w-7 px-0" : "w-8 px-0";
  return (
    <Button ref={ref} aria-label={label} title={label} size={size} variant={variant} className={cn(square, className)} {...rest}>
      {children}
    </Button>
  );
});
