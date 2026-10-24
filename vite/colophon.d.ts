import type { Plugin } from "vite";

/** What a piece of software does in the product: a role, or a friendlier name and a role. */
export type ColophonRole = string | { name?: string; role: string };

export interface ColophonOptions {
  /** The software the product is built on, most important first: a package name to what it does there. */
  roles?: Record<string, ColophonRole>;
  /** Software that is not an npm package, such as a binary in the image, shown as it is after `roles`. */
  extra?: Array<{ name: string; version?: string; license: string; url?: string; role?: string }>;
}

/** The shape of Colophon in @openasy/ui, kept here so this file stands alone before the library is built. */
export interface BuiltColophon {
  version: string;
  license: string;
  repository: string;
  libraries: Array<{ name: string; version?: string; license: string; url?: string; role?: string }>;
  openasy: Array<{ name: string; version?: string; license: string; url?: string; role?: string }>;
}

/** The colophon of the product whose package.json is at or above `dir`. */
export function buildColophon(dir: string, options?: ColophonOptions): BuiltColophon;

/** Provides `virtual:openasy-colophon` to the product's screens. */
export function colophon(options?: ColophonOptions): Plugin;
