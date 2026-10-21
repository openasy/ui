import { useEffect, useState } from "react";

/**
 * Pages are plain paths, /people/abc, not #/people/abc: links can be copied, opened in a new tab and bookmarked.
 * The product's server answers every page path with its index.html.
 */

/** Opens a page of this product, such as /people/abc, without reloading. */
export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (path === location.pathname + location.search) return;
  if (replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** The current page's path; follows navigate(), page links and the back button. */
export function usePath() {
  const [at, setAt] = useState(() => location.pathname + location.search);
  useEffect(() => {
    const onPop = () => setAt(location.pathname + location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return at.split("?")[0]!;
}

/**
 * Makes links to the product's pages, <a href="/people/abc">, open without a reload, and turns an address from
 * before, /#/people/abc, into /people/abc. `pages` are the first path segments that are pages; any other link (the
 * API, sign-in, another product) is left to the browser. Call once at start; returns a function that stops it.
 */
export function followLinks(pages: readonly string[]) {
  if (location.hash.startsWith("#/")) history.replaceState(null, "", location.hash.slice(1));
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    const page = url.pathname.split("/")[1] ?? "";
    if (url.origin !== location.origin || (page !== "" && !pages.includes(page))) return;
    if (url.hash && url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    navigate(url.pathname + url.search);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
