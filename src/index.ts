/**
 * Tolerant surname matching against an official registry.
 *
 * People type surnames on phones, without apostrophes, hyphens, spaces or
 * accents. The registry stores them the "official" way. A match must accept
 * every reasonable way of writing the same surname, but still reject typos:
 * a wrong surname is how we detect a wrong ID number.
 */

export type MatchResult =
  | { match: true; reason: "exact" | "joined" | "first-surname" }
  | { match: false; reason: "empty" | "mismatch" };

const SEPARATORS = /[\s'’`´\-.]+/;

/** Words that start a compound surname and can't stand alone as one. */
const PARTICLES = new Set([
  "D", "DA", "DE", "DEL", "DI", "DO", "DOS", "DU",
  "LA", "LAS", "LE", "LO", "LOS",
  "MAC", "MC", "SAN", "SANTA", "SANTO",
  "VAN", "VON", "Y",
]);

/**
 * Uppercase, strip accents, drop anything that isn't a letter or separator.
 * Ñ folds to N on purpose: plenty of keyboards and old registry records lack
 * it, and rejecting MUNOZ for MUÑOZ blocks a real person for no gain.
 */
export function normalize(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z\s'’`´\-.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split into words. One-letter fragments are KEPT: dropping them is what
 * turned "D'ANGELO" into "ANGELO" and rejected everyone who typed "DANGELO".
 */
export function tokens(input: string): string[] {
  return normalize(input)
    .split(SEPARATORS)
    .filter((t) => t.length > 0);
}

/** The surname with every separator removed: "SAN MARTIN" -> "SANMARTIN". */
export function joined(input: string): string {
  return tokens(input).join("");
}

export function matchSurname(typed: string, registry: string): MatchResult {
  const typedTokens = tokens(typed);
  const registryTokens = tokens(registry);

  if (typedTokens.length === 0 || registryTokens.length === 0) {
    return { match: false, reason: "empty" };
  }

  if (typedTokens.join(" ") === registryTokens.join(" ")) {
    return { match: true, reason: "exact" };
  }

  if (joined(typed) === joined(registry)) {
    return { match: true, reason: "joined" };
  }

  // Compound surnames: "GARCIA LOPEZ" in the registry, "GARCIA" typed.
  // Only whole leading words count, so "GARCI" or "LOPEZ" alone don't match.
  if (registryTokens.length > typedTokens.length) {
    for (let n = 1; n < registryTokens.length; n++) {
      // "SAN" is not the first surname of "SAN MARTIN", nor "DE LA" of "DE LA CRUZ".
      if (PARTICLES.has(registryTokens[n - 1]!)) continue;
      const prefix = registryTokens.slice(0, n).join("");
      if (prefix.length >= 3 && prefix === joined(typed)) {
        return { match: true, reason: "first-surname" };
      }
    }
  }

  return { match: false, reason: "mismatch" };
}
