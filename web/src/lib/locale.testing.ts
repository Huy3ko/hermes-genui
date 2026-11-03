// For tests only: run as if the app were in another language and region. Undo with vi.restoreAllMocks().
import { vi } from "vitest";

/** pinLocale("de-DE") → userLocale() is "de-DE" (and usesLakhCrore() false) until the mocks are restored. */
export function pinLocale(locale: string): void {
  vi.spyOn(navigator, "language", "get").mockReturnValue(locale);
}
