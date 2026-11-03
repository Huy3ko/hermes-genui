// Formulas in a calculator block, read by hand (no library, no eval): numbers, input ids, + - * / ^, parentheses,
// comparisons (< <= > >= == !=, giving 1 or 0) and a fixed list of helpers. Nothing else: no property access (a.b),
// no strings, no assignment, no function definitions. A name is looked up only among the calculator's input values
// (a Map), so "constructor", "this" or "__proto__" are just unknown names.
//   "emi(p, r, n) * n * 12 - p" with p = 4000000, r = 8.5, n = 20 → 4331103 (the total interest)

export type Node =
  | { kind: "number"; value: number }
  | { kind: "name"; name: string }
  | { kind: "negate"; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; fn: string; args: Node[] };

const MAX_LENGTH = 300;
const MAX_DEPTH = 30;

/** How many arguments each helper takes: [fewest, most]. */
const HELPERS: Record<string, [number, number]> = {
  min: [1, 10], max: [1, 10], round: [1, 2], abs: [1, 1], if: [3, 3], emi: [3, 3], sip: [3, 3], pct: [2, 2],
  prepay_years: [4, 4], prepay_interest: [4, 4],
  balance: [4, 4], principal_paid: [4, 4], interest_paid: [4, 4], sip_value: [3, 3],
};

/** Whether a name is one of the helpers (so it can't be an input's id): "emi" → true; "p" → false; "constructor" → false */
export function isHelper(name: string): boolean {
  return Object.hasOwn(HELPERS, name);
}

