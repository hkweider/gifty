import { TODAY } from '../data/sample';

/**
 * Currency rule (open question in the handoff): line items show "CA$ 89.00";
 * the Home total card and budget summaries show plain "$224.98" / "$430".
 * Every price goes through these helpers so the rule can change in one place.
 */
const SYMBOL: Record<string, string> = { CAD: 'CA$', USD: 'US$', EUR: '€', GBP: '£', AUD: 'A$' };

export function money(n: number, opts: { cents?: boolean; currency?: string } = {}): string {
  const cents = opts.cents ?? true;
  const v = cents ? Math.abs(n).toFixed(2) : Math.round(Math.abs(n)).toString();
  const code = opts.currency ?? 'CAD';
  return `${n < 0 ? '−' : ''}${SYMBOL[code] ?? code} ${v}`;
}

/** Price of a product in its own currency. */
export const priceOf = (p: { price: number; currency?: string }, n = p.price) => money(n, { currency: p.currency });

/** Plain "$" amount used on Home totals and budget summaries. */
export function plain(n: number, opts: { cents?: boolean } = {}): string {
  const cents = opts.cents ?? false;
  return `$${cents ? n.toFixed(2) : Math.round(n)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function daysUntil(iso: string): number {
  const d = new Date(iso + 'T00:00:00');
  const t = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function greeting(d = TODAY): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function plural(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`;
}
