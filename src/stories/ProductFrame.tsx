import { useState, type ReactNode } from "react";
import { AppShell, type NavItem } from "../components/AppShell";
import { Callout } from "../components/Callout";
import { PRODUCT_IDS, PRODUCTS, type ProductId } from "../tokens/products";
import { CONNECTED, USER } from "./mocks";
import { IntegrationsPage, SettingsPage } from "./shared/CommonPages";

function linkedProducts(product: ProductId) {
  const connected = ((CONNECTED as readonly ProductId[]).includes(product) ? [...CONNECTED] : [product, ...CONNECTED]) as ProductId[];
  return { connected, available: PRODUCT_IDS.filter((p) => !connected.includes(p)) };
}

/**
 * Story helper: a product inside its shell, wired to a local nav state and a
 * switcher that lists the other products as connected.
 */
export function ProductFrame({ product, nav, active, children }: { product: ProductId; nav: NavItem[]; active?: string; children: ReactNode }) {
  const [current, setCurrent] = useState(active ?? nav[0]?.id);
  const { connected, available } = linkedProducts(product);
  return (
    <AppShell product={product} nav={nav} activeNav={current} onNavigate={setCurrent} connectedProducts={connected} availableProducts={available} user={USER}>
      {children}
    </AppShell>
  );
}

export type PageMap = Record<string, () => ReactNode>;

/**
 * A whole product as a clickable UI: every nav item opens its own page.
 * Integrations and Settings are shared by all products unless a product
 * provides its own. A nav item without a page shows a "not designed" notice,
 * which fails the story tests, so no page can be forgotten.
 */
export function ProductApp({ product, nav, pages, initial }: { product: ProductId; nav: NavItem[]; pages: PageMap; initial?: string }) {
  const [current, setCurrent] = useState(initial ?? nav[0]?.id ?? "");
  const { connected, available } = linkedProducts(product);
  const navigate = (id: string) => {
    setCurrent(id);
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0 });
  };
  const all: PageMap = {
    integrations: () => <IntegrationsPage product={product} />,
    settings: () => <SettingsPage product={product} />,
    ...pages,
  };
  const page = all[current];
  const item = [...nav].find((n) => n.id === current);
  return (
    <AppShell product={product} nav={nav} activeNav={current} onNavigate={navigate} connectedProducts={connected} availableProducts={available} user={USER}>
      <div key={current} className="contents" data-page={current}>
        {page ? (
          page()
        ) : (
          <div data-testid="not-designed">
            <Callout tone="warning" title={`Page not designed yet: ${PRODUCTS[product].name} · ${typeof item?.label === "string" ? item.label : current}`} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
