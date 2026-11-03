import { clean, keepFirst, num, str, type Trail } from "../../core/fields";

export type Day = { label: string; date?: string; done: boolean; today: boolean };
export type StreakBlock = { type: "streak"; count: number; label: string; unit: string; days: Day[] };

/**
 * streak: a count and up to 7 days, each ticked or not. Label defaults to "Current streak", unit to "days". A day
 * needs a label (cut to 4 characters: "Mon", "Thu"); its date is cut to 3 ("12").
 *   {type: "streak", count: 3, days: [{label: "Thu", date: "12", today: true}]}
 *   → {type: "streak", count: 3, label: "Current streak", unit: "days", days: [{label: "Thu", date: "12", done: false, today: true}]}
 * Dropped: no numeric count.
 */
export function readStreak(raw: any, here: Trail): StreakBlock | null {
  const count = num(raw.count);
  if (count === null) return here.drop("streak needs a numeric count");
  const days: Day[] = [];
  const rawDays = Array.isArray(raw.days) ? raw.days : [];
  rawDays.forEach((d: any, i: number) => {
    const label = str(d?.label, 4);
    if (!label) {
      here.at("days").at(i).drop("day has no label");
      return;
    }
    days.push(clean({ label, date: str(d.date, 3), done: d.done === true, today: d.today === true }));
  });
  const label = str(raw.label, 30) ?? "Current streak";
  const unit = str(raw.unit, 12) ?? "days";
  return { type: "streak", count, label, unit, days: keepFirst(days, 7, here, "days") };
}
