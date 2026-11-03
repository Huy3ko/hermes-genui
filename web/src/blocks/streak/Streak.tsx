// A streak: the count, a star medal, and the week with each done day ticked and today marked.
import type { StreakBlock } from "./read";
import { Icon } from "../../lib/Icon";
import { formatNumber } from "../../lib/format";

/** The unit as it reads after the count: one of a plural unit drops its "s". (1, "days") → "day"; (3, "days") → "days"; (1, "km") → "km" */
export function unitFor(count: number, unit: string): string {
  if (count === 1 && unit.endsWith("s")) return unit.slice(0, -1);
  return unit;
}

export function Streak({ count, label, unit, days }: StreakBlock) {
  return (
    <div className="hb-card hb-streak">
      <div className="hb-streak-head">
        <div>
          <div className="hb-streak-label">{label}</div>
          <div className="hb-streak-count">{formatNumber(count, { digits: 3 })} <span>{unitFor(count, unit)}</span></div>
        </div>
        <span className="hb-streak-medal"><Icon name="star" size={24} stroke={2.4} /></span>
      </div>
      {days.length > 0 && (
        <div className="hb-streak-week" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d, k) => (
            <div key={k} className={d.today ? "hb-streak-day hb-streak-today" : "hb-streak-day"}>
              <span className="hb-streak-day-label">{d.label}</span>
              {d.done ? (
                <span className="hb-streak-done"><Icon name="check" size={15} stroke={2.6} /></span>
              ) : (
                <span className="hb-streak-date">{d.date ?? "·"}</span>
              )}
              <span className="hb-streak-dot" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
