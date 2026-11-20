# Cross-poster

Posts one vertical Short to YouTube Shorts, Instagram Reels and TikTok through their official APIs, so we don't pay for Metricool. It runs on your Mac from this folder, with no dependencies beyond Node 22.

| Platform | Status | Scheduling |
| --- | --- | --- |
| YouTube Shorts | Works | YouTube holds the upload private and makes it public at `PUBLISH_AT`, so your Mac can be off. |
| Instagram Reels | Next | Instagram's API can't schedule, so this will need a small scheduled runner. |
| TikTok | After Instagram | Public posts need TikTok to audit the app first. Until then the plan is to send a draft to your TikTok inbox. |

## Each Short gets a `post.md`

It uses the same `TITLE`, `CAPTION` and `HASHTAGS` blocks as the playbook's `copy.md`, so `check_short.py` reads it too. It adds four posting fields:

```
VIDEO: day1_final.mp4                 # path relative to this file
PUBLISH_AT: 2026-11-22 09:00          # Central time (CROSSPOST_TZ); leave it out to post right away
PLATFORMS: youtube, instagram, tiktok
TOPIC_TAG: #running                   # replaces #shorts on Instagram and TikTok
TITLE: Day 1: My First Workout Coached by AI
CAPTION:
I missed sub-5 at 70.3 Michigan. ...
Follow along. splitdecisionscoach.com
HASHTAGS: #triathlon #ironman #triathlontraining #aicoach #shorts
```

The YouTube description is the caption with the hashtags on the last line, and the hashtags also become the video's tags. Category is Sports. "Made for kids" is set to no, and "altered or synthetic content" is set to no, because it's real camera footage. There's a full example in [examples/post.md](examples/post.md).

## Commands

```sh
cd crosspost
npm run crosspost -- check  ~/Documents/Shorts/Nov_1_2026/post.md      # copy, video and time checks, no upload
npm run crosspost -- post   ~/Documents/Shorts/Nov_1_2026/post.md --dry-run
npm run crosspost -- post   ~/Documents/Shorts/Nov_1_2026/post.md      # uploads (or schedules) it
npm run crosspost -- login  youtube
npm run crosspost -- whoami youtube
```

`post` runs every check first and stops on anything that would break the post: no title, more than 5 hashtags, an unfilled `{{placeholder}}`, a missing or horizontal video, one over 3 minutes, or a publish time less than 15 minutes away. Playbook nits such as a greeting at the start, no site link, or a cut longer than 45 s are printed but don't block it.

Once a Short is up, a `post.posted.json` file next to `post.md` records the link, so running `post` again skips anything already posted instead of uploading it twice. Use `--only youtube` to post to one platform.

## YouTube setup (one time, about 15 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project (for example "Split Decisions poster"), and enable **YouTube Data API v3** under APIs & Services, Library.
2. Under **OAuth consent screen**, pick **External** and fill in the app name and your email. Add the scopes `youtube.upload` and `youtube.readonly`.
3. Set the consent screen's publishing status to **In production**. If you leave it in **Testing**, Google expires the sign-in every 7 days. Google will warn that the app is unverified when you sign in. That's expected for an app only you use: click **Advanced**, then **Go to (app name)**.
4. Under **Credentials**, create an **OAuth client ID** of type **Desktop app**. Copy `.env.example` to `crosspost/.env` and paste the client ID and secret into it. That file is gitignored. Don't paste them in chat.
5. Run `npm run crosspost -- login youtube`. When Google asks which account or channel to use, pick **Split Decisions** (@splitdecisionscoach), not your personal channel. The command prints the channel it signed in to, so check it says Split Decisions.

The sign-in token is saved in `~/.config/split-decisions/crosspost/`, outside the repo and readable only by you.

**Limits:** Google's docs give a new project 100 uploads a day, plenty for two Shorts a week. Google says uploads from unverified projects are no longer forced to private. If the first upload still comes back locked as private, fill in YouTube's [API audit form](https://support.google.com/youtube/contact/yt_api_form) for the project.

## Tests

```sh
npm install        # only typescript and @types/node, for the type check
npm test
npm run typecheck
```
