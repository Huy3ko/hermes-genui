import { describe, expect, it } from "vitest";
import { balance, emi, evaluate, interestPaid, namesIn, newBudget, parseFormula, prepay, principalPaid, sip } from "./formula";

const values = new Map([["p", 4000000], ["r", 8.5], ["n", 20], ["zero", 0]]);
const calc = (f: string) => evaluate(f, values);

describe("arithmetic", () => {
  it("adds, multiplies, divides and raises in the usual order", () => {
    expect(calc("1 + 2 * 3")).toBe(7);
    expect(calc("(1 + 2) * 3")).toBe(9);
    expect(calc("2 ^ 3 ^ 2")).toBe(512);   // right to left: 2^(3^2)
    expect(calc("-2 ^ 2")).toBe(-4);       // as in maths: -(2^2)
    expect(calc("2 ^ -1")).toBe(0.5);
    expect(calc("10 - 4 - 3")).toBe(3);    // left to right
    expect(calc("12 / 4 / 3")).toBe(1);
    expect(calc("1.5e3 + .5")).toBe(1500.5);
    expect(calc("  p / n  ")).toBe(200000);
  });
  it("compares, giving 1 or 0", () => {
    expect(calc("r > 8")).toBe(1);
    expect(calc("r <= 8")).toBe(0);
    expect(calc("n == 20")).toBe(1);
    expect(calc("1 + 1 != 2")).toBe(0);
  });
  it("shows nothing for division by zero (that output only)", () => {
    expect(calc("p / zero")).toBeNull();
    expect(calc("pct(1, zero)")).toBeNull();
  });
});

describe("helpers", () => {
  it("min, max, round, abs, pct", () => {
    expect(calc("min(3, 1, 2)")).toBe(1);
    expect(calc("max(r, 10)")).toBe(10);
    expect(calc("round(2.345, 2)")).toBe(2.35);
    expect(calc("round(1234.5)")).toBe(1235);
    expect(calc("round(1234, -2)")).toBe(1200);
    expect(calc("abs(-7)")).toBe(7);
    expect(calc("pct(25, 200)")).toBe(12.5);
  });
  it("if() picks a branch and works out only that one", () => {
    expect(calc("if(r > 8, 1, 2)")).toBe(1);
    expect(calc("if(zero == 0, 0, p / zero)")).toBe(0);
  });
  it("emi: ₹40 lakh at 8.5% for 20 years is about ₹34,713 a month (the standard reducing-balance formula)", () => {
    const r = 8.5 / 12 / 100;
    const n = 240;
    const standard = (4000000 * r * (1 + r) ** n) / ((1 + r) ** n - 1);
    expect(emi(4000000, 8.5, 20)).toBeCloseTo(standard, 6);
    expect(Math.round(calc("emi(p, r, n)")!)).toBe(34713);
    expect(emi(120000, 0, 1)).toBe(10000);  // no interest: just split
    expect(calc("emi(p, r, 0)")).toBeNull();
  });
  it("sip: payments at the start of each month (₹10,000 a month at 12% for 10 years ≈ ₹23.23 lakh)", () => {
    expect(Math.round(sip(10000, 12, 10))).toBe(2323391);
    expect(sip(5000, 0, 2)).toBe(120000);
    expect(sip(1000, 12, 1 / 12)).toBeCloseTo(1010, 6);  // one payment, made at the start: it earns that month's 1%
  });
});

