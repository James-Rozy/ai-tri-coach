// A small record next to each post file (post.posted.json) of what went where, so running
// `post` twice never uploads the same Short twice.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Platform } from "./post-file.ts";

export interface Posted {
  id: string;
  url: string;
  at: string;
  publishAt: string | null;
}

export type Ledger = Partial<Record<Platform, Posted>>;

const ledgerPath = (postFile: string) => postFile.replace(/\.md$/i, "") + ".posted.json";

export function readLedger(postFile: string): Ledger {
  const f = ledgerPath(postFile);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Ledger) : {};
}

export function record(postFile: string, platform: Platform, entry: Posted): string {
  const ledger = readLedger(postFile);
  ledger[platform] = entry;
  const f = ledgerPath(postFile);
  writeFileSync(f, JSON.stringify(ledger, null, 2) + "\n");
  return f;
}
