// The small line saying where the data came from, linked when there is a url.
export function Source({ text, url }: { text: string; url?: string }) {
  if (!url) return <div className="hb-source">{text}</div>;
  return <div className="hb-source"><a href={url} target="_blank" rel="noreferrer">{text}</a></div>;
}
