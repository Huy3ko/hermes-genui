// tiles: cover cards to explore; a tap puts a question in the composer (ask) or sends a message (run).
import { actsBeforeTheModel, clean, firstList, https, icon, keepFirst, NO_SEND, str, textOrNumber, type Trail } from "../../core/fields";
import type { IconName } from "../../lib/icons";

export type TileItem = { title: string; subtitle?: string; image?: string; icon?: IconName; ask?: string; run?: string };
export type TilesBlock = { type: "tiles"; items: TileItem[] };

const MAX_TILES = 8;
const SUBTITLE_MAX = 80;
// The fields a tile's title may come in, best first: models often write a `label` (or only a `text`) for a card.
const TITLE_FIELDS = ["title", "label", "name", "caption", "text"];
// The fields that say more about the tile, in the order they're joined under the title.
const MORE_FIELDS = ["subtitle", "value", "text", "caption", "note", "description"];

/**
 * tiles: cover cards, up to 8 (items, also `tiles`). Each needs a title; an image must be https and an icon one of the
 * icon names (otherwise that field is left off and the tile stays).
 *   {type: "tiles", items: [{title: "Kyoto", image: "javascript:x", icon: "nope", run: "Plan Kyoto"}, {subtitle: "no title"}]}
 *   → {type: "tiles", items: [{title: "Kyoto", run: "Plan Kyoto"}]}
 * A tile whose ask or run is a command or an @-reference ({title: "B", ask: "/reset"}) is dropped, noted NO_SEND.
 * Dropped: no item with a title.
 */
export function readTiles(raw: any, here: Trail): TilesBlock | null {
  const list = firstList([raw.items, raw.tiles]);
  if (!list) return here.drop("tiles needs items");
  const items: TileItem[] = [];
  list.forEach((item, i) => {
    const tile = readTile(item);
    if (!tile) {
      here.at("items").at(i).drop("tile has no title");
      return;
    }
    if (actsBeforeTheModel(tile.ask) || actsBeforeTheModel(tile.run)) {
      here.at("items").at(i).drop(NO_SEND);
      return;
    }
    items.push(tile);
  });
  if (!items.length) return here.drop("tiles has no item with a title");
  return { type: "tiles", items: keepFirst(items, MAX_TILES, here, "tiles") };
}

/**
 * One tile, or null when no field can be its title. The first of TITLE_FIELDS is the title; the rest of its text
 * (MORE_FIELDS, minus the one used as the title) goes under it, joined with " · ".
 *   {label: "Right now", value: "24°C", note: "0 mm rain"} → {title: "Right now", subtitle: "24°C · 0 mm rain"}
 *   {subtitle: "no title"} → null
 */
function readTile(item: any): TileItem | null {
  if (!item || typeof item !== "object") return null;
  const titleField = TITLE_FIELDS.find((f) => str(item[f]) !== undefined);
  if (!titleField) return null;
  const more: string[] = [];
  for (const f of MORE_FIELDS) {
    const text = textOrNumber(item[f], SUBTITLE_MAX);
    if (f !== titleField && text !== undefined) more.push(text);
  }
  const subtitle = more.length ? more.join(" · ").slice(0, SUBTITLE_MAX) : undefined;
  return clean({
    title: str(item[titleField], 40)!, subtitle, image: https(item.image), icon: icon(item.icon),
    ask: str(item.ask, 300), run: str(item.run, 300),
  });
}
