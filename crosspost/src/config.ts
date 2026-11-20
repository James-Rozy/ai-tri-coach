// Settings come from crosspost/.env (gitignored) or the shell. Tokens live outside the repo in
// ~/.config/split-decisions/crosspost/, readable only by you.

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const TZ = process.env.CROSSPOST_TZ || "America/Chicago";

export function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. ${hint}`);
  return v;
}

const STORE_DIR = process.env.CROSSPOST_STORE || join(homedir(), ".config", "split-decisions", "crosspost");

export function readStore<T>(name: string): T | null {
  const file = join(STORE_DIR, `${name}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : null;
}

export function writeStore(name: string, value: unknown): string {
  mkdirSync(STORE_DIR, { recursive: true, mode: 0o700 });
  const file = join(STORE_DIR, `${name}.json`);
  writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
  chmodSync(file, 0o600);
  return file;
}
