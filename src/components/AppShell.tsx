import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Check,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  CircleHelp,
  Code,
  Grip,
  Info,
  LogOut,
  Mail,
  Menu,
  Plug,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import { PRODUCTS, type ProductGroup, type ProductId } from "../tokens/products";
import { useBrand } from "./BrandProvider";
import { useT } from "./Locale";
import { LOCALES, LOCALE_NAMES } from "../lib/i18n";
import { Avatar } from "./Avatar";
import { LanguageMenu, type Language } from "./LanguageMenu";
import { ThemeMenu, type ThemePreference } from "./Theme";
import { AboutPage, colophonLinks, type Colophon } from "./About";
import { accountEntries, CommandPalette, shortcutLabel, type PaletteEntry, type SearchFn } from "./CommandPalette";
import { navigate as goTo } from "../lib/routing";

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
  /** Where the person manages their account: the product's Account page, or Identity's when it keeps people. */
  accountHref?: string;
  /** Signs out of the product; the user menu offers it. */
  onSignOut?: () => void;
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
  /** Settings links, in their own group under nav; Integrations and Settings by default. */
  footerNav?: NavItem[];
  /** Heading of the footerNav group; "Settings" in the locale by default. */
  footerLabel?: string;
  /** A search field for the top bar, shown from tablet width up. */
  search?: ReactNode;
  /** The person's theme choice. With onThemeChange, the top bar shows a theme menu on the right. */
  theme?: ThemePreference;
  onThemeChange?: (next: ThemePreference) => void;
  /**
   * With onLanguageChange, the top bar shows a language menu next to the theme. The language
   * is the BrandProvider locale and the languages are LOCALES unless given here.
   */
  language?: string;
  languages?: Language[];
  onLanguageChange?: (code: string) => void;
  /**
   * What the product is and what it is built on, from the colophon() Vite plugin. With it, the top bar has a help
   * menu, the menu ends with About, and on the page "about" the shell shows the About page in place of children.
   */
  about?: Colophon;
  /**
   * The product has a Setup page, "setup": how to connect its scanners, agents or pipelines. The help menu leads to it,
   * so it is done once without standing in the menu every day.
   */
  setup?: boolean;
  /**
   * Finds the product's own things (CVEs, hosts, rules...) for the search window that Cmd+K or Ctrl+K and the menu's
   * search button open. Without it, the window finds the product's pages and the other products only.
   */
  onSearch?: SearchFn;
  children: ReactNode;
  className?: string;
}

/** Where the desktop menu remembers being collapsed to the icon rail. */
export const NAV_COLLAPSED_KEY = "oa-nav-collapsed";

/**
 * The brand logo when one is set (theme-aware), otherwise the product glyph.
 * Use it on screens outside the shell, such as sign-in pages.
 * A logo is `size` high and as wide as its shape needs, up to six times that, so a wide logo is not shrunk into a
 * square.
 */
export function BrandMark({ product, size = 24, className }: { product: ProductId; size?: number; className?: string }) {
  const { brand, theme } = useBrand();
  const logo = theme === "dark" ? (brand.logoDarkUrl ?? brand.logoUrl) : brand.logoUrl;
  const Icon = PRODUCTS[product].icon;
  if (logo) {
    return <img src={logo} alt="" height={size} className={cn("w-auto shrink-0 object-contain", className)} style={{ height: size, maxWidth: size * 6 }} />;
  }
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-md bg-fg text-surface", className)} style={{ width: size, height: size }}>
      <Icon style={{ width: Math.round(size * 0.58), height: Math.round(size * 0.58) }} strokeWidth={2.2} />
    </span>
  );
}

/** The OpenAsy mark: an open ring, the gap is "open" and the dot a product joining in. */
export function OpenAsyMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="#1f4fd8" />
      <path d="M24 16A8 8 0 1 1 16 8" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="21.66" cy="10.34" r="2.1" fill="#fff" />
    </svg>
  );
}

/** The products menu: the linked products to switch to, then the ones that could be connected. */
const GROUP_ORDER: ProductGroup[] = ["operations", "security", "identity", "platform"];

