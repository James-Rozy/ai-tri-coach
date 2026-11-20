#!/usr/bin/env node
// Split Decisions cross-poster. Run from crosspost/:
//   npm run crosspost -- check   <post.md>              copy + video + schedule checks, no network
//   npm run crosspost -- post    <post.md> [--dry-run] [--only youtube]
//   npm run crosspost -- login   youtube
//   npm run crosspost -- whoami  youtube

import { checkCopy, checkPosting, feedPreview, printChecks } from "./checks.ts";
import { TZ } from "./config.ts";
import { readLedger, record } from "./ledger.ts";
import { adapters } from "./platforms/index.ts";
import { metadata } from "./platforms/youtube.ts";
import { captionFor, PLATFORMS, readPost, type Platform } from "./post-file.ts";

const USAGE = `Usage:
  npm run crosspost -- check  <post.md>
  npm run crosspost -- post   <post.md> [--dry-run] [--only youtube,instagram]
  npm run crosspost -- login  <youtube>
  npm run crosspost -- whoami <youtube>`;

const fmtLocal = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

function platformArg(v: string | undefined): Platform {
  if (!v || !(PLATFORMS as readonly string[]).includes(v)) throw new Error(`Pick a platform: ${PLATFORMS.join(", ")}`);
  return v as Platform;
}

function runChecks(file: string) {
  const post = readPost(file, TZ);
  console.log(`\n${post.title || "(no title)"}`);
  console.log(post.publishAt ? `Goes live ${fmtLocal(post.publishAt)}` : "Goes live as soon as it's posted (no PUBLISH_AT)");
  console.log(`\nWHAT THE FEED SHOWS BEFORE "more"\n  ${feedPreview(post)}…`);
  const checks = [...checkCopy(post), ...checkPosting(post)];
  printChecks("CHECKS", checks);
  const stops = checks.filter((c) => !c.ok && c.blocking).length;
  const fixes = checks.filter((c) => !c.ok && !c.blocking).length;
  console.log(stops ? `\n${stops} thing(s) stop this post.` : fixes ? `\nOK to post. ${fixes} thing(s) worth fixing.` : "\nAll checks pass.");
  return { post, stops };
}

async function main(argv: string[]): Promise<number> {
  const [cmd, arg, ...rest] = argv;
  const flags = new Set(rest.filter((a) => a.startsWith("--")));
  const onlyIdx = rest.indexOf("--only");
  const only = onlyIdx >= 0 ? rest[onlyIdx + 1]?.split(",").map(platformArg) : null;

  switch (cmd) {
    case "check": {
      if (!arg) break;
      return runChecks(arg).stops ? 1 : 0;
    }
    case "login": {
      const a = adapters[platformArg(arg)];
      if (!a.login) throw new Error(a.notReady);
      await a.login();
      return 0;
    }
    case "whoami": {
      const a = adapters[platformArg(arg)];
      if (!a.whoami) throw new Error(a.notReady);
      console.log(await a.whoami());
      return 0;
    }
    case "post": {
      if (!arg) break;
      const { post, stops } = runChecks(arg);
      if (stops) return 1;
      const ledger = readLedger(post.file);
      const targets = post.platforms.filter((p) => !only || only.includes(p));
      const dry = flags.has("--dry-run");
      let failed = 0;
      console.log("");
      for (const p of targets) {
        const a = adapters[p];
        const done = ledger[p];
        if (done) { console.log(`${p}: already posted ${done.url}, skipping`); continue; }
        if (!a.ready || !a.upload) { console.log(`${p}: skipped. ${a.notReady}`); continue; }
        if (post.publishAt && !a.nativeScheduling) { console.log(`${p}: skipped, it can't schedule ahead yet`); continue; }
        if (dry) {
          console.log(`${p}: dry run, would send:`);
          console.log(JSON.stringify(p === "youtube" ? metadata(post) : { caption: captionFor(post, p) }, null, 2));
          continue;
        }
        try {
          const res = await a.upload(post, (s) => console.log(`${p}: ${s}`));
          record(post.file, p, res);
          console.log(`${p}: ${post.publishAt ? `scheduled for ${fmtLocal(post.publishAt)}` : "posted"} ${res.url}`);
        } catch (e) {
          failed++;
          console.error(`${p}: FAILED. ${(e as Error).message}`);
        }
      }
      return failed ? 1 : 0;
    }
  }
  console.log(USAGE);
  return cmd ? 2 : 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e: Error) => { console.error(e.message); process.exit(1); },
);
