// Best-effort parse of free-text government-notice dates like
// "15 August 2026" or "15/08/2026". Returns null on anything ambiguous —
// a wrong "days left" or wrong open/closed status is worse than showing
// no date at all for something deadline-critical.
export function tryParseDate(text: string): Date | null {
  if (!text) return null;
  const direct = new Date(text);
  if (!isNaN(direct.getTime())) return direct;

  const dmy = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    const parsed = new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function daysLeft(dateText: string): number | null {
  const date = tryParseDate(dateText);
  if (!date) return null;
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Treats an unparseable/missing end date as "open" (benefit of the doubt —
// we don't want to hide a real listing just because the LLM left the date
// field blank), and only marks something Closed when we can confidently
// parse a deadline that has already passed.
export function isLikelyClosed(applicationEndDate: string): boolean {
  const remaining = daysLeft(applicationEndDate);
  return remaining !== null && remaining < 0;
}
