# Deploying the browser app

The browser app is AskTheMove with no server: games, settings and progress stay in the visitor's browser. It is a folder of plain files (`web/dist-app/`) that Cloudflare Pages hosts for free. You need no credit card; the free plan is enough.

It goes to its own Pages project called `askthemove-app`, at **https://askthemove-app.pages.dev**. That address is the preview: you and anyone you send the link to can use it there.

> **app.askthemove.online stays on the "board is resting" page until launch.**
> Do not add `app.askthemove.online` (or any askthemove.online address) under **Custom domains** in the `askthemove-app` project. Do not change or delete the `askthemove-resting` Worker or its route. Deploying the browser app never touches either one. Pointing the real address at this project is a separate step for launch day, after you decide the app is ready.

## What you need

- The Cloudflare account you already use for askthemove.online, on the free plan.
- This repository on your Mac with `npm install` done.
- Wrangler, Cloudflare's command-line tool. You don't install it: the commands below fetch version 4.136.3 with `npx`, the same version the resting page uses.

## One-time setup

1. Sign in to Cloudflare, if this Mac isn't signed in yet. A browser window opens; approve it.

   ```sh
   npx wrangler@4.136.3 login
   ```

2. Create the Pages project:

   ```sh
   npx wrangler@4.136.3 pages project create askthemove-app --production-branch main
   ```

   Don't connect a Git repository to it. The app is built on your Mac and uploaded from there.

## Deploy

From the repository folder:

```sh
npm run deploy:app
```

This builds the app into `web/dist-app/` and uploads that folder. At the end Wrangler prints an address like `https://1a2b3c4d.askthemove-app.pages.dev`. That one belongs to this upload and never changes, which helps when comparing two versions. **https://askthemove-app.pages.dev** always shows the newest upload.

The command always deploys as `main`, whatever Git branch you are on, so the main address is what updates. To try something without changing it, deploy under another name:

```sh
npm run build:app
npx --yes wrangler@4.136.3 pages deploy web/dist-app --project-name askthemove-app --branch try
```

That one appears at `https://try.askthemove-app.pages.dev`.

### Check it after a deploy

1. Open https://askthemove-app.pages.dev. The bottom of the left menu says "In this browser · Your games stay on this device".
2. Go to **My games**, choose **Import a PGN**, paste a short game and import it.
3. Reload the page. The game is still in **My games**.

Before deploying you can run the same check on your Mac, in a hidden browser, with the real security settings:

```sh
npm run smoke:app
```

It prints "Browser app smoke passed" when everything works.

## The coach Worker address (VITE_COACH_URL)

The invite-code coach runs in a small Cloudflare Worker with its own address. The app learns that address when it is built, so set it on your Mac, not in the Cloudflare dashboard. (Pages "environment variables" only reach builds that Cloudflare runs, and this project has none.)

Either put it in front of the deploy command each time:

```sh
VITE_COACH_URL=https://askthemove-coach.YOUR-NAME.workers.dev npm run deploy:app
```

or save it once in a file called `web/.env.production.local` (Git ignores it), as one line:

```
VITE_COACH_URL=https://askthemove-coach.YOUR-NAME.workers.dev
```

Use the address Wrangler printed when you deployed the coach Worker. It must start with `https://`; otherwise the build stops with a message.

The build also adds that address to the app's security settings, so the browser is allowed to talk to it. If you leave it out, the coach still works with a visitor's own Claude key, or falls back to the engine's summary. If the address changes, deploy again.

## Roll back

If a deploy breaks something:

1. Open the Cloudflare dashboard, then **Workers & Pages**, then **askthemove-app**, then **Deployments**.
2. Find the last deploy that worked, open its **...** menu and choose **Rollback to this deployment**.

The main address switches back right away. Rolling back is free and you can do it as often as you like. You can also check out an older commit and run `npm run deploy:app` again.

## What gets uploaded

- The app itself, with file names that change on every build so browsers never use an old copy.
- `_headers`: security settings for every page. They tell the browser to run only this site's own code, to talk only to this site, the Lichess tablebase and Lichess, Claude (`api.anthropic.com`) and the coach Worker, and to refuse to be shown inside another site. The build writes this file from `scripts/browser-app-hosting.mjs`; change that script, not the file in `web/dist-app/`.
- `manifest.webmanifest` and the app icons, so the app can be added to a phone's home screen. On iPhones this also helps the browser keep saved games.

`npm run build` (the server app on your Mac) does not get any of these files; it is unchanged.

The app has one page and changes screens without changing the address, so it needs no redirect rules. Any unknown address on the site shows the app.

## Free plan limits

Each uploaded file must be under 25 MB. The largest file today is about 1.1 MB; the chess engine files, when they arrive, are well under the limit.

## The beta app at askthemove.online/betapp

The same app also runs inside the main site at **https://askthemove.online/betapp/**, where only beta testers can open it. A visitor sees a sign-in page first. Cloudflare checks the email and beta code before it sends any file of the app, so nobody can load the app or its engine without signing in. A session lasts 30 days on that device.

The people allowed in are kept in a Cloudflare secret, never in this repository. You set it once, and again whenever you add or remove a tester.

### One-time setup

From the repository folder on your Mac:

1. Choose who can sign in. Write one line per person: their email, a space, then their beta code. Pick codes that are long and hard to guess.

2. Store that list as a secret. The command asks you to paste the value, so it never lands in your shell history:

   ```sh
   cd site
   npx --yes wrangler@4.136.3 pages secret put BETA_USERS --project-name askthemove
   ```

   For several people, paste them on one line separated by commas, like `you@example.com code-one, friend@example.com code-two`.

3. Store a random key that signs the session cookies:

   ```sh
   openssl rand -hex 32 | npx --yes wrangler@4.136.3 pages secret put BETA_SESSION_SECRET --project-name askthemove
   ```

4. Deploy the site. The deploy builds the app for /betapp on the way:

   ```sh
   npm run deploy
   ```

   To include the invite-code coach, put `VITE_COACH_URL=https://askthemove-coach.YOUR-NAME.workers.dev` in front of `npm run deploy`.

5. Open https://askthemove.online/betapp/, sign in, and play a bot.

### Everyday changes

- **Add or remove a tester:** run step 2 again with the full new list, then deploy again (step 4). Cloudflare only uses a new secret from the next deploy, so until you deploy, the old list still works. After the deploy, someone you removed is signed out at their next click.
- **Sign everyone out:** run step 3 again, then deploy again (step 4).
- **Update the app:** `git pull`, then `cd site && npm run deploy`.

Wrong codes are limited to 10 tries per 10 minutes from one address. Until both secrets are set, /betapp shows "not set up yet" and serves nothing.
