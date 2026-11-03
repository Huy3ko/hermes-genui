// The icon names blocks may use (a timeline stop's `icon`). The drawings are in Icon.tsx.
export const ICON_NAMES = [
  "mail", "rupee", "bell", "cal", "check", "clock", "chart", "photo", "spark", "chat", "brain", "sun", "moon", "sunset",
  "note", "globe", "search", "heart", "plane", "bed", "food", "walk", "pin", "trophy", "lock", "star", "leaf", "flame",
  "ticket", "info", "alert",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
