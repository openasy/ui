import { ExternalLink, GitBranch, Mail, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { PRODUCTS, type ProductId } from "../tokens/products";
import { useBrand } from "./BrandProvider";
import { useT } from "./Locale";
import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";

/** One piece of open-source software a product is built on. */
export interface ColophonLibrary {
  name: string;
  version?: string;
  /** SPDX identifier, such as MIT, or "Public domain". */
  license: string;
  url?: string;
  /** What it does in this product, in a few words. */
  role?: string;
}

/** What a product is and what it is built on, made at build time by the colophon() Vite plugin from @openasy/ui/vite. */
export interface Colophon {
  version: string;
  /** The product's own licence, such as AGPL-3.0-only. */
  license: string;
  /** The source code, such as https://github.com/openasy/sast. */
  repository: string;
  /** The container image of this version; the product's image at this version when left out. */
  image?: string;
  libraries: ColophonLibrary[];
  /** OpenAsy's own libraries the product embeds. */
  openasy: ColophonLibrary[];
}

/** OpenAsy's support, when the install names none of its own (Brand.support). */
export const OPENASY_SUPPORT = "info@openasy.com";
export const OPENASY_SUPPORT_PLANS = "https://openasy.github.io/support";

/** Where a support address leads: a mail with the product and version in its subject, or the web address itself. */
export function supportHref(support: string, subject: string): string {
  return /^[^\s@/]+@[^\s@/]+$/.test(support) ? `mailto:${support}?subject=${encodeURIComponent(subject)}` : support;
}

/** The links every product's help menu and About page share. */
export function colophonLinks(product: ProductId, colophon: Colophon, support: string | undefined) {
  const name = `OpenAsy ${PRODUCTS[product].name}`;
  return {
    name,
    support: supportHref(support ?? OPENASY_SUPPORT, `${name} ${colophon.version}`),
    supportLabel: support ?? OPENASY_SUPPORT,
    ownSupport: support !== undefined,
    notes: `${colophon.repository}/releases/tag/v${colophon.version}`,
    security: `${colophon.repository}/security/policy`,
    issues: `${colophon.repository}/issues`,
    dependencies: `${colophon.repository}/network/dependencies`,
    api: "/api/docs/",
  };
}

const LICENSE_NAMES: Record<string, string> = { "AGPL-3.0-only": "AGPL-3.0", "AGPL-3.0-or-later": "AGPL-3.0" };

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-t border-subtle py-2.5 text-sm max-sm:grid-cols-1 max-sm:gap-0.5">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="m-0 min-w-0">{children}</dd>
    </div>
  );
}

