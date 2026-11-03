// The hover card every chart shares: a small card beside the pointer with the label, each series's colour, name and
// full value, and an optional note ("40% of total", "▲ 4.2% since start").
import { useLayoutEffect, useRef, useState } from "react";

export type TipRow = { colour: string; name: string; value: string };

/** What the card shows and where it points: x and y in px from the top left of the card's positioned parent. */
export type Tip = { x: number; y: number; title: string; rows: TipRow[]; note?: string };

const GAP = 12;  // between the pointer and the card

/**
 * Where the card goes: 12px right of and above the point, flipped to the left when it would leave the right edge
 * (`boxWidth`) and below the point when it would leave the top.
 *   (x 100, y 200, card 120 x 60, box 600) → left 112, top 128;  x 550 → left 418;  y 20 → top 34
 */
export function tipPlace(x: number, y: number, tipWidth: number, tipHeight: number, boxWidth: number): { left: number; top: number } {
  let left = x + GAP;
  if (left + tipWidth > boxWidth - 2) left = Math.max(2, x - GAP - tipWidth);
  let top = y - tipHeight - GAP;
  if (top < -8) top = y + 14;
  return { left, top };
}

/** The card, inside a parent with position: relative. With tip null it fades out still showing what it last did, so
 *  it doesn't empty mid-fade; it is always in the page, so screen readers hear each new point as it changes. */
export function ChartTip({ tip }: { tip: Tip | null }) {
  const card = useRef<HTMLDivElement>(null);
  const [kept, setKept] = useState(tip);
  if (tip && tip !== kept) setKept(tip);  // remember the last tip shown (React's "state from props" pattern)
  const shown = tip ?? kept;

  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !tip) return;
    const box = el.offsetParent as HTMLElement | null;
    const { left, top } = tipPlace(tip.x, tip.y, el.offsetWidth, el.offsetHeight, box?.clientWidth ?? 0);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [tip]);

  return (
    <div ref={card} className={`hb-tip${tip ? " hb-tip-on" : ""}`} role="status" aria-live="polite">
      {shown && (
        <>
          <div className="hb-tip-title">{shown.title}</div>
          {shown.rows.map((row, k) => (
            <div key={k} className="hb-tip-row">
              <i style={{ background: row.colour }} />
              <span className="hb-tip-name">{row.name}</span>
              <b className="hb-tip-value">{row.value}</b>
            </div>
          ))}
          {shown.note && <div className="hb-tip-note">{shown.note}</div>}
        </>
      )}
    </div>
  );
}
