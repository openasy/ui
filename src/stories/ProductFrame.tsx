import { useState, type ReactNode } from "react";
import { AppShell, type NavItem } from "../components/AppShell";
import { PRODUCT_IDS, type ProductId } from "../tokens/products";
import { CONNECTED, USER } from "./mocks";

/**
 * Story helper: a product inside its shell, wired to a local nav state and a
 * switcher that lists the other products as connected.
 */
export function ProductFrame({
  product,
  nav,
  active,
  children,
}: {
  product: ProductId;
  nav: NavItem[];
  active?: string;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(active ?? nav[0]?.id);
  const connected = (CONNECTED as readonly ProductId[]).includes(product) ? [...CONNECTED] : [product, ...CONNECTED];
  return (
    <AppShell
      product={product}
      nav={nav}
      activeNav={current}
      onNavigate={setCurrent}
      connectedProducts={connected as ProductId[]}
      availableProducts={PRODUCT_IDS.filter((p) => !connected.includes(p as never))}
      user={USER}
    >
      {children}
    </AppShell>
  );
}
