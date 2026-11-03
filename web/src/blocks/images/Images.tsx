// A strip of real photos, each with its caption and credit. A photo that fails to load (a dead link, a hotlink
// block) hides itself; when none load the strip disappears. Clicking one opens it full size.
import { useEffect, useState } from "react";
import type { ImagesBlock, Photo } from "./read";

export function Images({ block }: { block: ImagesBlock }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Photo | null>(null);
  const shown = block.images.filter((p) => !failed.has(p.url));
  if (!shown.length) return null;
  const fail = (url: string) => setFailed((before) => new Set(before).add(url));

  return (
    <figure className="hb-photos">
      {block.title && <figcaption className="hb-chart-title">{block.title}</figcaption>}
      <div className="hb-photo-strip">
        {shown.map((p) => (
          <button key={p.url} type="button" className="hb-photo" onClick={() => setOpen(p)} aria-label={p.caption ?? "Open photo"}>
            <img src={p.url} alt={p.caption ?? ""} loading="lazy" referrerPolicy="no-referrer" onError={() => fail(p.url)} />
            {(p.caption || p.source) && (
              <span className="hb-photo-text">
                {p.caption && <span className="hb-photo-caption">{p.caption}</span>}
                {p.source && <span className="hb-photo-source">{p.source}</span>}
              </span>
            )}
          </button>
        ))}
      </div>
      {open && <Overlay photo={open} onClose={() => setOpen(null)} />}
    </figure>
  );
}

/** The photo full size, fixed over the window (plugins get no react-dom, so no portal); a click anywhere
 *  or Escape closes it. */
function Overlay({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="hb-photo-overlay" role="dialog" aria-label={photo.caption ?? "Photo"} onClick={onClose}>
      <img src={photo.url} alt={photo.caption ?? ""} referrerPolicy="no-referrer" />
      {(photo.caption || photo.source) && (
        <div className="hb-photo-overlay-text">
          {photo.caption}
          {photo.source && <span> · {photo.source}</span>}
        </div>
      )}
    </div>
  );
}
