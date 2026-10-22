import { useEffect, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsLeft, ChevronsRight, ChevronsUpDown, Grip, Menu, Plug, Search, Settings, X, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { PRODUCTS, type ProductId } from "../tokens/products";
import { useBrand } from "./BrandProvider";
import { Avatar } from "./Avatar";
import { ThemeMenu, type ThemePreference } from "./Theme";

export interface NavItem {
  id: string;
  label: ReactNode;
  /** A shorter label for the icon rail on tablets and the collapsed menu; the label is used when omitted. */
  shortLabel?: ReactNode;
  /** Where the link goes; /<id> by default, a page path of the product. */
  href?: string;
  count?: ReactNode;
  /** The count needs action (an open outage, a failed job): shown in red, and as a dot on the icon rail. */
  attention?: boolean;
  icon?: LucideIcon;
}

export interface ShellUser {
  name: string;
  role?: string;
}

export interface AppShellProps {
  product: ProductId;
  nav: NavItem[];
  /** Heading above nav in the menu, such as "Monitoring". Omit for none. */
  navLabel?: string;
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
  /** Settings links, in their own group under nav. */
  footerNav?: NavItem[];
  /** Heading of the footerNav group. */
  footerLabel?: string;
  /** A search field for the top bar, shown from tablet width up. */
  search?: ReactNode;
  /** The person's theme choice. With onThemeChange, the top bar shows a theme menu on the right. */
  theme?: ThemePreference;
  onThemeChange?: (next: ThemePreference) => void;
  children: ReactNode;
  className?: string;
}

const DEFAULT_FOOTER: NavItem[] = [
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "settings", label: "Settings", icon: Settings },
];

/** The menu offers a filter once it holds this many links. */
const FILTER_FROM = 8;

/** Where the desktop menu remembers being collapsed to the icon rail. */
export const NAV_COLLAPSED_KEY = "oa-nav-collapsed";

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

