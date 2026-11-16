// Shared helpers for a weekly training post: the /training/ pages and the newsletter email both use them.
import type { CollectionEntry } from 'astro:content';

type Week = CollectionEntry<'weeks'>['data'];
type ReviewItem = NonNullable<Week['review']>['items'][number];

export const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

export function weekRange(start: Date) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const f = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${f(start)} – ${f(end)}`;
}

export const plannedMinutes = (w: Week) => w.plan.reduce((s, p) => s + (p.minutes ?? 0), 0);
export const sessionCount = (w: Week) => w.plan.filter((p) => !['Rest', 'Travel'].includes(p.sport)).length;
export const missedCount = (w: Week) => w.review?.items.filter((i) => i.status === 'missed').length ?? 0;

export const statusLabel: Record<ReviewItem['status'], string> = {
  done: 'Done', missed: 'Missed', swapped: 'Swapped', extra: 'Extra', rest: 'Rest',
};

// "70′/70′" when a planned session happened, otherwise whichever number exists.
export function reviewMins(i: ReviewItem) {
  if (i.status !== 'extra' && i.minutes != null && i.actualMinutes != null) return `${i.actualMinutes}′/${i.minutes}′`;
  const m = i.actualMinutes ?? i.minutes;
  return m != null ? `${m}′` : '';
}

// Sport colors: CSS tokens on the site, plain hex in email (clients don't support custom properties).
export const sportVar: Record<string, string> = {
  Swim: 'var(--swim)', Polo: 'var(--swim)', Bike: 'var(--bike)', Run: 'var(--run)',
  Strength: 'var(--accent)', Rest: 'var(--trans)', Travel: 'var(--trans)', Other: 'var(--trans)',
};
export const sportHex: Record<string, string> = {
  Swim: '#4FA8E0', Polo: '#4FA8E0', Bike: '#F0913A', Run: '#3FC28A',
  Strength: '#FFB020', Rest: '#8B93A1', Travel: '#8B93A1', Other: '#8B93A1',
};
