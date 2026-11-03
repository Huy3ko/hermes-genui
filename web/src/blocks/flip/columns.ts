/** How many columns a set of flash cards gets on a wide screen: all in one row up to 4, then 3 or 4, whichever
 *  leaves the last row fullest (a tie goes to 4). Narrow screens still wrap to fewer.
 *  4 → 4;  5 → 3 (3 + 2);  6 → 3;  7 → 4 (4 + 3);  8 → 4;  10 → 4 (4 + 4 + 2) */
export function flipColumns(cards: number): number {
  if (cards <= 4) return Math.max(1, cards);
  const lastRow = (cols: number) => cards % cols || cols;
  return lastRow(3) / 3 > lastRow(4) / 4 ? 3 : 4;
}
