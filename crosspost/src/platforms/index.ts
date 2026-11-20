import type { Posted } from "../ledger.ts";
import type { Platform, Post } from "../post-file.ts";
import * as youtube from "./youtube.ts";

export interface Adapter {
  ready: boolean;
  /** Why it can't post yet, shown instead of posting. */
  notReady?: string;
  login?: () => Promise<void>;
  whoami?: () => Promise<string>;
  upload?: (post: Post, log: (s: string) => void) => Promise<Posted>;
  /** Whether the platform holds the post and publishes it itself at PUBLISH_AT. */
  nativeScheduling: boolean;
}

export const adapters: Record<Platform, Adapter> = {
  youtube: { ready: true, login: youtube.login, whoami: youtube.whoami, upload: youtube.upload, nativeScheduling: true },
  instagram: {
    ready: false,
    nativeScheduling: false,
    notReady: "Instagram Reels is the next step (Instagram API with Instagram Login). Post it by hand for now.",
  },
  tiktok: {
    ready: false,
    nativeScheduling: false,
    notReady: "TikTok is planned after Instagram (Content Posting API; public posts need TikTok's app audit). Post it by hand for now.",
  },
};
