// How numbers, changes and amounts read in blocks. The only place that calls toLocaleString: plain numbers and
// percentages follow the user's locale (userLocale), rupees always use Indian grouping.
import { userLocale } from "./locale";

/** Digits in Indian grouping (lakh, crore) whatever the user's locale, for rupees.
 *  (294059, 0) → "2,94,059";  (4000000, 0) → "40,00,000";  (12.345, 2) → "12.35" */
export function formatIndian(v: number, digits: number): string {
  return v.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

/** A change with its direction: 3.84 → "▲ 3.8%"; -0.4 in points → "▼ 0.4 pt"; null → "". */
export function formatChange(change: number | null | undefined, unit: "%" | "pt" = "%"): string {
  if (change === null || change === undefined || !isFinite(change)) return "";
  const v = Math.abs(change).toFixed(1);
  const u = unit === "pt" ? " pt" : "%";
  return change > 0 ? `▲ ${v}${u}` : change < 0 ? `▼ ${v}${u}` : `${v}${u}`;
}

// A currency sign, then one of the usual scales or none: "₹Cr", "$M", "€B", "₹".
const MONEY = /^([$₹€£¥])(Cr|K|M|B)?$/;
// A currency sign, then any other scale word of up to 12 letters, spaces or dots: "₹L Cr", "₹ lakh crore", "$bn", "$T".
const MONEY_IN_WORDS = /^([$₹€£¥])(\s?\p{L}[\p{L} .]{0,11})$/u;

/** Money in a currency + scale unit ("₹Cr", "$M", "€B", "$bn", "₹ lakh crore", or just "₹"); null for any other unit.
 *  The sign goes in front and the scale after the number, as written. ₹ uses Indian grouping; $, €, £ and ¥ the user's.
 *  The usual scales keep one decimal under 1,000; other scale words read like a plain number (two decimals under 100).
 *  294059 "₹Cr" → "₹2,94,059 Cr"; 109417 "$M" → "$109,417M" (in de-DE "$109.417M"); 16.39 "₹L Cr" → "₹16.39L Cr";
 *  16.39 "₹ lakh crore" → "₹16.39 lakh crore"; 4.2 "$bn" → "$4.2bn"; 34 "%" → null */
export function formatAmount(v: number, unit: string | undefined): string | null {
  const usual = MONEY.exec(unit ?? "");
  const m = usual ?? MONEY_IN_WORDS.exec(unit ?? "");
  if (!m) return null;
  const [, sym, scale = ""] = m;
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 0 : usual ? (scale ? 1 : 2) : abs >= 100 ? 1 : 2;
  const n = sym === "₹" ? formatIndian(abs, digits) : formatNumber(abs, { digits });
  return `${v < 0 ? "-" : ""}${sym}${n}${scale === "Cr" ? " Cr" : scale}`;
}

/** A number the way the user reads them (userLocale), with at most `digits` decimals. Without `digits`, fewer decimals
 *  as it grows: none from 1,000 up, one from 100, else two.
 *  en-US: 34712.9 → "34,713";  123.45 → "123.5";  0.125 → "0.13";  (1234.5, {digits: 1}) → "1,234.5"
 *  de-DE: (1234.5, {digits: 1}) → "1.234,5";  en-IN: (4000000, {digits: 0}) → "40,00,000" */
export function formatNumber(v: number, { digits }: { digits?: number } = {}): string {
  const abs = Math.abs(v);
  if (digits === undefined) digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  return v.toLocaleString(userLocale(), { maximumFractionDigits: digits });
}

/** A big number shortened the way the reader says it, to 3 significant digits. Rupees pass "en-IN" for lakh and crore.
 *  en-US: 4213500000 → "4.21B";  en-GB → "4.21bn";  de-DE → "4,21 Mrd.";  ja-JP → "42.1億";  en-IN: 1840000 → "18.4L" */
export function formatCompact(v: number, locale: string = userLocale()): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumSignificantDigits: 3 }).format(v);
}

/** A percentage in the user's locale, at most `digits` decimals (one unless told).
 *  en-US: 18.6 → "18.6%";  de-DE: 18.6 → "18,6%" and (1234.56, 0) → "1.235%" */
export function formatPercent(v: number, digits = 1): string {
  return `${formatNumber(v, { digits })}%`;
}

/** A slider's or result's value with its unit: money through formatAmount, % stuck on, any other unit after a space
 *  (one of a plural word drops its "s").
 *  (34712.9, "₹") → "₹34,713";  (8.5, "%") → "8.5%";  (20, "years") → "20 years";  (1, "years") → "1 year";  (12, "k") → "12 k" */
export function formatWithUnit(v: number, unit: string | undefined): string {
  const money = formatAmount(v, unit);
  if (money !== null) return money;
  const n = formatNumber(v);
  if (unit === "%") return `${n}%`;
  if (!unit) return n;
  const isPluralWord = /^[a-z]{3,}s$/i.test(unit);
  if (v === 1 && isPluralWord) return `${n} ${unit.slice(0, -1)}`;
  return `${n} ${unit}`;
}
