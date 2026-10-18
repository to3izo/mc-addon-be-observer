import { NAMESPACE } from "../constants/addon.ts";

/** Builds a namespaced identifier, e.g. `id("ruby_sword")` -> `"addon_template:ruby_sword"`. */
export function id(name: string): `${string}:${string}` {
  return `${NAMESPACE}:${name}`;
}

/** True when the identifier belongs to this Add-On's namespace. */
export function isOwnIdentifier(identifier: string): boolean {
  return identifier.startsWith(`${NAMESPACE}:`);
}
