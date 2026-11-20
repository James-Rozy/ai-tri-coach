import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captionFor, hashtagsFor, parseWhen, readPost } from "../src/post-file.ts";
import { checkCopy, checkPosting } from "../src/checks.ts";
import { metadata } from "../src/platforms/youtube.ts";

const dir = mkdtempSync(join(tmpdir(), "crosspost-"));
const file = join(dir, "post.md");
writeFileSync(file, `VIDEO: missing.mp4
PUBLISH_AT: 2026-11-22 09:00
PLATFORMS: youtube, tiktok
TOPIC_TAG: #running
TITLE: Day 1: My First Workout Coached by AI
CAPTION:
I missed sub-5 at 70.3 Michigan.
Follow along. splitdecisionscoach.com
HASHTAGS: #triathlon #ironman #shorts
`);

test("wall-clock PUBLISH_AT is read in the given zone, across DST", () => {
  assert.equal(parseWhen("2026-11-22 09:00", "America/Chicago").toISOString(), "2026-11-22T15:00:00.000Z");
  assert.equal(parseWhen("2026-07-05 09:00", "America/Chicago").toISOString(), "2026-07-05T14:00:00.000Z");
  assert.equal(parseWhen("2026-11-22T09:00:00-05:00", "America/Chicago").toISOString(), "2026-11-22T14:00:00.000Z");
  assert.throws(() => parseWhen("Sunday 9am", "America/Chicago"));
});

test("post file reads like check_short.py's copy.md, plus posting fields", () => {
  const post = readPost(file, "America/Chicago");
  assert.deepEqual(post.platforms, ["youtube", "tiktok"]);
  assert.equal(post.caption.split("\n").length, 2);
  assert.deepEqual(post.hashtags, ["#triathlon", "#ironman", "#shorts"]);
});

test("#shorts stays on YouTube and becomes the topic tag elsewhere", () => {
  const post = readPost(file, "America/Chicago");
  assert.deepEqual(hashtagsFor(post, "youtube"), ["#triathlon", "#ironman", "#shorts"]);
  assert.deepEqual(hashtagsFor(post, "tiktok"), ["#triathlon", "#ironman", "#running"]);
  assert.ok(captionFor(post, "youtube").endsWith("\n\n#triathlon #ironman #shorts"));
});

test("YouTube schedules by uploading private with publishAt", () => {
  const post = readPost(file, "America/Chicago");
  const m = metadata(post);
  assert.equal(m.status.privacyStatus, "private");
  assert.equal(m.status.publishAt, "2026-11-22T15:00:00.000Z");
  assert.deepEqual(m.snippet.tags, ["triathlon", "ironman", "shorts"]);
  assert.equal(metadata({ ...post, publishAt: null }).status.privacyStatus, "public");
});

test("copy checks match the playbook; a missing video or past time stops the post", () => {
  const post = readPost(file, "America/Chicago");
  assert.ok(checkCopy(post).every((c) => c.ok));
  assert.ok(checkCopy({ ...post, hashtags: ["#a", "#b", "#c", "#d", "#e", "#f"] }).some((c) => !c.ok && c.blocking));
  assert.ok(checkCopy({ ...post, caption: "{{number}} min easy" }).some((c) => !c.ok && c.blocking));
  const stops = checkPosting(post, new Date("2026-11-22T15:00:00Z")).filter((c) => !c.ok && c.blocking);
  assert.equal(stops.length, 2); // too soon + no file
});
