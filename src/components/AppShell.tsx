import { useEffect, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Menu, Plug, Settings, X, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { PRODUCTS, type ProductId } from "../tokens/products";
import { useBrand } from "./BrandProvider";
import { Avatar } from "./Avatar";

export interface NavItem {
  id: string;
  label: ReactNode;
  /** Where the link goes; /<id> by default, a page path of the product. */
  href?: string;
  count?: ReactNode;
  icon?: LucideIcon;
}

export interface ShellUser {
  name: string;
  role?: string;
}

export interface AppShellProps {
  product: ProductId;
  nav: NavItem[];
  activeNav?: string;
  onNavigate?: (id: string) => void;
  /** Other OpenAsy products linked to this one. Omit to hide the switcher menu. */
  connectedProducts?: ProductId[];
  /** Products that could be linked; shown under "Not connected". */
  availableProducts?: ProductId[];
  onSwitchProduct?: (id: ProductId) => void;
  /** Called by the Connect button of a product under "Not connected". */
  onConnectProduct?: (id: ProductId) => void;
  user?: ShellUser;
  /** Extra links above Integrations and Settings. */
  footerNav?: NavItem[];
  children: ReactNode;
  className?: string;
}

const DEFAULT_FOOTER: NavItem[] = [
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "settings", label: "Settings", icon: Settings },
];

/**
 * The brand logo when one is set (theme-aware), otherwise the product glyph.
 * Use it on screens outside the shell, such as sign-in pages.
 */
