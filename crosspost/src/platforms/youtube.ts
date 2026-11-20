// YouTube Shorts through the YouTube Data API v3.
// Auth: OAuth for a "Desktop app" client, loopback redirect + PKCE. The refresh token is stored
// outside the repo. Upload: resumable videos.insert. Scheduling is YouTube's own: the video is
// uploaded private with status.publishAt, and YouTube flips it public at that time, so nothing
// needs to be running on your Mac when it goes live.

import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { readStore, requireEnv, writeStore } from "../config.ts";
import { captionFor, hashtagsFor, type Post } from "../post-file.ts";
import type { Posted } from "../ledger.ts";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly", // only to confirm which channel you signed in to
];
const SPORTS_CATEGORY = "17";

interface Stored {
  refresh_token: string;
  channel: { id: string; title: string; handle: string };
}

function client() {
  const hint = "Add it to crosspost/.env (see README, 'YouTube setup').";
  return { id: requireEnv("YOUTUBE_CLIENT_ID", hint), secret: requireEnv("YOUTUBE_CLIENT_SECRET", hint) };
}

const b64url = (b: Buffer) => b.toString("base64url");

export async function login(): Promise<void> {
  const { id, secret } = client();
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(16));

  const { code, redirectUri } = await new Promise<{ code: string; redirectUri: string }>((resolveCode, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const got = url.searchParams.get("code");
      const err = url.searchParams.get("error");
      if (!got && !err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(err ? `<p>Sign-in failed: ${err}. You can close this tab.</p>` : "<p>Signed in. You can close this tab and go back to the terminal.</p>");
      server.close();
      if (err) reject(new Error(`Google sign-in failed: ${err}`));
      else if (url.searchParams.get("state") !== state) reject(new Error("Sign-in state didn't match; try again."));
      else resolveCode({ code: got!, redirectUri });
    });
    let redirectUri = "";
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") return reject(new Error("Couldn't open a local port"));
      redirectUri = `http://127.0.0.1:${addr.port}`;
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.search = new URLSearchParams({
        client_id: id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "),
        code_challenge: challenge, code_challenge_method: "S256", access_type: "offline", prompt: "consent", state,
      }).toString();
      console.log("\nOpening Google sign-in. Pick the Split Decisions channel when asked.\nIf no browser opens, paste this URL:\n\n" + auth + "\n");
      execFile(process.platform === "darwin" ? "open" : "xdg-open", [auth.toString()], () => {});
    });
  });

  const tok = await tokenRequest({
    code, client_id: id, client_secret: secret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier,
  });
  if (!tok.refresh_token) throw new Error("Google didn't return a refresh token. Remove the app's access at myaccount.google.com/permissions and run login again.");
  const channel = await myChannel(tok.access_token);
  const file = writeStore("youtube", { refresh_token: tok.refresh_token, channel } satisfies Stored);
  console.log(`Signed in to YouTube channel "${channel.title}" (${channel.handle}). Token saved to ${file}`);
}

async function tokenRequest(body: Record<string, string>): Promise<{ access_token: string; refresh_token?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams(body) });
  const j = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    if (j.error === "invalid_grant") throw new Error("YouTube sign-in expired or was revoked. Run: npm run crosspost -- login youtube");
    throw new Error(`Google token error ${res.status}: ${j.error_description ?? j.error}`);
  }
  return j as unknown as { access_token: string; refresh_token?: string };
}

async function accessToken(): Promise<{ token: string; stored: Stored }> {
  const stored = readStore<Stored>("youtube");
  if (!stored) throw new Error("Not signed in to YouTube. Run: npm run crosspost -- login youtube");
  const { id, secret } = client();
  const tok = await tokenRequest({ client_id: id, client_secret: secret, refresh_token: stored.refresh_token, grant_type: "refresh_token" });
  return { token: tok.access_token, stored };
}

