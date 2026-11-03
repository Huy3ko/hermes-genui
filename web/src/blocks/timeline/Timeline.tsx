// A plan, day by day: times down the left, a dot or icon on a line, then each stop's title, place and note.
import type { TimelineBlock } from "./read";
import { Icon } from "../../lib/Icon";

export function Timeline({ title, groups }: TimelineBlock) {
  return (
    <div className="hb-card hb-timeline">
      {title && <div className="hb-card-title">{title}</div>}
      {groups.map((g, gi) => (
        <div key={gi} className="hb-timeline-group">
          {g.label && <span className="hb-chip hb-chip-soft">{g.label}</span>}
          {g.items.map((s, k) => {
            const last = k === g.items.length - 1;
            return (
              <div key={k} className="hb-stop">
                <span className="hb-stop-time">{s.time ?? ""}</span>
                <span className="hb-stop-rail">
                  <span className="hb-stop-dot">{s.icon ? <Icon name={s.icon} size={12} stroke={2.4} /> : <span className="hb-stop-pip" />}</span>
                  {!last && <span className="hb-stop-line" />}
                </span>
                <div className={last ? "hb-stop-body" : "hb-stop-body hb-stop-body-gap"}>
                  <div className="hb-stop-title">{s.title}</div>
                  {s.place && <div className="hb-stop-place"><Icon name="pin" size={12} stroke={2.2} />{s.place}</div>}
                  {s.note && <div className="hb-stop-note">{s.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
