// A list row with no icon and no photo shows the first letter of its title in a coloured circle, the way a mail app
// shows senders. The colour comes from the name, so the same sender gets the same colour in every list.

/** What a row shows at its left, after the rank number (if any). */
export type RowLead = "image" | "icon" | "initial" | "none";

/** The chart palette's colours that white text reads well on (amber, cyan and lime are too light). */
const AVATAR_COLOURS = [1, 3, 8, 4, 6];  // blue, green, pink, violet, red

/**
 * Which picture a row leads with. Its photo when it has one that loads; else its icon; else the first letter of its
 * title, unless the list is ranked (the rank number already fills that spot) or the title has no letter to show.
 *   {title: "Asha · Lease renewal", icon: "alert"}                 → "icon"
 *   {title: "Asha · Lease renewal"}                                 → "initial" (an "A" in a circle)
 *   {title: "Asha", image: "https://…"} whose photo failed to load  → "initial"
 *   {title: "Third Wave"} in a ranked list                          → "none" (the rank number is there)
 *   {title: "🎉🎉"}                                                  → "none" (no letter to show)
 */
export function rowLead(item: { title: string; icon?: string; image?: string }, ranked: boolean, photoFailed: boolean): RowLead {
  if (item.image && !photoFailed) return "image";
  if (item.icon) return "icon";
  if (ranked) return "none";
  if (initialOf(item.title) === null) return "none";
  return "initial";
}

/**
 * The letter for a title's circle: the first letter or digit, upper-cased. Emoji, ** and punctuation are skipped;
 * null when nothing is left.
 *   "Asha · Lease renewal"      → "A"
 *   "📦 amazon.in · Your order"  → "A"
 *   "**ravi**"                  → "R"
 *   "🎉" or "  "                → null
 */
export function initialOf(title: string): string | null {
  const first = title.match(/[\p{L}\p{N}]/u);
  if (!first) return null;
  return first[0].toLocaleUpperCase();
}

/**
 * The circle's colour, as a CSS value: one of the palette's colours, picked by the name (the title up to " · ",
 * without ** and ignoring case and spaces at the ends), so a sender keeps their colour across rows and replies.
 *   "Asha · Lease renewal" and "asha · Dinner on Sat" → the same colour
 *   "Asha" and "Ravi"                                  → usually different ones (5 colours to go round)
 */
export function avatarColour(title: string): string {
  const name = title.replaceAll("**", "").split(" · ")[0].trim().toLowerCase();
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.codePointAt(0)!) % 1_000_003;
  }
  return `var(--hb-chart-${AVATAR_COLOURS[hash % AVATAR_COLOURS.length]})`;
}
