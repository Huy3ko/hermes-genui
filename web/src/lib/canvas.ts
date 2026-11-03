// Drawing on a canvas in blocks: sized to its box at the screen's density, in the theme's colours, drawn again when
// the theme changes. Colours come from the hb- tokens, worked out on the canvas itself so they follow light and dark.
import { useEffect, useState } from "react";

/** A canvas sized to its box (or to `height` px tall) at the screen's pixel density; its context and size in CSS px,
 *  or null where nothing can be drawn (no 2D context, as in tests). */
export function fitCanvas(canvas: HTMLCanvasElement, height?: number): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const tall = height ?? canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(tall * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height: tall };
}

/** A token as a colour the canvas can paint with, worked out where the canvas sits: colourOf(canvas, "--hb-accent")
 *  → "rgb(47, 111, 237)" in light mode. */
export function colourOf(el: HTMLElement, token: string): string {
  const before = el.style.color;
  el.style.color = `var(${token})`;
  const colour = getComputedStyle(el).color;
  el.style.color = before;
  return colour;
}

/** A number that goes up whenever the app's theme changes (Hermes puts .dark on the page; the system can switch
 *  too), so a canvas can draw itself again in the new colours. */
export function useTheme(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const watcher = typeof MutationObserver === "undefined" ? null : new MutationObserver(bump);
    watcher?.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    const scheme = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    scheme?.addEventListener?.("change", bump);
    return () => {
      watcher?.disconnect();
      scheme?.removeEventListener?.("change", bump);
    };
  }, []);
  return version;
}