describe("only arithmetic", () => {
  it.each([
    "constructor", "this", "__proto__", "p.constructor", "a.b", "toString()", "constructor(1)",
    "'abc'", '"abc"', "`x`", "p = 5", "x => x", "function() {}", "alert(1)", "Math.max(1, 2)", "p[0]", "p; 1",
    "1 +", "(1", "1)", "min()", "round(1, 2, 3)", "unknown + 1", "", "4,000",
  ])("refuses %s", (f) => {
    expect(calc(f)).toBeNull();
  });
  it("says why it can't read one", () => {
    expect(() => parseFormula("a.b")).toThrow(/can't read/);
    expect(() => parseFormula("alert(1)")).toThrow(/unknown helper/);
    expect(() => parseFormula("round(1, 2, 3)")).toThrow(/takes 1-2 values/);
  });
  it("refuses a formula too long or nested too deep", () => {
    expect(calc("1+".repeat(200) + "1")).toBeNull();
    expect(calc("(".repeat(40) + "1" + ")".repeat(40))).toBeNull();
  });
  it("lists the names a formula uses", () => {
    expect(namesIn(parseFormula("emi(p, r, n) * n * 12 - p"))).toEqual(["p", "r", "n"]);
  });
});

/** A month-by-month simulation written out plainly, to check prepay() against: what's owed grows by the month's
 *  interest and shrinks by each payment; every 12th month the extra is paid too. Interest = everything paid − principal. */
function simulate(principal: number, ratePct: number, years: number, extra: number) {
  const payment = emi(principal, ratePct, years);
  const r = ratePct / 12 / 100;
  let owed = principal;
  let paid = 0;
  let month = 0;
  while (owed > 0.005) {
    month += 1;
    owed = owed * (1 + r);
    const thisPayment = Math.min(payment, owed);
    owed -= thisPayment;
    paid += thisPayment;
    if (month % 12 === 0) {
      const lump = Math.min(extra, owed);
      owed -= lump;
      paid += lump;
    }
  }
  return { months: month, interest: paid - principal };
}

describe("prepaying once a year (prepay_years, prepay_interest)", () => {
  it("with no extra it is the plain loan: 20 years, and the interest emi() gives", () => {
    expect(calc("prepay_years(p, r, n, 0)")).toBe(20);
    expect(calc("prepay_interest(p, r, n, 0)")).toBeCloseTo(calc("emi(p, r, n) * n * 12 - p")!, 2);
  });
  it("₹2 lakh a year on ₹40 lakh at 8.5% over 20 years: cleared in 10 years, ₹19.5 lakh interest instead of ₹43.3 lakh", () => {
    expect(calc("prepay_years(p, r, n, 200000)")).toBe(10);
    expect(Math.round(calc("prepay_interest(p, r, n, 200000)")!)).toBe(1949956);
  });
  it("matches a month-by-month simulation across loans and lump sums", () => {
    for (const [p, rate, years, extra] of [[4000000, 8.5, 20, 200000], [4000000, 8.5, 20, 50000], [2500000, 9.25, 15, 100000],
      [800000, 11, 5, 75000], [5000000, 7.1, 30, 333333], [1000000, 0, 10, 100000]]) {
      const want = simulate(p, rate, years, extra);
      const got = prepay(p, rate, years, extra);
      expect(got.months, `${p} ${rate} ${years} ${extra}`).toBe(want.months);
      expect(got.interest, `${p} ${rate} ${years} ${extra}`).toBeCloseTo(want.interest, 2);
    }
  });
  it("a lump sum bigger than the loan clears it at the first year end", () => {
    expect(prepay(1000000, 9, 20, 5000000).months).toBe(12);
  });
  it("shows nothing for a negative extra or a missing term", () => {
    expect(calc("prepay_years(p, r, n, -1)")).toBeNull();
    expect(calc("prepay_interest(p, r, 0, 100000)")).toBeNull();
    expect(() => parseFormula("prepay_years(p, r, n)")).toThrow("prepay_years() takes 4 values");
  });
});

describe("loan and SIP schedules over time", () => {
  const P = 4000000;
  const at = (f: string, y: number) => evaluate(f, new Map([["p", P], ["r", 8.5], ["n", 20], ["y", y]]));
  it("balance starts at the principal and is 0 at or past the term", () => {
    expect(balance(P, 8.5, 20, 0)).toBe(P);
    expect(balance(P, 8.5, 20, 20)).toBe(0);
    expect(balance(P, 8.5, 20, 25)).toBe(0);
    expect(balance(P, 8.5, 20, -1)).toBe(P);
    expect(balance(P, 8.5, 20, 10)).toBeCloseTo(2799753, -1);
    expect(balance(1200, 0, 1, 0.5)).toBeCloseTo(600, 6);   // no interest: half the term, half the loan
  });
  it("interest paid over the whole term is every EMI less the principal", () => {
    expect(Math.abs(interestPaid(P, 8.5, 20, 20) - (emi(P, 8.5, 20) * 240 - P))).toBeLessThan(1);
    expect(interestPaid(P, 8.5, 20, 0)).toBe(0);
    expect(interestPaid(P, 8.5, 20, 10)).toBeCloseTo(2965304, -1);
  });
  it("principal paid and the balance add up to the principal at any year", () => {
    for (let y = 0; y <= 22; y += 0.5) {
      expect(principalPaid(P, 8.5, 20, y) + balance(P, 8.5, 20, y)).toBeCloseTo(P, 4);
    }
  });
  it("sip_value is sip by its explicit name", () => {
    expect(at("sip_value(10000, 12, y)", 10)).toBe(sip(10000, 12, 10));
    expect(at("sip_value(10000, 12, y)", 0)).toBe(0);
  });
  it("can be used in formulas", () => {
    expect(at("balance(p, r, n, y)", 0)).toBe(P);
    expect(at("principal_paid(p, r, n, y)", 20)).toBeCloseTo(P, 4);
    expect(at("interest_paid(p, r, n, y)", 20)).toBeCloseTo(4331103, -1);
    expect(at("balance(p, r, 0, y)", 1)).toBeNull();   // no term: can't be worked out
  });
});

describe("loan helpers refuse terms over 100 years (their month-by-month work stays small)", () => {
  it.each([
    "emi(100000, 8, 101)", "balance(100000, 8, 101, 1)", "principal_paid(100000, 8, 101, 1)", "interest_paid(100000, 8, 101, 1)",
    "prepay_years(100000, 8, 101, 0)", "prepay_interest(100000, 8, 101, 0)", "prepay_years(100000, 8, 1e9, 0)",
  ])("%s → null (a gap)", (f) => {
    expect(evaluate(f, new Map())).toBeNull();
  });
});

describe("an evaluation budget", () => {
  it("stops a formula once its operations run out, giving null", () => {
    expect(evaluate("prepay_years(100000, 8, 50, 0)", new Map(), newBudget(500))).toBeNull();  // 600 months
    expect(evaluate("prepay_years(100000, 8, 50, 0) + prepay_years(100000, 8, 50, 0)", new Map(), newBudget(1000))).toBeNull();
    expect(evaluate("prepay_years(100000, 8, 50, 0)", new Map(), newBudget(1000))).toBe(50);
    expect(evaluate("emi(100000, 8, 100)", new Map())).not.toBeNull();  // a 100-year term still works out
    expect(evaluate("prepay_years(100000, 8, 100, 0)", new Map())).toBe(100);
  });
});
