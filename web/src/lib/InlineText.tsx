// Inline text in blocks: **bold** is the only markup a model's text may carry.
import type { ReactNode } from "react";

/**
 * Text with **bold** drawn as bold; everything else stays as written.
 *   "Leave at **7:10** sharp" → ["Leave at ", <strong>7:10</strong>, " sharp"]
 */
export function InlineText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