// One token: a number (1, 8.5, .5, 1e6), a name, or an operator. Anything else (a quote, a dot after a name, ;) stops.
const TOKEN = /\s*(?:((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|==|!=|[-+*/^(),<>]))/iy;

/** The formula's tokens: "emi(p, 8.5)" → ["emi", "(", "p", ",", "8.5", ")"]; "a.b" → throws (can't read ".b") */
function tokenize(text: string): string[] {
  if (text.length > MAX_LENGTH) throw new Error("formula too long");
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const from = TOKEN.lastIndex;
    if (/^\s*$/.test(text.slice(from))) break;
    const m = TOKEN.exec(text);
    if (!m) throw new Error(`can't read "${text.slice(from).trim().slice(0, 12)}"`);
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

/** A formula's text → its tree; throws with a reason when it isn't one. "2 + p * 3" → (2 + (p * 3)) */
export function parseFormula(text: string): Node {
  const tokens = tokenize(text);
  let at = 0;
  let depth = 0;
  const peek = () => tokens[at];
  const take = (want?: string) => {
    const t = tokens[at];
    if (want !== undefined && t !== want) throw new Error(`expected ${want}`);
    at += 1;
    return t;
  };
  const deeper = () => {
    depth += 1;
    if (depth > MAX_DEPTH) throw new Error("formula nests too deep");
  };

  // Lowest binding first: a comparison of sums, a sum of products, a product of powers.
  function comparison(): Node {
    const left = sum();
    if (["<", "<=", ">", ">=", "==", "!="].includes(peek())) return { kind: "binary", op: take(), left, right: sum() };
    return left;
  }
  function sum(): Node {
    let left = product();
    while (peek() === "+" || peek() === "-") left = { kind: "binary", op: take(), left, right: product() };
    return left;
  }
  function product(): Node {
    let left = unary();
    while (peek() === "*" || peek() === "/") left = { kind: "binary", op: take(), left, right: unary() };
    return left;
  }
  // -2^2 is -(2^2) = -4, as in maths; 2^-1 works too.
  function unary(): Node {
    deeper();
    let node: Node;
    if (peek() === "-") { take(); node = { kind: "negate", arg: unary() }; }
    else if (peek() === "+") { take(); node = unary(); }
    else node = power();
    depth -= 1;
    return node;
  }
  function power(): Node {
    const base = primary();
    if (peek() === "^") { take(); return { kind: "binary", op: "^", left: base, right: unary() }; }
    return base;
  }
  function primary(): Node {
    const t = take();
    if (t === undefined) throw new Error("formula ends too soon");
    if (/^[\d.]/.test(t)) return { kind: "number", value: Number(t) };
    if (t === "(") { const inside = comparison(); take(")"); return inside; }
    if (!/^[A-Za-z_]/.test(t)) throw new Error(`unexpected "${t}"`);
    if (peek() !== "(") return { kind: "name", name: t };
    if (!isHelper(t)) throw new Error(`unknown helper ${t}()`);
    take("(");
    const args = [comparison()];
    while (peek() === ",") { take(); args.push(comparison()); }
    take(")");
    const [fewest, most] = HELPERS[t];
    if (args.length < fewest || args.length > most) throw new Error(`${t}() takes ${fewest === most ? fewest : `${fewest}-${most}`} values`);
    return { kind: "call", fn: t, args };
  }

  const tree = comparison();
  if (at < tokens.length) throw new Error(`unexpected "${tokens[at]}"`);
  return tree;
}

/** The input names a formula uses: "emi(p, r, n) - p" → ["p", "r", "n"] */
export function namesIn(node: Node, found: Set<string> = new Set()): string[] {
  if (node.kind === "name") found.add(node.name);
  if (node.kind === "negate") namesIn(node.arg, found);
  if (node.kind === "binary") { namesIn(node.left, found); namesIn(node.right, found); }
  if (node.kind === "call") node.args.forEach((a) => namesIn(a, found));
  return [...found];
}

/** How much work evaluations may still do: each step of a formula and each month a loan helper works through spends
 *  one. A chart shares one budget across all its points (calcChartSpec), so a formula built to be slow gives gaps,
 *  not a stuck page. */
export type Budget = { left: number };

/** A fresh budget: newBudget(1000) → {left: 1000}. With none given, evaluate's helpers are bounded only by their own
 *  limits (100-year terms). */
export function newBudget(operations: number): Budget {
  return { left: operations };
}

/** Spends `n` of the budget; throws (so the value is null) once it is used up. No budget → nothing to spend. */
function spend(budget: Budget | undefined, n = 1): void {
  if (!budget) return;
  budget.left -= n;
  if (budget.left < 0) throw new Error("too much work");
}

/** A formula's value with these inputs, or null when it can't be worked out (it doesn't parse, uses an unknown name,
 *  divides by zero, the answer isn't a finite number, or the budget runs out). "p / n" with n = 0 → null; "1 +" → null
 *  evaluate("prepay_years(100000, 8, 50, 0)", values, newBudget(1000)) → 50 (600 months and a few steps);
 *  the same with newBudget(500) → null */
export function evaluate(formula: string | Node, values: ReadonlyMap<string, number>, budget?: Budget): number | null {
  try {
    const tree = typeof formula === "string" ? parseFormula(formula) : formula;
    const result = valueOf(tree, values, budget);
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

function valueOf(node: Node, values: ReadonlyMap<string, number>, budget?: Budget): number {
  spend(budget);
  const of = (n: Node) => valueOf(n, values, budget);
  switch (node.kind) {
    case "number": return node.value;
    case "name": {
      const v = values.get(node.name);
      if (v === undefined) throw new Error(`unknown name ${node.name}`);
      return v;
    }
    case "negate": return -of(node.arg);
    case "binary": return binary(node.op, of(node.left), of(node.right));
    case "call": {
      // if() works out only the branch it picks, so if(n == 0, 0, p / n) is fine when n is 0.
      if (node.fn === "if") return of(node.args[0]) !== 0 ? of(node.args[1]) : of(node.args[2]);
      return helper(node.fn, node.args.map(of), budget);
    }
  }
}

/** One operator on two values: ("-", 5, 3) → 2; ("^", 2, 3) → 8; (">", 2, 3) → 0 (a comparison gives 1 or 0) */
function binary(op: string, a: number, b: number): number {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return divide(a, b);
  if (op === "^") return a ** b;
  const comparisons: Record<string, boolean> = { "<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b, "==": a === b, "!=": a !== b };
  return comparisons[op] ? 1 : 0;
}

/** a / b, refusing a zero divisor so that output shows "–": (6, 3) → 2; (6, 0) → throws */
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("division by zero");
  return a / b;
}

/** A helper on its worked-out arguments: ("min", [3, 1]) → 1; ("pct", [25, 200]) → 12.5 */
function helper(fn: string, args: number[], budget?: Budget): number {
  switch (fn) {
    case "min": return Math.min(...args);
    case "max": return Math.max(...args);
    case "abs": return Math.abs(args[0]);
    case "round": return roundTo(args[0], args[1] ?? 0);
    case "pct": return divide(args[0], args[1]) * 100;
    case "emi": return emi(args[0], args[1], args[2]);
    case "sip": return sip(args[0], args[1], args[2]);
    case "prepay_years": return prepay(args[0], args[1], args[2], args[3], budget).months / 12;
    case "prepay_interest": return prepay(args[0], args[1], args[2], args[3], budget).interest;
    case "balance": return balance(args[0], args[1], args[2], args[3]);
    case "principal_paid": return principalPaid(args[0], args[1], args[2], args[3]);
    case "interest_paid": return interestPaid(args[0], args[1], args[2], args[3]);
    case "sip_value": return sip(args[0], args[1], args[2]);
  }
  throw new Error(`unknown helper ${fn}()`);
}

/** round(2.345, 2) → 2.35; round(1234.5) → 1235; round(1234, -2) → 1200 */
function roundTo(x: number, digits: number): number {
  const scale = 10 ** Math.round(digits);
  return Math.round(x * scale) / scale;
}

// The longest loan term the helpers work out: 100 years (1200 months). A longer one is a gap, so a formula can't make
// prepay() walk through millions of months.
export const MAX_YEARS = 100;

/** The term in months, refusing one over MAX_YEARS: 20 → 240;  101 → throws;  1e9 → throws */
function termMonths(years: number): number {
  if (!(years <= MAX_YEARS)) throw new Error(`a loan term is at most ${MAX_YEARS} years`);
  return years * 12;
}

/**
 * The monthly payment on a loan repaid in equal instalments (reducing balance, the way Indian banks quote an EMI):
 * P · r · (1 + r)^n / ((1 + r)^n − 1), with r the monthly rate (rate_pct / 12 / 100) and n the months (years · 12).
 *   emi(4000000, 8.5, 20) → 34712.9, shown as ₹34,713 (₹40 lakh at 8.5% for 20 years);  at 0% it is simply P / n
 */
export function emi(principal: number, ratePct: number, years: number): number {
  const months = termMonths(years);
  if (months <= 0) throw new Error("emi needs a term");
  const r = ratePct / 12 / 100;
  if (r === 0) return principal / months;
  const growth = (1 + r) ** months;
  return (principal * r * growth) / (growth - 1);
}

/**
 * What a monthly SIP is worth at the end: each payment is made at the START of its month, so every payment earns
 * that month's return too (an annuity due): M · ((1 + i)^n − 1) / i · (1 + i), with i = rate_pct / 12 / 100, n = years · 12.
 * sip_value(monthly, rate%, after_years) in a formula is the same sum, named for a chart's "value after y years".
 *   sip(10000, 12, 10) → 2323391 (₹10,000 a month at 12% for 10 years);  at 0% it is M · n;  sip_value(10000, 12, 0) → 0
 */
export function sip(monthly: number, ratePct: number, years: number): number {
  const months = years * 12;
  const i = ratePct / 12 / 100;
  if (i === 0) return monthly * months;
  return (monthly * ((1 + i) ** months - 1) / i) * (1 + i);
}

/**
 * What is still owed on a loan (the outstanding principal) after `afterYears` of EMIs, monthly compounding like emi():
 * P · (1 + r)^k − EMI · ((1 + r)^k − 1) / r, with r the monthly rate and k = afterYears · 12 months paid. It is the
 * principal at 0 (or before) and 0 at or past the end of the term. In a formula: balance(p, rate%, years, after_years).
 *   balance(4000000, 8.5, 20, 0)  → 4000000
 *   balance(4000000, 8.5, 20, 10) → 2799753 (half the term gone, 70% still owed: early EMIs are mostly interest)
 *   balance(4000000, 8.5, 20, 20) → 0;  with no interest it falls in a straight line: balance(1200, 0, 1, 0.5) → 600
 */
export function balance(principal: number, ratePct: number, years: number, afterYears: number): number {
  const months = termMonths(years);
  if (months <= 0) throw new Error("balance needs a term");
  const paid = afterYears * 12;
  if (paid <= 0) return principal;
  if (paid >= months) return 0;
  const r = ratePct / 12 / 100;
  if (r === 0) return principal * (1 - paid / months);
  const growth = (1 + r) ** paid;
  return Math.max(0, principal * growth - (emi(principal, ratePct, years) * (growth - 1)) / r);
}

/**
 * How much of the principal the EMIs have paid off after `afterYears`: the principal less what's still owed.
 *   principal_paid(4000000, 8.5, 20, 10) → 1200247;  at 0 → 0;  at or past the term → 4000000
 */
export function principalPaid(principal: number, ratePct: number, years: number, afterYears: number): number {
  return principal - balance(principal, ratePct, years, afterYears);
}

/**
 * The interest paid so far after `afterYears`: every EMI paid (up to the end of the term) less the principal they
 * paid off. Over the whole term it is EMI · months − principal.
 *   interest_paid(4000000, 8.5, 20, 10) → 2965304;  interest_paid(4000000, 8.5, 20, 20) → 4331103 (34712.93 · 240 − 4000000)
 */
export function interestPaid(principal: number, ratePct: number, years: number, afterYears: number): number {
  const monthsPaid = Math.min(Math.max(afterYears * 12, 0), years * 12);
  return emi(principal, ratePct, years) * monthsPaid - principalPaid(principal, ratePct, years, afterYears);
}

/**
 * Paying a loan off early with a lump sum once a year: the EMI for the full term is paid every month, and at the end
 * of every 12th month `yearlyExtra` more goes straight off the principal. Worked month by month: the month's interest
 * is added to what's owed, then the EMI comes off (the last payment is only what's left). Gives the months it takes
 * and the total interest paid. In a formula: prepay_years(p, r, n, extra) is months / 12, prepay_interest(…) the interest.
 *   prepay(4000000, 8.5, 20, 0)      → {months: 240, interest: 4331103}  (no extra: the plain 20-year loan)
 *   prepay(4000000, 8.5, 20, 200000) → {months: 120, interest: 1949956}  (₹2 lakh a year: done in 10 years)
 *   prepay(1000, 8, 101, 0) → throws (over 100 years);  each month worked through spends one of the budget
 */
export function prepay(principal: number, ratePct: number, years: number, yearlyExtra: number, budget?: Budget): { months: number; interest: number } {
  if (yearlyExtra < 0) throw new Error("the yearly extra can't be negative");
  const monthly = emi(principal, ratePct, years);
  const r = ratePct / 12 / 100;
  const lastMonth = Math.ceil(termMonths(years));  // the EMI alone clears the loan by then
  let owed = principal;
  let interest = 0;
  let months = 0;
  while (owed > 0.005 && months < lastMonth) {
    spend(budget);
    months += 1;
    const thisMonth = owed * r;
    interest += thisMonth;
    owed = Math.max(0, owed + thisMonth - monthly);
    if (months % 12 === 0) owed = Math.max(0, owed - yearlyExtra);
  }
  return { months, interest };
}
