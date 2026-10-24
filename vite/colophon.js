// The colophon() Vite plugin: what a product is and what it is built on, read from its package.json and node_modules
// when it is built, so the About page never falls behind (ADR 0008). Products import it as virtual:openasy-colophon.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ID = "virtual:openasy-colophon";

/** Every product's sign-in, screens and server are built on these; a product adds its own with `roles`. */
const SHARED = {
  "openid-client": { role: "Sign-in through another provider" },
  "@simplewebauthn/server": { name: "SimpleWebAuthn", role: "Passkeys" },
  uqr: { role: "The QR code for an authenticator app" },
  react: { name: "React", role: "The screens" },
  i18next: { role: "The screens in your language" },
  "lucide-react": { name: "Lucide", role: "Icons" },
  "@radix-ui/react-popover": { name: "Radix UI", role: "Menus and dialogs" },
};
const OPENASY = {
  "@openasy/auth": "Sign-in, members and API tokens, the same in every product",
  "@openasy/ui": "The components every product shares",
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** The folder of the nearest package.json at or above `dir`. */
function packageRoot(dir) {
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(d, "package.json"))) return d;
    if (dirname(d) === d) throw new Error(`colophon: no package.json at or above ${dir}`);
  }
}

const cleanUrl = (u) =>
  u
    ?.replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "");

/** A package's version, licence and address, from the copy the product would load, or undefined when it has none. */
function installed(root, name) {
  for (let d = root; ; d = dirname(d)) {
    const path = join(d, "node_modules", name, "package.json");
    if (existsSync(path)) {
      const p = readJson(path);
      const repo = typeof p.repository === "string" ? p.repository : p.repository?.url;
      return {
        version: p.version,
        license: typeof p.license === "string" ? p.license : (p.license?.type ?? p.licenses?.[0]?.type ?? "Unknown"),
        url: cleanUrl(p.homepage) ?? cleanUrl(repo),
      };
    }
    if (dirname(d) === d) return undefined;
  }
}

/**
 * Builds the colophon of the product whose package.json is at or above `dir`. `roles` names the software it is built
 * on, most important first, with what each does in it: a package name to a role, or to `{ name, role }` for a
 * friendlier name. `extra` adds software that is not an npm package, such as a binary in the image, as it is shown.
 * Node.js and SQLite (ADR 0011), the libraries every product uses and OpenAsy's own follow.
 */
export function buildColophon(dir, { roles = {}, extra = [] } = {}) {
  const root = packageRoot(dir);
  const pkg = readJson(join(root, "package.json"));
  const repo = cleanUrl(typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url);
  const lib = (id, spec) => {
    const found = installed(root, id);
    if (!found) return undefined;
    const { name = id, role } = typeof spec === "string" ? { role: spec } : spec;
    return { name, version: found.version, license: found.license, url: found.url, role };
  };
  const nvmrc = join(root, ".nvmrc");
  const node = existsSync(nvmrc) ? readFileSync(nvmrc, "utf8").trim() : undefined;
  const own = Object.entries(roles).map(([id, spec]) => lib(id, spec));
  const shared = Object.entries(SHARED)
    .filter(([id]) => !(id in roles))
    .map(([id, spec]) => lib(id, spec));
  return {
    version: pkg.version,
    license: pkg.license,
    repository: repo ?? `https://github.com/openasy/${pkg.name.replace(/^@openasy\//, "")}`,
    libraries: [
      ...own,
      ...extra,
      {
        name: "Node.js",
        version: node && `${node.replace(/^v/, "")}${/^\d+$/.test(node) ? " LTS" : ""}`,
        license: "MIT",
        url: "https://nodejs.org/",
        role: "Runs the server",
      },
      { name: "SQLite", version: "in Node.js", license: "Public domain", url: "https://sqlite.org/", role: "The database, one file" },
      ...shared,
    ].filter(Boolean),
    openasy: Object.entries(OPENASY)
      .map(([id, role]) => lib(id, role))
      .filter(Boolean),
  };
}

/** The Vite plugin: `import colophon from "virtual:openasy-colophon"` in the product's screens. */
export function colophon(options = {}) {
  let dir = process.cwd();
  return {
    name: "openasy-colophon",
    configResolved(config) {
      dir = config.root;
    },
    resolveId(source) {
      return source === ID ? `\0${ID}` : undefined;
    },
    load(id) {
      return id === `\0${ID}` ? `export default ${JSON.stringify(buildColophon(dir, options))};` : undefined;
    },
  };
}
