const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function clampBillingDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(28, Math.max(1, Math.round(day)));
}

export function cycleWindow(year: number, month: number, billingDay: number): {
  startDate: Date;
  endDate: Date;
  label: string;
} {
  const day = clampBillingDay(billingDay);
  if (month < 1 || month > 12) throw new Error("month must be 1–12.");
  const startDate = new Date(Date.UTC(year, month - 1, day));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextStart = new Date(Date.UTC(nextYear, nextMonth - 1, day));
  const endDate = new Date(nextStart);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  return {
    startDate,
    endDate,
    label: `${MONTH_LABELS[month - 1]} ${year}`,
  };
}

export function addMonths(year: number, month: number, count: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + count;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function currentBillingPeriod(
  now: Date,
  billingDay: number,
): { year: number; month: number } {
  const day = clampBillingDay(billingDay);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const date = now.getUTCDate();
  if (date >= day) return { year, month };
  return addMonths(year, month, -1);
}

export function workingPeriods(billingDay: number, now = new Date()): {
  current: { year: number; month: number };
  next: { year: number; month: number };
} {
  const current = currentBillingPeriod(now, billingDay);
  return { current, next: addMonths(current.year, current.month, 1) };
}

export function partitionCycles<T extends { id: string; year: number; month: number }>(
  cycles: T[],
  billingDay: number | null,
  now = new Date(),
): { thisMonth: T | null; nextMonth: T | null; history: T[] } {
  if (!billingDay) return { thisMonth: null, nextMonth: null, history: cycles };
  const { current, next } = workingPeriods(billingDay, now);
  const key = (year: number, month: number) => `${year}-${month}`;
  const thisMonth =
    cycles.find((c) => key(c.year, c.month) === key(current.year, current.month)) ?? null;
  const nextMonth =
    cycles.find((c) => key(c.year, c.month) === key(next.year, next.month)) ?? null;
  const history = cycles.filter((c) => c !== thisMonth && c !== nextMonth);
  return { thisMonth, nextMonth, history };
}

export function nextUnusedPeriods(
  existing: Array<{ year: number; month: number }>,
  billingDay: number,
  count: number,
  now = new Date(),
): Array<{ year: number; month: number }> {
  const used = new Set(existing.map((c) => `${c.year}-${c.month}`));
  let cursor = currentBillingPeriod(now, billingDay);
  const out: Array<{ year: number; month: number }> = [];
  let guard = 0;
  while (out.length < count && guard < 36) {
    const key = `${cursor.year}-${cursor.month}`;
    if (!used.has(key)) out.push(cursor);
    cursor = addMonths(cursor.year, cursor.month, 1);
    guard += 1;
  }
  return out;
}
