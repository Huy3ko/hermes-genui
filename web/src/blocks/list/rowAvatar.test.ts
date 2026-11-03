import { describe, expect, it } from "vitest";
import { avatarColour, initialOf, rowLead } from "./rowAvatar";

describe("a list row's first letter", () => {
  it("is the first letter or digit of the words a reader sees", () => {
    expect(initialOf("Asha · Lease renewal")).toBe("A");
    expect(initialOf("📦 amazon.in · Your order")).toBe("A");
    expect(initialOf("**ravi**")).toBe("R");
    expect(initialOf("3M · Invoice")).toBe("3");
  });
  it("is null for a title of only emoji or spaces", () => {
    expect(initialOf("🎉🎉")).toBeNull();
    expect(initialOf("   ")).toBeNull();
    expect(initialOf("")).toBeNull();
  });
});

describe("which picture a row leads with", () => {
  it("prefers a photo, then an icon, then the letter", () => {
    expect(rowLead({ title: "Asha", image: "https://x.test/a.jpg", icon: "mail" }, false, false)).toBe("image");
    expect(rowLead({ title: "Asha", icon: "alert" }, false, false)).toBe("icon");
    expect(rowLead({ title: "Asha · Lease renewal" }, false, false)).toBe("initial");
  });
  it("falls back to the letter when the photo failed to load", () => {
    expect(rowLead({ title: "Asha", image: "https://x.test/a.jpg" }, false, true)).toBe("initial");
  });
  it("shows nothing in a ranked list or for a title with no letter", () => {
    expect(rowLead({ title: "Third Wave" }, true, false)).toBe("none");
    expect(rowLead({ title: "🎉" }, false, false)).toBe("none");
  });
});

describe("the circle's colour", () => {
  it("is the same for a sender in every row, whatever the subject, case or bold", () => {
    expect(avatarColour("Asha · Lease renewal")).toBe(avatarColour("asha · Dinner on Sat"));
    expect(avatarColour("Asha")).toBe(avatarColour("  ASHA "));
    expect(avatarColour("**Asha**")).toBe(avatarColour("Asha"));
  });
  it("is one of the palette's colours, and names spread over them", () => {
    const names = ["Asha", "Ravi", "Meera", "Bank", "Netflix", "Docs", "Kiran", "Zoe", "Uber", "Swiggy"];
    const colours = new Set(names.map(avatarColour));
    for (const c of colours) expect(c).toMatch(/^var\(--hb-chart-[13468]\)$/);
    expect(colours.size).toBeGreaterThan(3);
  });
});
