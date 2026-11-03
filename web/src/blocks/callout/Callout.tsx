// A tinted box with an icon: a warning, a tip or the one-line takeaway.
import { Icon } from "../../lib/Icon";
import type { IconName } from "../../lib/icons";
import { InlineText } from "../../lib/InlineText";
import type { CalloutBlock } from "./read";

const TONE_ICON: Record<CalloutBlock["tone"], IconName> = { info: "info", tip: "spark", warn: "alert" };

export function Callout({ tone, title, text }: CalloutBlock) {
  return (
    <div className={`hb-callout hb-callout-${tone}`}>
      <span className="hb-callout-icon"><Icon name={TONE_ICON[tone]} size={17} stroke={2.2} /></span>
      <div className="hb-callout-body">
        {title && <div className="hb-callout-title"><InlineText text={title} /></div>}
        <div><InlineText text={text} /></div>
      </div>
    </div>
  );
}
