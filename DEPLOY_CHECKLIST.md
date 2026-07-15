# Account-bound launch checklist

No step below requires payment. The local build is complete; these actions require the owner's Reddit, Devvit, GitHub, video-host, or Devpost session.

## 1. Preflight

```bash
cd "/Users/prince/Documents/Outsource Jobs/projects/blast-radius-daily"
npm run verify
```

Confirm all four stages pass: TypeScript, ESLint, 8 engine tests, production build.

## 2. Register or connect the Devvit app

1. Sign in at <https://developers.reddit.com/new> with the intended Reddit account.
2. Create a Phaser app using the slug `blast-radius` if available.
3. If Reddit assigns another slug, update only the `name` field in `devvit.json`.
4. Run `npm run login` and complete the browser authorization.
5. Confirm the account with `npx devvit whoami`.

## 3. Playtest

1. Use a public test subreddit with fewer than 200 members that the owner moderates.
2. Run `DEVVIT_SUBREDDIT=your_subreddit npm run dev`.
3. Confirm installation creates a playable custom post and command comment.
4. Test the inline launch card, expanded game, two selections, deploy animation, result screen, eight-entry leaderboard, protocol vote, and privacy deletion control.
5. Test at least one desktop and one landscape touch viewport. Record narrow portrait-phone gameplay as unsupported in this version.
6. Confirm score sharing is visibly disabled while `score_sharing_approved` remains off.
7. Only after Reddit approves `SUBMIT_COMMENT` for the exact installed version, enable the global setting and confirm that the score comment matches the full preview exactly, posts only after **Post score as u/...**, and replies under a verified sticky command comment.

## 4. Upload and public artifacts

1. Run `npm run deploy` to upload a private app version.
2. Copy the resulting `developers.reddit.com/apps/{app-name}` URL into `SUBMISSION.md`.
3. Optional: create the public GitHub repository `ult666666/blast-radius-daily`, commit this directory, and push it.
4. Optional: record the actual Devvit post with `DEMO_SCRIPT.md`; keep the final video under 60 seconds.
5. Optional: upload the video publicly to YouTube or Vimeo and add the URL to `SUBMISSION.md`.
6. Capture at least three clean images: launch screen, live graph with breakers, and result/leaderboard.

## 5. Devpost submission

1. Join <https://redditgameswithahook.devpost.com/>.
2. Create a project named **Blast Radius Daily**.
3. Paste the prepared sections from `SUBMISSION.md`.
4. Add the unique Devvit app link, public test subreddit, playable demo-post link, and screenshots. Add the public repository and video only if completed; both are optional under the official rules.
5. Select the main “keep people coming back” category and the Phaser, retention, and user-contribution sub-challenges when the form allows.
6. Preview every link while signed out if possible.
7. Submit before **July 15, 2026 at 6:00 p.m. PDT**.

## 6. Final evidence

Save the Devpost confirmation URL and screenshot. Keep the public test post available free of charge through the judging period ending July 27, 2026.