/** The products menu: the linked products to switch to, then the ones that could be connected. */
function ProductMenu({
  product,
  connected,
  available = [],
  onSwitch,
  onConnect,
  close,
}: {
  product: ProductId;
  connected: ProductId[];
  available?: ProductId[];
  onSwitch?: (id: ProductId) => void;
  onConnect?: (id: ProductId) => void;
  close: () => void;
}) {
  const { brand } = useBrand();
  const items = [product, ...connected.filter((p) => p !== product)];
  return (
    <Popover.Content
      align="start"
      sideOffset={4}
      aria-label={`${brand.name} products`}
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
                  close();
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
                      close();
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
export function ProductSwitcher({ product, connected, available, onSwitch, onConnect, defaultOpen }: ProductSwitcherProps) {
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
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-1.5 hover:bg-subtle">
        <span className="sr-only">Switch product, current:</span> {label}
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
      </Popover.Trigger>
      <Popover.Portal>
        <ProductMenu product={product} connected={connected} available={available} onSwitch={onSwitch} onConnect={onConnect} close={() => setOpen(false)} />
      </Popover.Portal>
    </Popover.Root>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: (id: string) => void }) {
  const Icon = item.icon;
  return (
    <a
      href={item.href ?? `/${item.id}`}
      title={typeof item.label === "string" ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      data-short={item.shortLabel !== undefined || undefined}
      onClick={(e) => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate(item.id);
        }
      }}
      className={cn(
        "oa-nav-link relative flex min-h-10 items-center gap-3 rounded-md px-2.5 text-base no-underline",
        active
          ? "bg-accent-soft font-semibold text-accent-text before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent"
          : "font-medium text-fg hover:bg-subtle",
      )}
    >
      {Icon && (
        <span className={cn("relative flex shrink-0", active ? "text-accent" : "text-fg-muted")}>
          <Icon aria-hidden className="size-[18px]" />
          {item.attention && item.count !== undefined && (
            <span aria-hidden className="oa-nav-dot absolute -top-1 -right-1 size-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </span>
      )}
      <span className="oa-nav-label min-w-0 grow truncate">{item.label}</span>
      {item.shortLabel !== undefined && (
        <span aria-hidden className="oa-nav-short">
          {item.shortLabel}
        </span>
      )}
      {item.count !== undefined && (
        <span
          className={cn(
            "oa-nav-count grid h-5 min-w-6 place-items-center rounded-full px-1.5 font-mono text-2xs font-semibold",
            item.attention ? "bg-danger text-white" : active ? "bg-surface text-accent-text" : "bg-subtle text-fg-muted",
          )}
        >
          {item.count}
        </span>
      )}
    </a>
  );
}

function NavGroup({ label, items, activeNav, onNavigate }: { label?: string; items: NavItem[]; activeNav?: string; onNavigate?: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-0.5">
      {label && <p className="oa-nav-section px-2.5 pt-3 pb-1.5 text-2xs font-semibold tracking-wider text-fg-muted uppercase">{label}</p>}
      {items.map((item) => (
        <NavLink key={item.id} item={item} active={item.id === activeNav} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function useCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const set = (next: boolean) => {
    setCollapsed(next);
    try {
      if (next) window.localStorage.setItem(NAV_COLLAPSED_KEY, "1");
      else window.localStorage.removeItem(NAV_COLLAPSED_KEY);
    } catch {
      // Blocked storage: the choice lasts for this page only.
    }
  };
  return [collapsed, set];
}

function textOf(label: ReactNode): string {
  return typeof label === "string" || typeof label === "number" ? String(label) : "";
}

/**
 * The frame of every product, laid out like a cloud portal: a top bar with the
 * products menu, the theme and the account, a menu for the product on the left, and the
 * page filling the rest. The menu is a labelled icon rail on tablets (and on
 * desktops when collapsed) and a drawer on phones.
 */
export function AppShell({
  product,
  nav,
  navLabel,
  activeNav,
  onNavigate,
  connectedProducts,
  availableProducts,
  onSwitchProduct,
  onConnectProduct,
  user,
  footerNav = DEFAULT_FOOTER,
  footerLabel = "Settings",
  search,
  theme,
  onThemeChange,
  children,
  className,
}: AppShellProps) {
  const { brand } = useBrand();
  const [drawer, setDrawer] = useState(false);
  const [products, setProducts] = useState(false);
  const [collapsed, setCollapsed] = useCollapsed();
  const [filter, setFilter] = useState("");
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
  const info = PRODUCTS[product];
  const name = info.name;
  const withTheme = theme !== undefined && onThemeChange !== undefined;
  const q = filter.trim().toLowerCase();
  const match = (item: NavItem) => !q || textOf(item.label).toLowerCase().includes(q);
  const shownNav = nav.filter(match);
  const shownFooter = footerNav.filter(match);
  const hasProducts = connectedProducts !== undefined && connectedProducts.length > 0;

  return (
    <div className={cn("flex min-h-screen flex-col bg-canvas text-fg", className)}>
      <header className="oa-topbar sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          aria-label={drawer ? "Close navigation" : "Open navigation"}
          aria-expanded={drawer}
          onClick={() => setDrawer((d) => !d)}
          className="oa-topbar-button grid size-10 place-items-center rounded-md md:hidden"
        >
          {drawer ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
        {hasProducts && (
          <Popover.Root open={products} onOpenChange={setProducts}>
            <Popover.Trigger className="oa-topbar-button hidden size-10 place-items-center rounded-md md:grid">
              <Grip aria-hidden className="size-[18px]" />
              <span className="sr-only">Switch product, current: {name}</span>
            </Popover.Trigger>
            <Popover.Portal>
              <ProductMenu
                product={product}
                connected={connectedProducts}
                available={availableProducts}
                onSwitch={onSwitchProduct}
                onConnect={onConnectProduct}
                close={() => setProducts(false)}
              />
            </Popover.Portal>
          </Popover.Root>
        )}
        <span className="flex min-w-0 items-center gap-2 px-1.5">
          <BrandMark product={product} />
          <span className="hidden text-base font-semibold sm:inline">{brand.name}</span>
          <span aria-hidden className="oa-topbar-muted hidden sm:inline">
            /
          </span>
          <span className="truncate text-base font-medium">{name}</span>
        </span>
        <div className="mx-auto hidden max-w-xl min-w-0 flex-1 px-4 md:block">{search}</div>
        <span className="flex-1 md:hidden" />
        {withTheme && <ThemeMenu value={theme} onChange={onThemeChange} className="oa-topbar-button" />}
        {user && (
          <Popover.Root>
            <Popover.Trigger className="oa-topbar-button flex h-10 items-center gap-2 rounded-md px-1.5 text-left">
              <span className="sr-only">Account:</span>{" "}
              <span className="hidden flex-col leading-tight lg:flex">
                <span className="text-sm font-medium">{user.name}</span>{" "}
                {user.role && <span className="oa-topbar-muted text-2xs">{user.role}</span>}
              </span>
              <Avatar name={user.name} size="md" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={4}
                aria-label="Account"
                className="oa-root z-50 flex w-64 items-center gap-2 rounded-lg border border-line bg-surface p-3 shadow-overlay"
              >
                <Avatar name={user.name} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  {user.role && <span className="truncate text-xs text-fg-muted">{user.role}</span>}
                </span>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={`${name} navigation`}
          data-open={drawer || undefined}
          data-collapsed={collapsed || undefined}
          className={cn(
            "oa-shell-nav fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 pt-4 pb-3 transition-transform",
            "md:sticky md:top-12 md:z-auto md:h-[calc(100vh-3rem)] md:w-64 md:translate-x-0 md:visible",
            drawer ? "visible translate-x-0 shadow-modal" : "invisible -translate-x-full",
          )}
        >
          <div className="oa-nav-head mb-2 flex items-center gap-2.5 border-b border-subtle px-1 pb-3.5">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <info.icon className="size-5" />
            </span>
            <span className="oa-nav-head-text flex min-w-0 flex-col">
              <span className="truncate text-[15px] leading-5 font-semibold">{name}</span>
              <span className="truncate text-xs text-fg-muted">{brand.organization ?? brand.name}</span>
            </span>
          </div>
          {nav.length + footerNav.length >= FILTER_FROM && (
            <label className="oa-nav-filter mb-1 flex h-9 items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 text-sm text-fg-subtle">
              <Search aria-hidden className="size-3.5" />
              <input
                type="search"
                aria-label="Filter the menu"
                placeholder="Filter the menu"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-fg outline-none"
              />
            </label>
          )}
          <NavGroup label={navLabel} items={shownNav} activeNav={activeNav} onNavigate={navigate} />
          {shownNav.length > 0 && shownFooter.length > 0 && <div aria-hidden className="oa-nav-rule mx-3 my-2 h-px bg-line" />}
          <NavGroup label={footerLabel} items={shownFooter} activeNav={activeNav} onNavigate={navigate} />
          {q && shownNav.length + shownFooter.length === 0 && <p className="px-2.5 py-2 text-sm text-fg-muted">No page matches.</p>}
          <div className="mt-auto flex flex-col gap-1 border-t border-subtle pt-3">
            <button
              type="button"
              aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
              aria-pressed={collapsed}
              onClick={() => setCollapsed(!collapsed)}
              className="oa-nav-link oa-nav-collapse hidden min-h-10 items-center gap-3 rounded-md px-2.5 text-base font-medium text-fg-muted hover:bg-subtle lg:flex"
            >
              {collapsed ? <ChevronsRight aria-hidden className="size-[18px] shrink-0" /> : <ChevronsLeft aria-hidden className="size-[18px] shrink-0" />}
              <span className="oa-nav-label grow text-left">Collapse</span>
            </button>
            {!brand.hidePoweredBy && brand.name !== "OpenAsy" && <span className="oa-nav-extra px-2.5 pt-1 text-2xs text-fg-subtle">Powered by OpenAsy</span>}
          </div>
        </nav>
        {drawer && <div aria-hidden data-testid="drawer-backdrop" className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setDrawer(false)} />}
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