/**
 * The linked products as a grid of tiles by group, with a search that narrows it; arrow keys move between tiles. The
 * search is the first thing in the popover, so it has the focus when it opens.
 */
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
  const t = useT();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (id: ProductId) => !q || `${PRODUCTS[id].name} ${PRODUCTS[id].summary} ${id}`.toLowerCase().includes(q);
  const items = [product, ...connected.filter((p) => p !== product)].filter(matches);
  const groups = GROUP_ORDER.map((g) => ({ id: g, items: items.filter((id) => PRODUCTS[id].group === g) })).filter((g) => g.items.length);
  const others = available.filter((id) => id !== product && !connected.includes(id) && matches(id));
  const choose = (id: ProductId) => {
    onSwitch?.(id);
    close();
  };
  // Tiles are in rows of three, each group starting a row: left and right step one tile, up and down one row, keeping
  // the column where the next row is long enough.
  const rows = groups.reduce<number[]>((out, _g, i) => [...out, i ? out[i - 1]! + Math.ceil(groups[i - 1]!.items.length / 3) : 0], []);
  const move = (e: ReactKeyboardEvent<HTMLElement>) => {
    const tiles = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-tile]")];
    const at = tiles.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const pos = (b: HTMLButtonElement) => [Number(b.dataset.row), Number(b.dataset.col)] as const;
    const [r, c] = pos(tiles[at]!);
    let next: HTMLButtonElement | undefined;
    if (e.key === "ArrowLeft") next = tiles[at - 1];
    else if (e.key === "ArrowRight") next = tiles[at + 1];
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const inRow = tiles.filter((b) => pos(b)[0] === r + (e.key === "ArrowUp" ? -1 : 1));
      next = inRow[Math.min(c, inRow.length - 1)];
    } else return;
    e.preventDefault();
    next?.focus();
  };
  return (
    <Popover.Content
      align="start"
      sideOffset={4}
      aria-label={t("shell.products", { brand: brand.name })}
      onKeyDown={move}
      className="oa-root z-50 flex max-h-[min(80vh,640px)] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
    >
      <div className="relative shrink-0 border-b border-line p-2">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-fg-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) choose(items[0]);
            if (e.key === "ArrowDown") {
              // The grid's own arrow keys would move on from the tile focused here.
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.closest("[role=dialog]")?.querySelector<HTMLButtonElement>("[data-tile]")?.focus();
            }
          }}
          aria-label={t("shell.searchProducts")}
          placeholder={t("shell.searchProducts")}
          className="h-9 w-full rounded-md border border-line bg-canvas pr-2 pl-8 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
      </div>
      <div className="min-h-0 grow overflow-y-auto p-2">
        {groups.length > 0 && (
          <ul aria-label={t("shell.connectedProducts")} className="flex flex-col gap-2">
            {groups.map((g, gi) => (
              <li key={g.id}>
                <p className="px-1 pb-1 text-2xs font-medium tracking-wider text-fg-muted uppercase">{t(`shell.group.${g.id}`)}</p>
                <ul aria-label={t(`shell.group.${g.id}`)} className="grid grid-cols-3 gap-1">
                  {g.items.map((id, i) => {
                    const P = PRODUCTS[id];
                    const on = id === product;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          data-tile
                          data-row={rows[gi]! + Math.floor(i / 3)}
                          data-col={i % 3}
                          title={P.summary}
                          onClick={() => choose(id)}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "relative flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-md px-1 text-xs text-fg hover:bg-subtle focus-visible:bg-subtle",
                            on && "bg-accent-soft font-semibold text-accent-text hover:bg-accent-soft",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn("grid size-9 place-items-center rounded-lg", on ? "bg-surface text-accent" : "bg-subtle text-fg-muted")}
                          >
                            <P.icon className="size-[18px]" />
                          </span>
                          <span className="line-clamp-2 text-center leading-tight">{P.name}</span>
                          {on && <Check aria-hidden className="absolute top-1.5 right-1.5 size-3.5 text-accent" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {groups.length === 0 && others.length === 0 && <p className="m-0 px-1 py-6 text-center text-sm text-fg-muted">{t("shell.noProducts")}</p>}
        {others.length > 0 && (
          <>
            {groups.length > 0 && <div className="my-2 h-px bg-line" />}
            <p className="px-1 pb-1 text-2xs font-medium tracking-wider text-fg-muted uppercase">{t("shell.notConnected")}</p>
            <ul aria-label={t("shell.availableProducts")}>
              {others.map((id) => {
                const P = PRODUCTS[id];
                return (
                  <li key={id} className="flex h-8 items-center gap-2 px-1 text-sm text-fg-muted">
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
                      {t("shell.connect")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
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
  const t = useT();
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
        <span className="sr-only">{t("shell.switchProduct")}</span> {label}
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
 * products menu, the language, the theme and the account, a menu for the product on the left, and the
 * page filling the rest. The menu is a labelled icon rail on tablets (and on
 * desktops when collapsed) and a drawer on phones.
 */
/** The top bar's help menu: the version, About, the release notes, the API, support and security reports. */
/** The signed-in person: their name and role, where they manage their account, and signing out. */
function UserMenu({ user }: { user: ShellUser }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const item = "flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-fg no-underline hover:bg-subtle";
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="oa-topbar-button flex h-10 items-center gap-2 rounded-md px-1.5 text-left">
        <span className="sr-only">{t("shell.account")}:</span>{" "}
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="text-sm font-medium">{user.name}</span> {user.role && <span className="oa-topbar-muted text-2xs">{user.role}</span>}
        </span>
        <Avatar name={user.name} size="md" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          aria-label={t("shell.account")}
          className="oa-root z-50 flex w-64 flex-col rounded-lg border border-line bg-surface p-1.5 shadow-overlay"
        >
          <div className="flex items-center gap-2 px-1.5 py-1.5">
            <Avatar name={user.name} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{user.name}</span>
              {user.role && <span className="truncate text-xs text-fg-muted">{user.role}</span>}
            </span>
          </div>
          {(user.accountHref || user.onSignOut) && <div aria-hidden className="my-1 h-px bg-subtle" />}
          {user.accountHref && (
            <a className={item} href={user.accountHref} onClick={() => setOpen(false)}>
              <UserRound aria-hidden className="size-4 text-fg-muted" />
              {t("shell.manageAccount")}
            </a>
          )}
          {user.onSignOut && (
            <button
              type="button"
              className={cn(item, "w-full border-0 bg-transparent text-left font-[inherit]")}
              onClick={() => {
                setOpen(false);
                user.onSignOut!();
              }}
            >
              <LogOut aria-hidden className="size-4 text-fg-muted" />
              {t("shell.signOut")}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HelpMenu({ product, about, onAbout, onSetup }: { product: ProductId; about: Colophon; onAbout?: () => void; onSetup?: () => void }) {
  const { brand } = useBrand();
  const t = useT();
  const [open, setOpen] = useState(false);
  const links = colophonLinks(product, about, brand.support);
  const item = "flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-fg no-underline hover:bg-subtle";
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={t("shell.help")} title={t("shell.help")} className="oa-topbar-button grid size-10 place-items-center rounded-md">
        <CircleHelp aria-hidden className="size-[18px]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          aria-label={t("shell.help")}
          className="oa-root z-50 flex w-72 flex-col rounded-lg border border-line bg-surface p-1.5 shadow-overlay"
        >
          <div className="px-2.5 pt-2 pb-2">
            <p className="m-0 text-sm font-semibold">
              {links.name} {about.version}
            </p>
            <p className="m-0 text-xs text-fg-muted">{t("about.freeSoftware", { license: about.license.replace(/-only$|-or-later$/, "") })}</p>
          </div>
          <div aria-hidden className="my-1 h-px bg-subtle" />
          {onSetup && (
            <button
              type="button"
              className={cn(item, "w-full border-0 bg-transparent text-left font-[inherit]")}
              onClick={() => {
                setOpen(false);
                onSetup();
              }}
            >
              <Settings aria-hidden className="size-4 text-fg-muted" />
              {t("about.setUpProduct", { product: PRODUCTS[product].name })}
            </button>
          )}
          {onAbout && (
            <button
              type="button"
              className={cn(item, "w-full border-0 bg-transparent text-left font-[inherit]")}
              onClick={() => {
                setOpen(false);
                onAbout();
              }}
            >
              <Info aria-hidden className="size-4 text-fg-muted" />
              {t("about.aboutProduct", { product: PRODUCTS[product].name })}
            </button>
          )}
          <a className={item} href={links.notes}>
            <Sparkles aria-hidden className="size-4 text-fg-muted" />
            {t("about.whatIsNewIn", { version: about.version })}
          </a>
          <a className={item} href={links.api}>
            <Code aria-hidden className="size-4 text-fg-muted" />
            {t("about.apiReference")}
          </a>
          <div aria-hidden className="my-1 h-px bg-subtle" />
          <a className={item} href={links.support}>
            <Mail aria-hidden className="size-4 text-fg-muted" />
            {t("about.contactSupport")}
          </a>
          <a className={item} href={links.security}>
            <ShieldAlert aria-hidden className="size-4 text-fg-muted" />
            {t("about.reportSecurity")}
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

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
  footerNav: footerNavProp,
  footerLabel: footerLabelProp,
  search,
  theme,
  onThemeChange,
  language,
  languages,
  onLanguageChange,
  about,
  setup = false,
  onSearch,
  children,
  className,
}: AppShellProps) {
  const { brand, locale } = useBrand();
  const t = useT();
  const footerNav = [
    ...(footerNavProp ?? [
      { id: "integrations", label: t("shell.integrations"), icon: Plug },
      { id: "settings", label: t("shell.settings"), icon: Settings },
    ]),
    ...(about ? [{ id: "about", label: t("shell.about"), icon: Info }] : []),
  ];
  const footerLabel = footerLabelProp ?? t("shell.settings");
  // OpenAsy itself shows its own mark and wordmark; a white-label brand keeps its logo or the product glyph.
  const openasy = brand.name === "OpenAsy" && !brand.logoUrl;
  const poweredBy = !brand.hidePoweredBy && brand.name !== "OpenAsy";
  const [drawer, setDrawer] = useState(false);
  const [products, setProducts] = useState(false);
  const [collapsed, setCollapsed] = useCollapsed();
  const [searching, setSearching] = useState(false);
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
  // Cmd+K on Apple devices, Ctrl+K elsewhere, from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const openHref = (href: string) => (href.startsWith("/") && !href.startsWith("//") ? goTo(href) : window.location.assign(href));
  const pageEntry = (item: NavItem): PaletteEntry => ({
    id: `page:${item.id}`,
    label: textOf(item.label),
    icon: item.icon,
    run: () => (item.href ? openHref(item.href) : navigate ? navigate(item.id) : openHref(`/${item.id}`)),
  });
  const pages: PaletteEntry[] = [
    ...nav.map(pageEntry),
    ...footerNav.filter((i) => i.id !== "about").map(pageEntry),
    ...(setup ? [pageEntry({ id: "setup", label: t("about.setUpProduct", { product: info.name }), icon: Settings })] : []),
    ...(about ? [pageEntry({ id: "about", label: t("about.aboutProduct", { product: info.name }), icon: Info })] : []),
  ];
  const others: PaletteEntry[] = (connectedProducts ?? []).map((id) => ({
    id: `product:${id}`,
    label: PRODUCTS[id].name,
    detail: PRODUCTS[id].summary,
    icon: PRODUCTS[id].icon,
    run: () => onSwitchProduct?.(id),
  }));
  const account = accountEntries(t, openHref, user?.accountHref, user?.onSignOut);
  const hasProducts = connectedProducts !== undefined && connectedProducts.length > 0;

  return (
    <div className={cn("flex min-h-screen flex-col bg-canvas text-fg", className)}>
      <header className="oa-topbar sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          aria-label={drawer ? t("shell.closeNavigation") : t("shell.openNavigation")}
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
              <span className="sr-only">
                {t("shell.switchProduct")} {name}
              </span>
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
          {openasy ? <OpenAsyMark /> : <BrandMark product={product} size={brand.logoUrl ? 28 : 24} />}
          {/* A logo stands for the brand, so its name is not written next to it. */}
          {!brand.logoUrl && (
            <span className="hidden text-base font-semibold tracking-tight sm:inline">
              {openasy ? (
                <>
                  Open<span className="oa-topbar-wordmark">Asy</span>
                </>
              ) : (
                brand.name
              )}
            </span>
          )}
          <span aria-hidden className="oa-topbar-muted hidden sm:inline">
            /
          </span>
          {/* The product's own glyph tells the products apart at a glance, on every screen size. A brand without a logo
              already shows it as its mark. */}
          {(openasy || brand.logoUrl) && (
            <span aria-hidden className="oa-topbar-glyph grid size-7 shrink-0 place-items-center rounded-md">
              <info.icon className="size-4" />
            </span>
          )}
          <span className="truncate text-base font-medium">{name}</span>
        </span>
        <div className="mx-auto hidden max-w-xl min-w-0 flex-1 px-4 md:block">{search}</div>
        <span className="flex-1 md:hidden" />
        {onLanguageChange && (
          <LanguageMenu
            value={language ?? locale}
            languages={languages ?? LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code] }))}
            onChange={onLanguageChange}
            className="oa-topbar-button"
          />
        )}
        {withTheme && <ThemeMenu value={theme} onChange={onThemeChange} className="oa-topbar-button" />}
        {about && (
          <HelpMenu
            product={product}
            about={about}
            onAbout={navigate ? () => navigate("about") : undefined}
            onSetup={setup && navigate ? () => navigate("setup") : undefined}
          />
        )}
        {user && <UserMenu user={user} />}
      </header>
      <CommandPalette
        open={searching}
        onOpenChange={setSearching}
        product={product}
        pages={pages}
        products={others}
        account={account}
        onSearch={onSearch}
        onOpenResult={openHref}
      />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("shell.navigation", { product: name })}
          data-open={drawer || undefined}
          data-collapsed={collapsed || undefined}
          className={cn(
            "oa-shell-nav fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 pt-4 pb-3 transition-transform",
            "md:sticky md:top-12 md:z-auto md:h-[calc(100vh-3rem)] md:w-64 md:translate-x-0 md:visible",
            drawer ? "visible translate-x-0 shadow-modal" : "invisible -translate-x-full",
          )}
        >
          {/* The product's name is in the top bar, which every screen size shows, so the menu starts with itself. */}
          <button
            type="button"
            onClick={() => setSearching(true)}
            className="oa-nav-filter mb-1 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 text-left text-sm text-fg-subtle"
          >
            <Search aria-hidden className="size-3.5" />
            <span className="oa-nav-label flex-1">{t("search.button")}</span>
            <kbd className="oa-nav-label rounded border border-line px-1 font-mono text-2xs">{shortcutLabel()}</kbd>
          </button>
          <NavGroup label={navLabel} items={nav} activeNav={activeNav} onNavigate={navigate} />
          {nav.length > 0 && footerNav.length > 0 && <div aria-hidden className="oa-nav-rule mx-3 my-2 h-px bg-line" />}
          <NavGroup label={footerLabel} items={footerNav} activeNav={activeNav} onNavigate={navigate} />
          <div className="mt-auto flex flex-col gap-1 border-t border-subtle pt-3">
            <button
              type="button"
              aria-label={collapsed ? t("shell.expandMenu") : t("shell.collapseMenu")}
              aria-pressed={collapsed}
              onClick={() => setCollapsed(!collapsed)}
              className="oa-nav-link oa-nav-collapse hidden min-h-10 items-center gap-3 rounded-md px-2.5 text-base font-medium text-fg-muted hover:bg-subtle lg:flex"
            >
              {collapsed ? <ChevronsRight aria-hidden className="size-[18px] shrink-0" /> : <ChevronsLeft aria-hidden className="size-[18px] shrink-0" />}
              <span className="oa-nav-label grow text-left">{t("shell.collapse")}</span>
            </button>
            {/* The organization is under the product's name at the top; here only what it runs on. */}
            {poweredBy && (
              <span className="oa-nav-extra truncate px-2.5 pt-1 text-2xs text-fg-subtle">
                {poweredBy &&
                  (about && navigate ? (
                    <a
                      href="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("about");
                      }}
                      className="text-fg-subtle underline"
                    >
                      {t("shell.poweredBy")}
                    </a>
                  ) : (
                    t("shell.poweredBy")
                  ))}
              </span>
            )}
          </div>
        </nav>
        {drawer && <div aria-hidden data-testid="drawer-backdrop" className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setDrawer(false)} />}
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 pt-5 pb-8 md:px-6 md:pt-6 md:pb-10">
          {about && activeNav === "about" ? <AboutPage product={product} colophon={about} /> : children}
        </main>
      </div>
    </div>
  );
}
