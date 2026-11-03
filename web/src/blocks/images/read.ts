import { clean, firstText, https, keepFirst, str, type Trail } from "../../core/fields";

export type Photo = { url: string; caption?: string; source?: string };
export type ImagesBlock = { type: "images"; title?: string; images: Photo[] };

/**
 * images: a strip of real photos. Each needs an https url (also `src`); caption also `alt` or `title`, source also
 * `credit`. At most 12.
 *   {type: "images", title: "Lisbon", images: [{url: "https://x.example/a.jpg", caption: "Alfama"}, {url: "http://x.example/b.jpg"}]}
 *   → {type: "images", title: "Lisbon", images: [{url: "https://x.example/a.jpg", caption: "Alfama"}]}
 * Dropped: no photo with an https url.
 */
export function readImages(raw: any, here: Trail): ImagesBlock | null {
  const list = Array.isArray(raw.images) ? raw.images : Array.isArray(raw.photos) ? raw.photos : [];
  const photos: Photo[] = [];
  list.forEach((p: any, i: number) => {
    const url = https(p?.url) ?? https(p?.src);
    if (!url) {
      here.at("images").at(i).drop("photo needs an https url");
      return;
    }
    photos.push(clean({ url, caption: firstText([p.caption, p.alt, p.title], 120), source: firstText([p.source, p.credit], 60) }));
  });
  if (!photos.length) return here.drop("images has no https photo");
  return clean({ type: "images" as const, title: str(raw.title, 60), images: keepFirst(photos, 12, here, "photos") });
}
