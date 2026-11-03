import { clean, firstList, firstText, keepFirst, str, type Trail } from "../../core/fields";

export const TONES = ["blue", "amber", "green", "violet", "accent", "grey"] as const;
export type Tone = (typeof TONES)[number];
export type Layer = { label: string; tone: Tone; note?: string };
export type LayersBlock = { type: "layers"; title?: string; caption?: string; layers: Layer[] };

/**
 * layers: a stack of slabs, bottom first. Each needs a label (also `title`/`name`, up to 24 characters); tone is one
 * of TONES (anything else is blue); note (also `text`/`description`) shows when the slab is pulled out. Slabs may also
 * come as `levels`. Ids are for the model's own bookkeeping; the drawing steps through the slabs itself.
 *   {type: "layers", layers: [{id: "ip", label: "Internet", tone: "blue"}, {title: "App", tone: "pink"}]}
 *   → {type: "layers", layers: [{label: "Internet", tone: "blue"}, {label: "App", tone: "blue"}]}
 * Dropped: a slab without a label; the whole block when fewer than 2 are left; slabs past the 12th.
 */
export function readLayers(raw: any, here: Trail): LayersBlock | null {
  const layers: Layer[] = [];
  (firstList([raw.layers, raw.levels]) ?? []).forEach((l: any, i) => {
    const label = firstText([l?.label, l?.title, l?.name], 24);
    if (!label) return here.at("layers").at(i).drop("layer needs a label");
    const tone = (TONES as readonly string[]).includes(l.tone) ? (l.tone as Tone) : "blue";
    layers.push(clean({ label, tone, note: firstText([l.note, l.text, l.description], 280) }));
  });
  if (layers.length < 2) return here.drop("layers needs at least 2 slabs");
  return clean({
    type: "layers" as const, title: str(raw.title, 80), caption: str(raw.caption, 200), layers: keepFirst(layers, 12, here, "layers"),
  });
}