export function BrandMark({ product, size = 24, className }: { product: ProductId; size?: number; className?: string }) {
  const { brand, theme } = useBrand();
  const logo = theme === "dark" ? (brand.logoDarkUrl ?? brand.logoUrl) : brand.logoUrl;
  const Icon = PRODUCTS[product].icon;
  if (logo) {
    return <img src={logo} alt="" width={size} height={size} className={cn("shrink-0 rounded-md object-contain", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-md bg-fg text-surface", className)}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }} strokeWidth={2.2} />
    </span>
  );
}

export interface ProductSwitcherProps {
  product: ProductId;
  connected?: ProductId[];
  available?: ProductId[];
  onSwitch?: (id: ProductId) => void;
  onConnect?: (id: ProductId) => void;
  defaultOpen?: boolean;
}

/** Shows the current product; opens a menu of linked OpenAsy products when there are any. */
export function ProductSwitcher({ product, connected, available = [], onSwitch, onConnect, defaultOpen }: ProductSwitcherProps) {
  const { brand } = useBrand();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const info = PRODUCTS[product];
  const label = (
    <>
      <BrandMark product={product} />
      <span className="flex min-w-0 grow flex-col text-left">
        <span className="truncate text-sm font-semibold text-fg">{info.name}</span>{" "}
        <span className="truncate text-2xs text-fg-muted">{brand.organization ?? brand.name}</span>
      </span>
    </>
  );
  if (!connected || connected.length === 0) {
    return <div className="flex h-10 items-center gap-2 px-1.5">{label}</div>;
  }
  const items = [product, ...connected.filter((p) => p !== product)];
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-1.5 hover:bg-subtle">
        <span className="sr-only">Switch product, current:</span> {label}
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="oa-root z-50 max-h-[min(70vh,560px)] w-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-overlay"
        >
          <p className="px-2 pt-1.5 pb-1 text-2xs font-medium tracking-wider text-fg-muted uppercase">{brand.name} products</p>
          <ul aria-label="Connected products">
            {items.map((id) => {
              const P = PRODUCTS[id];
              const on = id === product;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch?.(id);
                      setOpen(false);
                    }}
                    aria-current={on ? "page" : undefined}
                    className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-fg hover:bg-subtle", on && "bg-accent-soft")}
                  >
                    <P.icon aria-hidden className="size-4 text-fg-muted" />
                    <span className="grow text-left">{P.name}</span>
                    {on && <Check aria-hidden className="size-3.5 text-accent" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {available.length > 0 && (
            <>
              <div className="my-1 h-px bg-line" />
              <p className="px-2 pt-1 pb-1 text-2xs font-medium tracking-wider text-fg-muted uppercase">Not connected</p>
              <ul aria-label="Available products">
                {available.map((id) => {
                  const P = PRODUCTS[id];
                  return (
                    <li key={id} className="flex h-8 items-center gap-2 px-2 text-sm text-fg-muted">
                      <P.icon aria-hidden className="size-4" />
                      <span className="grow">{P.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onConnect?.(id);
                          setOpen(false);
                        }}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Connect
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: (id: string) => void }) {
  const Icon = item.icon;
  return (
    <a
      href={item.href ?? `/${item.id}`}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate(item.id);
        }
      }}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-sm no-underline",
        active ? "bg-accent-soft font-semibold text-accent-text" : "font-medium text-fg hover:bg-subtle",
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
      <span className="grow truncate">{item.label}</span>
      {item.count !== undefined && <span className="font-mono text-2xs text-fg-muted">{item.count}</span>}
    </a>
  );
}

/**
 * The frame of every product: sidebar with product switcher, navigation and
 * user, plus the main column. Collapses to a stacked layout on narrow screens.
 */
export function AppShell({
  product,
  nav,
  activeNav,
  onNavigate,
  connectedProducts,
  availableProducts,
  onSwitchProduct,
  onConnectProduct,
  user,
  footerNav = DEFAULT_FOOTER,
  children,
  className,
}: AppShellProps) {
  const { brand } = useBrand();
  const [drawer, setDrawer] = useState(false);
  const navigate = onNavigate
    ? (id: string) => {
        setDrawer(false);
        onNavigate(id);
      }
    : undefined;
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);
  const name = PRODUCTS[product].name;
  return (
    <div className={cn("flex min-h-screen bg-canvas text-fg", className)}>
      {/* Fixed 224 px sidebar on md+; an off-canvas drawer on small screens. */}
      <nav
        aria-label={`${name} navigation`}
        data-open={drawer || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-line bg-surface px-2 py-2.5 transition-transform",
          "md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:visible",
          drawer ? "visible translate-x-0 shadow-modal" : "invisible -translate-x-full",
        )}
      >
        <ProductSwitcher product={product} connected={connectedProducts} available={availableProducts} onSwitch={onSwitchProduct} onConnect={onConnectProduct} />
        <div className="flex flex-col gap-px">
          {nav.map((item) => (
            <NavLink key={item.id} item={item} active={item.id === activeNav} onNavigate={navigate} />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-px border-t border-line pt-2">
          {footerNav.map((item) => (
            <NavLink key={item.id} item={item} active={item.id === activeNav} onNavigate={navigate} />
          ))}
          {user && (
            <div className="mt-1 flex items-center gap-2 px-1.5 py-1">
              <Avatar name={user.name} size="sm" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">{user.name}</span>
                {user.role && <span className="truncate text-2xs text-fg-muted">{user.role}</span>}
              </span>
            </div>
          )}
          {!brand.hidePoweredBy && brand.name !== "OpenAsy" && <span className="px-2 pt-1 text-2xs text-fg-subtle">Powered by OpenAsy</span>}
        </div>
      </nav>
      {drawer && <div aria-hidden data-testid="drawer-backdrop" className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setDrawer(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b border-line bg-surface px-2 md:hidden">
          <button
            type="button"
            aria-label={drawer ? "Close navigation" : "Open navigation"}
            aria-expanded={drawer}
            onClick={() => setDrawer((d) => !d)}
            className="grid size-8 place-items-center rounded-md text-fg hover:bg-subtle"
          >
            {drawer ? <X aria-hidden className="size-4" /> : <Menu aria-hidden className="size-4" />}
          </button>
          <BrandMark product={product} />
          <span className="text-sm font-semibold">{name}</span>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-3 pb-6">{children}</main>
      </div>
    </div>
  );
}
