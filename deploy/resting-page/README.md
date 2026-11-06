# Resting page for app.askthemove.online

The beta app runs on the founder's Mac through a Cloudflare Tunnel (`scripts/host_on_mac.sh`). When the Mac sleeps or is off, visitors used to get Cloudflare's "Error 1033" page.

This small Cloudflare Worker sits in front of `app.askthemove.online`.

**Until launch (`ALWAYS_REST = "true"` in `wrangler.toml`, the default now):** every visit gets the page, saying the beta is being rebuilt, even when the Mac is running the app. Nothing reaches the Mac. At launch, set it to `"false"` and deploy again to get the behaviour below.

With `ALWAYS_REST = "false"`:

- When the Mac is up, every request goes straight through to the app, unchanged.
- When the tunnel is down (status 530, error 1033) or the app isn't answering (502), page visits get "The board is resting" in the main site's notebook style, with a button to the Puzzle Launcher at `askthemove.online/puzzleanalyzr`. The page reloads every minute, so it turns back into the app by itself.
- API calls get a short JSON 503 instead of the page.

It borrows the main site's fonts and one piece drawing from `askthemove.online/assets/`, served under `/__resting/` so they load from the same address.

It is free: Workers' free plan allows 100,000 requests a day, far more than the beta needs.

## Deploy (once, on the Mac)

The main site's deploy already signed this Mac in to Cloudflare. If it hasn't, `npx wrangler login` opens the browser first.

```sh
cd deploy/resting-page
npx wrangler@4.136.3 deploy
```

It should print the route `app.askthemove.online/*`. Nothing else changes: DNS, the tunnel and the app stay as they are.

To check it: stop the app with `scripts/host_on_mac.sh stop`, open https://app.askthemove.online (the resting page shows), then `scripts/host_on_mac.sh start` and wait a minute (the app comes back).

To remove it: `npx wrangler@4.136.3 delete` in this folder, or delete the `askthemove-resting` Worker in the Cloudflare dashboard.

The Puzzle Launcher link comes from `LAUNCHER_URL` in `wrangler.toml`.

## Test

```sh
node --test test/worker.test.mjs
```

Not checked yet: the real Cloudflare behaviour, that a Worker's request to a stopped tunnel comes back as status 530 rather than an exception (both are handled).
