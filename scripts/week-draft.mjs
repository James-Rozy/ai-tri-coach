#!/usr/bin/env node
// Drafts the data half of a weekly training post from Intervals.icu.
//
//   INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=... node scripts/week-draft.mjs 2026-11-16
//
// Prints YAML frontmatter for src/content/weeks/<monday>.md: `plan` (that week's planned
// sessions) and `review` (the week before: each planned session marked done, missed or
// swapped, plus unplanned extras). Read-only GETs only. The prose (title, summary, the
// "why" and the honest review) is written by the weekly coaching session, not by this script.
//
// Activities synced from Strava come through Intervals with no details (Strava's API rules),
// so they're listed as "logged on Strava" for the writer to fill in (polo usually lands here).

const [weekArg] = process.argv.slice(2);
const key = process.env.INTERVALS_API_KEY;
const athlete = process.env.INTERVALS_ATHLETE_ID;
if (!weekArg || !/^\d{4}-\d{2}-\d{2}$/.test(weekArg)) {
  console.error('Usage: node scripts/week-draft.mjs YYYY-MM-DD (the Monday of the week to plan)');
  process.exit(1);
}
if (!key || !athlete) {
  console.error('Set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID.');
  process.exit(1);
}

const day = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const monday = weekArg;
if (new Date(`${monday}T00:00:00Z`).getUTCDay() !== 1) {
  console.error(`${monday} is not a Monday.`);
  process.exit(1);
}
const prevMonday = day(monday, -7);

const auth = 'Basic ' + Buffer.from(`API_KEY:${key}`).toString('base64');
async function get(path, params) {
  const url = new URL(`https://intervals.icu/api/v1/athlete/${athlete}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const sportOf = (type, name = '') => {
  if (/^(Ride|VirtualRide|GravelRide|MountainBikeRide)$/.test(type ?? '')) return 'Bike';
  if (/^(Run|VirtualRun|TrailRun)$/.test(type ?? '')) return 'Run';
  if (/Swim/.test(type ?? '')) return 'Swim';
  if (type === 'WeightTraining') return 'Strength';
  if (/polo/i.test(name)) return 'Polo';
  if (/rest/i.test(name)) return 'Rest';
  if (/travel|flight/i.test(name)) return 'Travel';
  return 'Other';
};
const weekday = (iso) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
const mins = (s) => (s ? Math.round(s / 60) : undefined);
const q = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`;

const [nextEvents, prevEvents, prevActs] = await Promise.all([
  get('events', { oldest: monday, newest: day(monday, 6) }),
  get('events', { oldest: prevMonday, newest: day(prevMonday, 6) }),
  get('activities', { oldest: prevMonday, newest: day(prevMonday, 6) }),
]);

const byDate = (a, b) => a.start_date_local.localeCompare(b.start_date_local);

const out = [];
out.push(`week: ${monday}`);
out.push('plan:');
for (const e of nextEvents.sort(byDate)) {
  const sport = e.category === 'NOTE' ? sportOf(null, e.name) : sportOf(e.type, e.name);
  const m = mins(e.moving_time);
  out.push(`  - { day: ${weekday(e.start_date_local)}, date: ${e.start_date_local.slice(0, 10)}, sport: ${sport}, session: ${q(e.name)}${m ? `, minutes: ${m}` : ''} }`);
}

out.push('review:');
out.push('  items:');
const used = new Set();
let plannedMin = 0;
let doneMin = 0;
for (const e of prevEvents.sort(byDate)) {
  if (e.category !== 'WORKOUT') {
    const sport = sportOf(null, e.name);
    out.push(`    - { day: ${weekday(e.start_date_local)}, sport: ${sport}, session: ${q(e.name)}, status: rest }`);
    continue;
  }
  plannedMin += mins(e.moving_time) ?? 0;
  const act = prevActs.find((a) => a.paired_event_id === e.id);
  if (act) {
    used.add(act.id);
    doneMin += mins(act.moving_time) ?? 0;
  }
  const status = act ? 'done' : 'missed';
  const actual = act?.moving_time ? `, actualMinutes: ${mins(act.moving_time)}` : '';
  out.push(`    - { day: ${weekday(e.start_date_local)}, sport: ${sportOf(e.type, e.name)}, session: ${q(e.name)}, minutes: ${mins(e.moving_time) ?? 0}${actual}, status: ${status} }`);
}
for (const a of prevActs.sort(byDate)) {
  if (used.has(a.id)) continue;
  if (a.source === 'STRAVA' && !a.type) {
    out.push(`    - { day: ${weekday(a.start_date_local)}, sport: Other, session: 'Logged on Strava (fill in)', status: extra }`);
    continue;
  }
  doneMin += mins(a.moving_time) ?? 0;
  out.push(`    - { day: ${weekday(a.start_date_local)}, sport: ${sportOf(a.type, a.name)}, session: ${q(a.name)}, actualMinutes: ${mins(a.moving_time) ?? 0}, status: extra }`);
}
out.push(`  plannedMinutes: ${plannedMin}`);
out.push(`  doneMinutes: ${doneMin}  # excludes Strava-only entries; add polo minutes by hand`);

console.log(out.join('\n'));
