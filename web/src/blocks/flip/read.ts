import { clean, firstWords, https, keepFirst, str, type Trail } from "../../core/fields";

export type FlipCard = { front: string; back: string; image?: string };
export type FlipBlock = { type: "flip"; title?: string; cards: FlipCard[] };

const FRONT_MAX = 140, BACK_MAX = 260;

/**
 * flip: flash cards, each with a front (the question) and a back (the answer, with an https photo when there is one).
 * "question" and "answer" are taken as the front and back too, since models guess those names.
 *   {type: "flip", cards: [{front: "Most golds?", back: "China · 201"}, {question: "Host?", answer: "Nagoya"}]}
 *   → {type: "flip", cards: [{front: "Most golds?", back: "China · 201"}, {front: "Host?", back: "Nagoya"}]}
 * A front keeps up to 140 characters and a back up to 260 (the model is asked for 120 and 240); a longer side is cut
 * between words and ends in "…".
 * Dropped: a card without a front or a back; the whole block when no card is left; cards past the 12th.
 */
export function readFlip(raw: any, here: Trail): FlipBlock | null {
  const rawCards = Array.isArray(raw.cards) ? raw.cards : [];
  const cards: FlipCard[] = [];
  rawCards.forEach((c: any, i: number) => {
    const front = firstWords([c?.front, c?.question], FRONT_MAX);
    const back = firstWords([c?.back, c?.answer], BACK_MAX);
    if (!front || !back) {
      here.at("cards").at(i).drop("card needs a front and a back");
      return;
    }
    cards.push(clean({ front, back, image: https(c.image) }));
  });
  if (!cards.length) return here.drop("flip has no cards");
  return clean({ type: "flip" as const, title: str(raw.title, 60), cards: keepFirst(cards, 12, here, "cards") });
}
