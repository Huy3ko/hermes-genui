// The dots view: a pile per formula, one dot per `per`, stacked from the bottom. Each pile is coloured in bands: the
// starting amount, then what the pile before also has, then its own extra, so the difference stands out. New dots
// grow in while playing (at once with less motion).
import { useEffect, useRef } from "react";
import { colourOf, fitCanvas, useTheme } from "../../lib/canvas";
import { lessMotion } from "../../lib/motion";
import { fmt, partColour } from "../chart/chartData";
import { useWidth } from "../chart/useWidth";
import type { SimPile } from "./read";
import { dotColour } from "./sim";

const GROW_MS = 280;
const DOT = 14;  // about this many px a dot takes

type Props = {
  piles: SimPile[]; amounts: (number | null)[]; start: number; per: number; most: number[]; playing: boolean;
  unit?: string; label?: string;
};

export function Piles({ piles, amounts, start, per, most, playing, unit, label }: Props) {
  const counts = amounts.map((a) => Math.max(0, Math.round((a ?? 0) / per)));
  const startDots = Math.max(0, Math.round(start / per));
  const tallest = Math.max(1, ...most.map((m) => Math.round(m / per)));
  return (
    <>
      <div className="hb-sim-piles">
        {piles.map((pile, k) => (
          <Pile key={k} k={k} name={pile.name} amount={amounts[k]} counts={counts} startDots={startDots} tallest={tallest}
            playing={playing} unit={unit} />
        ))}
      </div>
      <div className="hb-legend">
        <span className="hb-legend-item"><i className="hb-legend-dot" style={{ background: partColour(0) }} />
          {`${label ?? "Start"} (a dot is ${fmt(per, unit, { full: true })})`}</span>
        {piles.map((pile, k) => (
          <span key={k} className="hb-legend-item"><i className="hb-legend-dot" style={{ background: partColour(k + 1) }} />
            {pile.adds ?? pile.name}</span>
        ))}
      </div>
    </>
  );
}

type PileProps = {
  k: number; name: string; amount: number | null; counts: number[]; startDots: number; tallest: number; playing: boolean;
  unit?: string;
};

function Pile({ k, name, amount, counts, startDots, tallest, playing, unit }: PileProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const born = useRef<number[]>([]);
  const width = useWidth(canvas);
  const theme = useTheme();
  const count = counts[k];
  const cols = Math.max(20, Math.floor(width / DOT));
  const size = width / cols;
  const height = Math.ceil(tallest / cols) * size;
  const shown = amount === null ? "–" : fmt(amount, unit, { full: true });

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const grow = playing && !lessMotion();
    let frame = 0;
    const draw = () => {
      const fit = fitCanvas(el, height);
      if (!fit) return;
      const now = performance.now();
      const palette = [1, 2, 3, 4].map((i) => colourOf(el, `--hb-chart-${i}`));
      born.current.length = Math.min(born.current.length, count);
      while (born.current.length < count) born.current.push(grow ? now : 0);
      let growing = false;
      fit.ctx.clearRect(0, 0, fit.width, fit.height);
      for (let n = 0; n < count; n++) {
        const g = Math.min(1, (now - born.current[n]) / GROW_MS);
        if (g < 1) growing = true;
        fit.ctx.fillStyle = palette[dotColour(n, startDots, counts, k)];
        fit.ctx.beginPath();
        fit.ctx.arc((n % cols) * size + size / 2, fit.height - (Math.floor(n / cols) * size + size / 2), size * 0.38 * g, 0, Math.PI * 2);
        fit.ctx.fill();
      }
      if (growing) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [count, counts.join(), startDots, width, height, theme]);

  return (
    <div className="hb-sim-pile">
      <div className="hb-sim-pile-name">{name}</div>
      <div className="hb-sim-amount">{shown}</div>
      <canvas ref={canvas} className="hb-sim-canvas" style={{ height }} role="img" aria-label={`${name}: ${shown}, ${count} dots`} />
    </div>
  );
}
