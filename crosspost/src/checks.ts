// The playbook's copy checks (a port of shorts/playbook/check_short.py), plus checks that only
// matter at posting time: the video file, its shape and length, and the publish time.

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { hashtagsFor, type Post } from "./post-file.ts";

const FEED_CHARS = 125;
const TITLE_MAX = 100;
const HASHTAG_MAX = 5;
const LEN_MIN = 15;
const LEN_MAX = 45;
const SHORTS_MAX = 180; // YouTube treats vertical videos up to 3 min as Shorts
const GREETINGS = /^\s*(yo|hey|hi|hello|what'?s up|sup|welcome|in today'?s video|so,? today)\b/i;
const STOCK = [
  "stop scrolling", "you won't believe", "game changer", "game-changer", "unlock", "supercharge",
  "smash that like", "tag someone", "in today's video", "crushing it", "beast mode", "no excuses",
  "harness the power", "revolutionary",
];

export interface Check {
  ok: boolean;
  /** A failed blocking check stops the post; a failed warning is printed and posting goes ahead. */
  blocking: boolean;
  message: string;
}

const pass = (blocking: boolean, ok: boolean, message: string): Check => ({ ok, blocking, message });

export function feedPreview(post: Post): string {
  return post.caption.replace(/\n/g, " ").slice(0, FEED_CHARS);
}

export function checkCopy(post: Post): Check[] {
  const { title, caption } = post;
  const tags = [...new Set([...post.hashtags, ...(caption.match(/#\w+/g) ?? [])].map((t) => t.toLowerCase()))];
  const all = `${title} ${caption}`.toLowerCase();
  const stock = STOCK.filter((s) => all.includes(s));
  const unfilled = `${title}${caption}`.match(/\{\{[^}]*\}\}/g) ?? [];
  return [
    pass(true, title.length > 0 && title.length <= TITLE_MAX, `Title ${title.length}/${TITLE_MAX} chars`),
    pass(true, caption.length > 0, "Caption is filled in"),
    pass(false, !/^[#@]/.test(caption.trimStart()), "Caption doesn't open with a hashtag or handle"),
    pass(false, !GREETINGS.test(caption), "Caption doesn't open with a greeting"),
    pass(true, tags.length >= 1 && tags.length <= HASHTAG_MAX, `${tags.length} hashtags (max ${HASHTAG_MAX}, Instagram cap): ${tags.join(" ")}`),
    pass(false, caption.toLowerCase().includes("splitdecisionscoach.com"), "Site named in caption"),
    pass(false, stock.length === 0, "No stock phrases" + (stock.length ? ` (found: ${stock.join(", ")})` : "")),
    pass(true, unfilled.length === 0, "No unfilled {{placeholders}}" + (unfilled.length ? ` (${unfilled.join(", ")})` : "")),
  ];
}

export function checkPosting(post: Post, now = new Date()): Check[] {
  const checks: Check[] = [];
  checks.push(pass(true, post.platforms.length > 0, `Platforms: ${post.platforms.join(", ") || "none"}`));
  if (post.platforms.some((p) => p !== "youtube")) {
    for (const p of post.platforms.filter((p) => p !== "youtube")) {
      checks.push(pass(false, true, `${p} hashtags: ${hashtagsFor(post, p).join(" ")}`));
    }
  }
  if (post.publishAt) {
    const minutes = (post.publishAt.getTime() - now.getTime()) / 60000;
    checks.push(pass(true, minutes >= 15, `Publish time ${post.publishAt.toISOString()} is at least 15 min away`));
  }

  if (!post.video) return [...checks, pass(true, false, "VIDEO is set")];
  if (!existsSync(post.video)) return [...checks, pass(true, false, `Video file exists (${post.video})`)];
  const mb = statSync(post.video).size / 1e6;
  checks.push(pass(true, true, `Video file ${mb.toFixed(1)} MB`));

  const probe = probeVideo(post.video);
  if (!probe) {
    checks.push(pass(false, false, "ffprobe not found, so shape and length weren't checked (brew install ffmpeg)"));
    return checks;
  }
  checks.push(pass(true, probe.height > probe.width, `Vertical: ${probe.width}x${probe.height}`));
  checks.push(pass(true, probe.seconds <= SHORTS_MAX, `Length ${probe.seconds.toFixed(1)}s is under YouTube's 3-min Shorts limit`));
  checks.push(pass(false, probe.seconds >= LEN_MIN && probe.seconds <= LEN_MAX, `Length ${probe.seconds.toFixed(1)}s (playbook target ${LEN_MIN}-${LEN_MAX}s)`));
  return checks;
}

export function probeVideo(file: string): { width: number; height: number; seconds: number } | null {
  try {
    const out = execFileSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", file,
    ], { encoding: "utf8" });
    const j = JSON.parse(out);
    const s = j.streams?.[0] ?? {};
    const rotated = Math.abs(Number(s.side_data_list?.[0]?.rotation ?? 0)) % 180 === 90;
    const [width, height] = rotated ? [s.height, s.width] : [s.width, s.height];
    return { width: Number(width), height: Number(height), seconds: Number(j.format?.duration ?? 0) };
  } catch {
    return null;
  }
}

export function printChecks(title: string, checks: Check[]): void {
  console.log(`\n${title}`);
  for (const c of checks) console.log(`  ${c.ok ? "OK  " : c.blocking ? "STOP" : "FIX "}  ${c.message}`);
}