async function myChannel(token: string): Promise<Stored["channel"]> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { authorization: `Bearer ${token}` } });
  const j = (await res.json()) as { items?: { id: string; snippet: { title: string; customUrl?: string } }[]; error?: { message: string } };
  if (!res.ok) throw new Error(`YouTube channels.list ${res.status}: ${j.error?.message}`);
  const ch = j.items?.[0];
  if (!ch) throw new Error("That Google account has no YouTube channel. Sign in again and pick the Split Decisions channel.");
  return { id: ch.id, title: ch.snippet.title, handle: ch.snippet.customUrl ?? "" };
}

export async function whoami(): Promise<string> {
  const { token } = await accessToken();
  const ch = await myChannel(token);
  return `${ch.title} (${ch.handle || ch.id})`;
}

export function metadata(post: Post) {
  const scheduled = post.publishAt !== null;
  return {
    snippet: {
      title: post.title,
      description: captionFor(post, "youtube"),
      tags: hashtagsFor(post, "youtube").map((t) => t.slice(1)),
      categoryId: SPORTS_CATEGORY,
      defaultLanguage: "en",
      defaultAudioLanguage: "en",
    },
    status: {
      // publishAt only works on a private video; YouTube makes it public at that time.
      privacyStatus: scheduled ? "private" : "public",
      ...(scheduled ? { publishAt: post.publishAt!.toISOString() } : {}),
      selfDeclaredMadeForKids: false,
      // Real camera footage. The AI writes the training plan, not the video.
      containsSyntheticMedia: false,
      embeddable: true,
      license: "youtube",
    },
  };
}

export async function upload(post: Post, log: (s: string) => void): Promise<Posted> {
  const { token, stored } = await accessToken();
  log(`Uploading to YouTube channel "${stored.channel.title}"`);
  const size = statSync(post.video).size;
  const type = post.video.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";

  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(size),
      "x-upload-content-type": type,
    },
    body: JSON.stringify(metadata(post)),
  });
  if (!init.ok) throw new Error(`YouTube upload start ${init.status}: ${await errorText(init)}`);
  const session = init.headers.get("location");
  if (!session) throw new Error("YouTube didn't return an upload URL");

  let offset = 0;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(session, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": type,
        "content-length": String(size - offset),
        ...(offset > 0 ? { "content-range": `bytes ${offset}-${size - 1}/${size}` } : {}),
      },
      body: Readable.toWeb(createReadStream(post.video, { start: offset })) as ReadableStream,
      duplex: "half",
    } as RequestInit).catch((e: Error) => e);

    if (!(res instanceof Error) && (res.status === 200 || res.status === 201)) {
      const video = (await res.json()) as { id: string };
      return {
        id: video.id,
        url: `https://youtube.com/shorts/${video.id}`,
        at: new Date().toISOString(),
        publishAt: post.publishAt?.toISOString() ?? null,
      };
    }
    const retryable = res instanceof Error || [500, 502, 503, 504].includes(res.status);
    if (!retryable || attempt >= 5) {
      throw new Error(`YouTube upload failed: ${res instanceof Error ? res.message : `${res.status} ${await errorText(res)}`}`);
    }
    const wait = 2 ** attempt * 1000;
    log(`Upload interrupted (${res instanceof Error ? res.message : res.status}); resuming in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    offset = await uploadedSoFar(session, token, size);
  }
}

async function uploadedSoFar(session: string, token: string, size: number): Promise<number> {
  const res = await fetch(session, { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-range": `bytes */${size}`, "content-length": "0" } });
  if (res.status !== 308) return 0;
  const range = res.headers.get("range");
  return range ? Number(range.split("-")[1]) + 1 : 0;
}

async function errorText(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    const reason = j.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "uploadLimitExceeded") return `${reason}: YouTube's daily upload limit for this project or channel was hit; try again tomorrow`;
    return `${j.error?.message ?? text}${reason ? ` (${reason})` : ""}`;
  } catch {
    return text.slice(0, 300);
  }
}
