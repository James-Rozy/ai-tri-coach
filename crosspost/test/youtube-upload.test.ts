import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "crosspost-yt-"));
process.env.CROSSPOST_STORE = dir;
process.env.YOUTUBE_CLIENT_ID = "id";
process.env.YOUTUBE_CLIENT_SECRET = "secret";
writeFileSync(join(dir, "youtube.json"), JSON.stringify({ refresh_token: "r", channel: { id: "c", title: "Split Decisions", handle: "@splitdecisionscoach" } }));
const video = join(dir, "v.mp4");
writeFileSync(video, Buffer.alloc(1000, 1));

test("resumable upload resumes from YouTube's reported offset after a 503", async () => {
  const { upload } = await import("../src/platforms/youtube.ts");
  const calls: string[] = [];
  let puts = 0;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const h = new Headers(init?.headers);
    if (u.startsWith("https://oauth2.googleapis.com/token")) return Response.json({ access_token: "a" });
    if (u.includes("uploadType=resumable")) {
      calls.push(`init ${JSON.parse(String(init?.body)).status.privacyStatus}`);
      return new Response(null, { status: 200, headers: { location: "https://upload.example/session" } });
    }
    if (h.get("content-range")?.startsWith("bytes */")) { calls.push("query"); return new Response(null, { status: 308, headers: { range: "bytes=0-399" } }); }
    if (init?.body) {
      // drain the stream so the file handle closes
      for await (const _ of init.body as unknown as AsyncIterable<Uint8Array>) { /* read */ }
    }
    puts++;
    calls.push(`put ${h.get("content-range") ?? "full"} len=${h.get("content-length")}`);
    return puts === 1 ? new Response(null, { status: 503 }) : Response.json({ id: "abc123" });
  }) as typeof fetch;

  const post = { file: join(dir, "post.md"), video, publishAt: new Date("2026-11-22T15:00:00Z"), platforms: ["youtube" as const], topicTag: "", title: "t", caption: "c", hashtags: ["#shorts"] };
  const res = await upload(post, () => {});
  assert.equal(res.url, "https://youtube.com/shorts/abc123");
  assert.deepEqual(calls, ["init private", "put full len=1000", "query", "put bytes 400-999/1000 len=600"]);
});
