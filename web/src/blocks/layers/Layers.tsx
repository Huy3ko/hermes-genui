// A stack of slabs in light 3D on a canvas (geometry.ts), with the slab list and its note beside it. Back / Next (or
// ← → beside the drawing, a tap on a slab, or a slab's button) pulls one slab out: it slides forward, the stack opens
// round it and its top glows. Dragging the drawing (or ← → on it) turns it up to 40° either way; ↑ ↓ on it change
// slab. Colours follow the theme and are drawn again when it changes; with less motion a slab lands at once.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { colourOf, fitCanvas, useTheme } from "../../lib/canvas";
import { InlineText } from "../../lib/InlineText";
import { lessMotion } from "../../lib/motion";
import { useWidth } from "../chart/useWidth";
import { slabAt, stackShapes, type SlabShape } from "./geometry";
import type { LayersBlock, Tone } from "./read";

const TURN = 40;        // the furthest the stack turns either way, in degrees
const START_YAW = 28;
const PITCH = 30;
const OPEN_MS = 340;
const TONE_TOKEN: Record<Tone, string> = {
  blue: "--hb-chart-1", amber: "--hb-chart-2", green: "--hb-chart-3", violet: "--hb-chart-4", accent: "--hb-accent", grey: "--hb-muted",
};
const rad = (deg: number) => (deg * Math.PI) / 180;

export function Layers({ title, caption, layers }: LayersBlock) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const shapes = useRef<SlabShape[]>([]);
  const drag = useRef<{ x: number; moved: number } | null>(null);
  const [at, setAt] = useState(0);
  const [yaw, setYaw] = useState(START_YAW);
  const open = useOpening(at, layers.length);
  const width = useWidth(canvas);
  const theme = useTheme();
  const layer = layers[at];
  const go = (i: number) => setAt(Math.max(0, Math.min(layers.length - 1, i)));
  const turn = (by: number) => setYaw((was) => Math.max(-TURN, Math.min(TURN, was + by)));

  useEffect(() => {
    const el = canvas.current;
    const fit = el && fitCanvas(el);
    if (!el || !fit) return;
    shapes.current = stackShapes(layers.length, open, rad(yaw), rad(PITCH), fit.width, fit.height);
    paint(fit.ctx, el, fit.width, fit.height, shapes.current, layers.map((l) => l.tone), layers.map((l) => l.label), open);
  }, [open, yaw, width, theme, layers]);

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    drag.current = { x: e.clientX, moved: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current = { x: e.clientX, moved: drag.current.moved + Math.abs(dx) };
    turn(dx * 0.5);
  }
  // A press that barely moved is a tap: it pulls out the slab under it.
  function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
    if (drag.current && drag.current.moved < 5) {
      const box = e.currentTarget.getBoundingClientRect();
      const hit = slabAt(shapes.current, e.clientX - box.left, e.clientY - box.top);
      if (hit !== null) go(hit);
    }
    drag.current = null;
  }
  function onCanvasKey(e: KeyboardEvent) {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => turn(-5), ArrowRight: () => turn(5), ArrowUp: () => go(at + 1), ArrowDown: () => go(at - 1),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    e.stopPropagation();
    moves[e.key]();
  }
  function onSideKey(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(at + (e.key === "ArrowRight" ? 1 : -1));
  }

  const plainNote = layer.note ? ` ${layer.note.replace(/\*\*/g, "")}` : "";
  return (
    <div className="hb-card hb-layers">
      {title && <div className="hb-card-title">{title}</div>}
      <div className="hb-layers-body">
        <div className="hb-layers-stage">
          <canvas ref={canvas} className="hb-layers-canvas" tabIndex={0} role="img"
            aria-label={`${title ?? "Layers"} in 3D, ${layer.label} pulled out, ${at + 1} of ${layers.length}.${plainNote}`}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onPointerCancel={() => { drag.current = null; }} onKeyDown={onCanvasKey} />
          <p className="hb-layers-hint">Drag the drawing, or use ← → on it, to turn it; ↑ ↓ change the slab.</p>
          {caption && <p className="hb-layers-caption">{caption}</p>}
        </div>
        <div className="hb-layers-side" onKeyDown={onSideKey}>
          <div className="hb-steps-head">
            <div className="hb-steps-title">{layer.label}</div>
            <span className="hb-steps-place">{`${at + 1} of ${layers.length}`}</span>
          </div>
          <div className="hb-steps-body" aria-live="polite">
            {layer.note && <p className="hb-steps-text"><InlineText text={layer.note} /></p>}
          </div>
          <div className="hb-steps-foot">
            <div className="hb-steps-moves">
              <button type="button" className="hb-pill" disabled={at === 0} onClick={() => go(at - 1)}>Back</button>
              <button type="button" className="hb-pill hb-pill-solid" disabled={at === layers.length - 1} onClick={() => go(at + 1)}>Next</button>
            </div>
          </div>
          <ol className="hb-layers-list" aria-label="Slabs">
            {layers.map((l, i) => (
              <li key={i}>
                <button type="button" className="hb-layers-slab" aria-pressed={i === at} onClick={() => go(i)}>{l.label}</button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** How far each slab is pulled out (0 to 1): the current one glides to 1 and the rest back to 0 over 340ms, or at once
 *  with less motion. */
function useOpening(at: number, n: number): number[] {
  const [open, setOpen] = useState<number[]>(() => Array.from({ length: n }, (_, i) => (i === at ? 1 : 0)));
  const now = useRef(open);
  now.current = open;
  useEffect(() => {
    const target = Array.from({ length: n }, (_, i) => (i === at ? 1 : 0));
    if (lessMotion() || typeof requestAnimationFrame !== "function") return setOpen(target);
    const from = now.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(time) {
      const p = Math.min(1, (time - start) / OPEN_MS);
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      setOpen(target.map((v, k) => (from[k] ?? 0) + (v - (from[k] ?? 0)) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [at, n]);
  return open;
}

/** Paints the stack: each face first in the page colour, then in its slab's colour at the face's strength (the open
 *  slab in the accent, its top glowing), with a soft outline, then each slab's label beside it. */
function paint(ctx: CanvasRenderingContext2D, el: HTMLElement, width: number, height: number, shapes: SlabShape[],
  tones: Tone[], labels: string[], open: number[]) {
  const surface = colourOf(el, "--hb-surface");
  const ink = colourOf(el, "--hb-ink");
  const accent = colourOf(el, "--hb-accent");
  const font = getComputedStyle(el).fontFamily || "system-ui";
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.textBaseline = "middle";
  shapes.forEach((shape, i) => {
    const lit = (open[i] ?? 0) > 0.5;
    const tone = lit ? accent : colourOf(el, TONE_TOKEN[tones[i]]);
    shape.faces.forEach((face, f) => {
      const roof = f === shape.faces.length - 1;
      ctx.beginPath();
      face.corners.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.shadowColor = accent;
      ctx.shadowBlur = lit && roof ? 18 * (open[i] ?? 0) : 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = surface;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = roof && lit ? 0.45 : face.strength;
      ctx.fillStyle = tone;
      ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = ink;
      ctx.stroke();
    });
    ctx.globalAlpha = lit ? 1 : 0.65;
    ctx.fillStyle = lit ? accent : ink;
    ctx.font = `${lit ? 700 : 600} 12.5px ${font}`;
    ctx.fillText(labels[i], shape.label.x, shape.label.y);
  });
  ctx.globalAlpha = 1;
}
