// Reads a post.md: the playbook's copy.md blocks (TITLE, CAPTION, HASHTAGS) plus a few
// posting fields. Because the copy blocks are the same, check_short.py still reads the file.
//
//   VIDEO: final.mp4                      (relative to the post file)
//   PUBLISH_AT: 2026-11-22 09:00          (local time in CROSSPOST_TZ, or ISO with offset; omit to post now)
//   PLATFORMS: youtube, instagram, tiktok
//   TOPIC_TAG: #running                   (replaces #shorts on Instagram and TikTok)
//   TITLE: ...
//   CAPTION:
//   ...
//   HASHTAGS: #triathlon #ironman ...

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const PLATFORMS = ["youtube", "instagram", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];

const FIELDS = ["VIDEO", "PUBLISH_AT", "PLATFORMS", "TOPIC_TAG", "TITLE", "CAPTION", "HASHTAGS"] as const;
type Field = (typeof FIELDS)[number];
const FIELD_RE = new RegExp(`^(${FIELDS.join("|")}):\\s*(.*)$`);

export interface Post {
  file: string;
  video: string;
  publishAt: Date | null;
  platforms: Platform[];
  topicTag: string;
  title: string;
  caption: string;
  hashtags: string[];
}

export function parseFields(text: string): Record<Field, string> {
  const fields = Object.fromEntries(FIELDS.map((f) => [f, ""])) as Record<Field, string>;
  let current: Field | null = null;
  for (const line of text.split(/\r?\n/)) {
    const m = FIELD_RE.exec(line);
    if (m) {
      current = m[1] as Field;
      fields[current] = m[2];
    } else if (current) {
      fields[current] += (fields[current] ? "\n" : "") + line;
    }
  }
  for (const f of FIELDS) fields[f] = fields[f].trim();
  return fields;
}

export function readPost(file: string, tz: string): Post {
  const abs = resolve(file);
  const f = parseFields(readFileSync(abs, "utf8"));
  const platforms = (f.PLATFORMS || "youtube")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((p) => p.toLowerCase());
  for (const p of platforms) {
    if (!(PLATFORMS as readonly string[]).includes(p)) throw new Error(`Unknown platform "${p}" in PLATFORMS`);
  }
  return {
    file: abs,
    video: f.VIDEO ? resolve(dirname(abs), f.VIDEO) : "",
    publishAt: f.PUBLISH_AT ? parseWhen(f.PUBLISH_AT, tz) : null,
    platforms: platforms as Platform[],
    topicTag: f.TOPIC_TAG,
    title: f.TITLE,
    caption: f.CAPTION,
    hashtags: f.HASHTAGS.match(/#\w+/g) ?? [],
  };
}

/** "2026-11-22 09:00" is read as wall-clock time in `tz`; anything with Z or an offset is taken as is. */
export function parseWhen(value: string, tz: string): Date {
  const v = value.trim();
  if (/(Z|[+-]\d\d:?\d\d)$/i.test(v)) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error(`Can't read PUBLISH_AT "${value}"`);
    return d;
  }
  const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d?):(\d\d)$/.exec(v);
  if (!m) throw new Error(`PUBLISH_AT "${value}" should look like 2026-11-22 09:00`);
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Find the zone's offset at that moment; run twice so DST edges settle.
  let guess = asUtc;
  for (let i = 0; i < 2; i++) guess = asUtc - offsetMs(guess, tz);
  return new Date(guess);
}

function offsetMs(at: number, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(at)).map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return wall - Math.floor(at / 1000) * 1000;
}

/** Hashtags for a platform: #shorts only makes sense on YouTube; elsewhere swap in the topic tag. */
export function hashtagsFor(post: Post, platform: Platform): string[] {
  let tags = post.hashtags;
  if (platform !== "youtube") {
    tags = tags.filter((t) => t.toLowerCase() !== "#shorts");
    if (post.topicTag && !tags.some((t) => t.toLowerCase() === post.topicTag.toLowerCase())) tags = [...tags, post.topicTag];
  }
  return tags.slice(0, 5);
}

/** Caption plus hashtags on the last line, which is what goes in the description/caption field. */
export function captionFor(post: Post, platform: Platform): string {
  const tags = hashtagsFor(post, platform);
  return tags.length ? `${post.caption}\n\n${tags.join(" ")}` : post.caption;
}
