import { cn } from "../lib/cn";

const tints = [
  "bg-accent-soft text-accent-text",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning-text",
  "bg-subtle text-fg",
  "bg-danger-soft text-danger-text",
];

export function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface AvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

/** Initials in a tint picked from the name, so the same person keeps the same colour. */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold",
        size === "sm" ? "size-6 text-2xs" : "size-7 text-xs",
        tints[hash(name) % tints.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
