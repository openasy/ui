import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildColophon } from "../../vite/colophon.js";
import { supportHref } from "./About";

/** A product folder with its package.json, .nvmrc and the packages it would load. */
function product(packages: Record<string, object>) {
  const root = mkdtempSync(join(tmpdir(), "colophon-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "@openasy/sast", version: "0.6.0", license: "AGPL-3.0-only", repository: { url: "git+https://github.com/openasy/sast.git" } }),
  );
  writeFileSync(join(root, ".nvmrc"), "26\n");
  for (const [name, p] of Object.entries(packages)) {
    mkdirSync(join(root, "node_modules", name), { recursive: true });
    writeFileSync(join(root, "node_modules", name, "package.json"), JSON.stringify(p));
  }
  mkdirSync(join(root, "web"));
  return root;
}

describe("colophon", () => {
  it("reads the product and what it is built on from its package.json and node_modules", () => {
    const root = product({
      "oidc-provider": { version: "9.12.2", license: "MIT", homepage: "https://github.com/panva/node-oidc-provider" },
      "@simplewebauthn/server": { version: "14.0.3", license: "MIT", repository: "git+https://github.com/MasterKale/SimpleWebAuthn.git" },
      react: { version: "19.3.1", license: "MIT", homepage: "https://react.dev/" },
      "lucide-react": { version: "1.59.0", license: "ISC" },
      "@openasy/ui": { version: "0.9.0", license: "Apache-2.0" },
    });
    // Found from web/, where the screens' Vite config is.
    const c = buildColophon(join(root, "web"), {
      roles: {
        "oidc-provider": "The OpenID Connect provider",
        "@simplewebauthn/server": { name: "SimpleWebAuthn", role: "Sign-in with a passkey" },
        missing: "Left out",
      },
      extra: [{ name: "VictoriaLogs", version: "1.53.0", license: "Apache-2.0", role: "Stores the logs" }],
    });
    expect(c).toMatchObject({ version: "0.6.0", license: "AGPL-3.0-only", repository: "https://github.com/openasy/sast" });
    // A product's own role wins over the shared one, and a package it does not have is left out.
    expect(c.libraries.map((l) => l.name)).toEqual(["oidc-provider", "SimpleWebAuthn", "VictoriaLogs", "Node.js", "SQLite", "React", "Lucide"]);
    expect(c.libraries[1]).toEqual({
      name: "SimpleWebAuthn",
      version: "14.0.3",
      license: "MIT",
      url: "https://github.com/MasterKale/SimpleWebAuthn",
      role: "Sign-in with a passkey",
    });
    expect(c.libraries[3]).toMatchObject({ name: "Node.js", version: "26 LTS", license: "MIT" });
    expect(c.openasy).toEqual([{ name: "@openasy/ui", version: "0.9.0", license: "Apache-2.0", url: undefined, role: "The components every product shares" }]);
  });

  it("mails an address with the product in the subject, and leaves a web address as it is", () => {
    expect(supportHref("help@example.com", "OpenAsy SAST 0.6.0")).toBe("mailto:help@example.com?subject=OpenAsy%20SAST%200.6.0");
    expect(supportHref("https://help.example.com/", "x")).toBe("https://help.example.com/");
  });
});
