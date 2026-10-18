const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Random id for one script session (docs/PROTOCOL.md §2). It only has to differ between reloads, so a
 * non-cryptographic source is enough; it is not a secret.
 */
export function createSessionId(random: () => number = Math.random, length = 8): string {
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  return id;
}
