// Flash cards in a grid: every card shows its question; a tap turns that card over to the answer, with its photo when
// there is one. Each card turns on its own, and back on another tap. The turn is a CSS transition (.hb-flip-*); with
// reduced motion the answer fades in instead.
import { useState, type CSSProperties } from "react";
import type { FlipBlock, FlipCard } from "./read";
import { InlineText } from "../../lib/InlineText";
import { flipColumns } from "./columns";

export function Flip({ title, cards }: FlipBlock) {
  const [turned, setTurned] = useState<boolean[]>(() => cards.map(() => false));
  const toggle = (i: number) => setTurned((was) => was.map((t, k) => (k === i ? !t : t)));
  // One photo makes every card taller, so the rows stay even.
  const tall = cards.some((c) => c.image);
  return (
    <div className="hb-flip">
      {title && <div className="hb-card-title">{title}</div>}
      <div className={tall ? "hb-flip-grid hb-flip-tall" : "hb-flip-grid"}
        style={{ "--hb-flip-cols": flipColumns(cards.length) } as CSSProperties}>
        {cards.map((c, i) => (
          <Card key={i} card={c} place={`${i + 1} of ${cards.length}`} turned={turned[i] === true} onTurn={() => toggle(i)} />
        ))}
      </div>
    </div>
  );
}

function Card({ card, place, turned, onTurn }: { card: FlipCard; place: string; turned: boolean; onTurn: () => void }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = card.image && !photoFailed ? card.image : undefined;
  const label = turned ? `${card.front}: ${card.back}` : `${card.front}, tap to see the answer`;
  return (
    <button type="button" className="hb-flip-card" onClick={onTurn} aria-pressed={turned} aria-label={label}>
      <span className={turned ? "hb-flip-inner hb-flip-turned" : "hb-flip-inner"}>
        <span className="hb-flip-face hb-flip-front">
          <span className="hb-flip-label">{place}</span>
          <span className="hb-flip-question"><InlineText text={card.front} /></span>
          <span className="hb-flip-foot"><span>Tap to turn</span><span aria-hidden="true">↻</span></span>
        </span>
        <span className="hb-flip-face hb-flip-back">
          {photo && <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} />}
          <span className="hb-flip-label">Answer</span>
          <span className="hb-flip-answer"><InlineText text={card.back} /></span>
        </span>
      </span>
    </button>
  );
}