function Libraries({ label, items }: { label: string; items: ColophonLibrary[] }) {
  const t = useT();
  return (
    <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr className="border-t border-line bg-subtle text-2xs font-semibold tracking-wider text-fg-muted uppercase">
          <th scope="col" className="px-4 py-2 font-semibold">
            {t("about.project")}
          </th>
          <th scope="col" className="px-4 py-2 font-semibold">
            {t("about.role")}
          </th>
          <th scope="col" className="w-28 px-4 py-2 font-semibold">
            {t("about.version")}
          </th>
          <th scope="col" className="w-32 px-4 py-2 font-semibold">
            {t("about.license")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((l) => (
          <tr key={l.name} className="border-t border-subtle">
            <th scope="row" className="px-4 py-2.5 font-normal">
              {l.url ? <a href={l.url}>{l.name}</a> : l.name}
            </th>
            <td className="px-4 py-2.5 text-fg-muted">{l.role}</td>
            <td className="px-4 py-2.5 font-mono text-xs">{l.version}</td>
            <td className="px-4 py-2.5">
              <span className="inline-flex h-[22px] items-center rounded-full bg-subtle px-2 text-xs font-medium">{l.license}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** What runs here, where to get help, and the open-source software it is built on (ADR 0008). */
export function AboutPage({ product, colophon }: { product: ProductId; colophon: Colophon }) {
  const { brand } = useBrand();
  const t = useT();
  const links = colophonLinks(product, colophon, brand.support);
  const Icon = PRODUCTS[product].icon;
  const license = LICENSE_NAMES[colophon.license] ?? colophon.license;
  const image = colophon.image ?? `${PRODUCTS[product].image}:${colophon.version}`;
  return (
    <>
      <PageHeader title={t("about.title", { product: PRODUCTS[product].name })} description={t("about.description")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="about-install">
          <div className="mb-3 flex items-center gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon className="size-[22px]" />
            </span>
            <div className="min-w-0">
              <h2 id="about-install" className="m-0 text-base font-semibold">
                {links.name}
              </h2>
              <p className="m-0 text-sm text-fg-muted">{PRODUCTS[product].summary}</p>
            </div>
          </div>
          <dl className="m-0">
            <Row label={t("about.version")}>
              {colophon.version} · <a href={links.notes}>{t("about.whatIsNew")}</a>
            </Row>
            <Row label={t("about.image")}>
              <span className="font-mono text-xs break-all">{image}</span>
            </Row>
            <Row label={t("about.license")}>
              {t("about.freeSoftware", { license })} · <a href={colophon.repository}>{t("about.sourceCode")}</a>
            </Row>
            <Row label={t("about.api")}>
              <a href={links.api}>{t("about.apiReference")}</a> · <span className="font-mono text-xs">/api/openapi.json</span>
            </Row>
          </dl>
        </Panel>

        <Panel aria-labelledby="about-support">
          <div className="flex flex-col gap-3.5">
            <div>
              <h2 id="about-support" className="m-0 text-base font-semibold">
                {t("about.needHelp")}
              </h2>
              <p className="mt-1.5 mb-0 text-[15px] leading-relaxed text-fg-muted">{t("about.needHelpText")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={links.support}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-accent bg-accent px-3.5 text-sm font-medium text-accent-contrast no-underline hover:bg-accent-hover"
              >
                {links.support.startsWith("mailto:") ? <Mail aria-hidden className="size-4" /> : <ExternalLink aria-hidden className="size-4" />}
                {links.support.startsWith("mailto:") ? t("about.emailSupport", { address: links.supportLabel }) : t("about.getSupport")}
              </a>
              {!links.ownSupport && (
                <a
                  href={links.issues}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-fg no-underline hover:bg-subtle"
                >
                  <GitBranch aria-hidden className="size-4" />
                  {t("about.askOnGithub")}
                </a>
              )}
            </div>
            <p className="m-0 text-sm text-fg-muted">
              {t("about.mailSays")}
              {!links.ownSupport && (
                <>
                  {" "}
                  <a href={OPENASY_SUPPORT_PLANS}>{t("about.supportPlans")}</a>
                </>
              )}
            </p>
            <p className="m-0 flex items-start gap-2.5 rounded-md bg-warning-soft px-3.5 py-3 text-sm leading-relaxed">
              <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-text" />
              <span>
                {t("about.securityIssue")}{" "}
                <a href={links.security} className="text-warning-text underline">
                  {t("about.reportPrivately")}
                </a>
              </span>
            </p>
          </div>
        </Panel>
      </div>

      <Panel
        flush
        title={t("about.builtWith")}
        description={t("about.builtWithText", { product: PRODUCTS[product].name })}
        actions={
          <a href={links.dependencies} className="text-sm">
            {t("about.everyDependency")}
          </a>
        }
      >
        <div className="overflow-x-auto" tabIndex={0} aria-label={t("about.builtWith")}>
          <Libraries label={t("about.builtWith")} items={colophon.libraries} />
          {colophon.openasy.length > 0 && <Libraries label={t("about.fromOpenAsy")} items={colophon.openasy} />}
        </div>
      </Panel>
    </>
  );
}
