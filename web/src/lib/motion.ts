// Whether to animate. Every glide, packet and fade in the blocks asks first, so a reader who asked for less motion
// sees each change land at once.

/** True when the reader's system asks for reduced motion (or there is no way to ask, as in tests: then false). */
export function lessMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
