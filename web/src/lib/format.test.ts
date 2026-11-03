import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fmt } from "../blocks/chart/chartData";
import { formatAmount, formatChange, formatCompact, formatNumber, formatPercent, formatWithUnit } from "./format";
import { pinLocale } from "./locale.testing";

afterEach(() => vi.restoreAllMocks());

describe("formatChange and formatAmount", () => {
  it("shows direction and unit", () => {
    expect(formatChange(3.84, "%")).toBe("▲ 3.8%");
    expect(formatChange(-0.4, "pt")).toBe("▼ 0.4 pt");
    expect(formatChange(0, "%")).toBe("0.0%");
    expect(formatChange(null)).toBe("");
  });
  it("writes currency + scale units, and leaves other units alone", () => {
    expect(formatAmount(294059, "₹Cr")).toBe("₹2,94,059 Cr");
    expect(formatAmount(109417, "$M")).toBe("$109,417M");
    expect(formatAmount(-15342, "₹Cr")).toBe("-₹15,342 Cr");
    expect(formatAmount(34, "%")).toBeNull();
  });
});

describe("numbers with units", () => {
  beforeEach(() => pinLocale("en-US"));
  it("writes money, percent, words and plain numbers", () => {
    expect(formatWithUnit(34712.9, "₹")).toBe("₹34,713");
    expect(formatWithUnit(8.5, "%")).toBe("8.5%");
    expect(formatWithUnit(20, "years")).toBe("20 years");
    expect(formatWithUnit(1, "years")).toBe("1 year");
    expect(formatWithUnit(12, "k")).toBe("12 k");
    expect(formatNumber(0.125)).toBe("0.13");
    expect(formatNumber(123.45)).toBe("123.5");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("numbers follow the user's locale", () => {
  it("groups and marks decimals the local way", () => {
    pinLocale("de-DE");
    expect(formatNumber(1234.5, { digits: 1 })).toBe("1.234,5");
    expect(formatPercent(18.6)).toBe("18,6%");
    pinLocale("en-US");
    expect(formatNumber(1234.5, { digits: 1 })).toBe("1,234.5");
    expect(formatPercent(18.6)).toBe("18.6%");
  });
  it("keeps lakh grouping in plain spots and L/Cr in the big figure on an Indian install", () => {
    pinLocale("en-IN");
    expect(formatNumber(4000000, { digits: 0 })).toBe("40,00,000");
    expect(fmt(4000000)).toBe("40L");
  });
  it("keeps Indian grouping for rupees, and the user's grouping for other money", () => {
    pinLocale("de-DE");
    expect(formatAmount(294059, "₹Cr")).toBe("₹2,94,059 Cr");
    expect(fmt(4000000, "₹")).toBe("₹40L");
    expect(fmt(54321, "₹")).toBe("₹54,321");
    expect(formatAmount(109417, "$M")).toBe("$109.417M");
    expect(fmt(1234.5)).toBe("1.235");
    expect(fmt(12.5, "%")).toBe("12,5%");
  });
});

describe("short big numbers", () => {
  it("shortens from 100,000 up in the user's own words", () => {
    pinLocale("en-US");
    expect(formatCompact(4213500000)).toBe("4.21B");
    expect(formatCompact(1840000)).toBe("1.84M");
    expect(fmt(4213500000)).toBe("4.21B");
    expect(fmt(250000)).toBe("250K");
    expect(fmt(54321)).toBe("54,321");
    pinLocale("en-GB");
    expect(fmt(4213500000)).toBe("4.21bn");
    pinLocale("de-DE");
    expect(fmt(4213500000)).toMatch(/^4,21\sMrd\.$/);
    pinLocale("ja-JP");
    expect(fmt(4213500000)).toBe("42.1億");
  });
  it("uses lakh and crore for rupees everywhere, and for plain numbers on an Indian install", () => {
    pinLocale("en-US");
    expect(fmt(1840000, "₹")).toBe("₹18.4L");
    expect(fmt(4213500000, "₹")).toBe("₹421Cr");
    pinLocale("en-IN");
    expect(fmt(1840000)).toBe("18.4L");
  });
  it("puts a currency sign in front, and keeps other units after", () => {
    pinLocale("en-US");
    expect(fmt(4213500000, "$")).toBe("$4.21B");
    expect(fmt(950, "$")).toBe("$950");
    expect(fmt(-2500000, "€")).toBe("-€2.5M");
    expect(fmt(1500000, "kg")).toBe("1.5M kg");
  });
  it("writes every digit when asked for the full figure", () => {
    pinLocale("en-US");
    expect(fmt(4213500000, undefined, { full: true })).toBe("4,213,500,000");
    expect(fmt(1840000, "₹", { full: true })).toBe("₹18,40,000");
    expect(fmt(4213500000, "$", { full: true })).toBe("$4,213,500,000");
  });
  it("leaves percentages and already-scaled money alone", () => {
    pinLocale("en-US");
    expect(fmt(250000, "%")).toBe("250,000%");
    expect(fmt(109417, "$M")).toBe("$109,417M");
  });
  it("puts the sign of a currency-led scale in front and the scale after, never shortening it again", () => {
    pinLocale("en-US");
    expect(fmt(16.39, "₹L Cr")).toBe("₹16.39L Cr");
    expect(fmt(16.39, "₹ lakh crore")).toBe("₹16.39 lakh crore");
    expect(fmt(4.2, "$bn")).toBe("$4.2bn");
    expect(fmt(4.2, "$T")).toBe("$4.2T");
    expect(fmt(-4.2, "$bn")).toBe("-$4.2bn");
    expect(fmt(250000, "$bn")).toBe("$250,000bn");
    expect(fmt(1234567, "₹ lakh crore")).toBe("₹12,34,567 lakh crore");
    expect(formatAmount(16.39, "₹L Cr")).toBe("₹16.39L Cr");
    expect(formatWithUnit(4.2, "$bn")).toBe("$4.2bn");
  });
  it("writes a word unit of up to 12 characters after a space, and drops the points word and longer text", () => {
    pinLocale("en-US");
    expect(fmt(1250, "MW")).toBe("1,250 MW");
    expect(fmt(12, "people")).toBe("12 people");
    expect(fmt(12, "participants")).toBe("12 participants");
    expect(fmt(1500000, "tonnes")).toBe("1.5M tonnes");
    expect(fmt(24310, "pts")).toBe("24,310");
    expect(fmt(12, "people in the survey")).toBe("12");
  });
});
