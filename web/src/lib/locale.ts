// The language and region numbers are formatted in: the one the app runs in.
export function userLocale(): string {
  return typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
}

/** Lakh and crore (1.2L, 3.4Cr) are how amounts are read in India; elsewhere plain thousands. */
export function usesLakhCrore(): boolean {
  return /-IN$/.test(userLocale());
}
