import http from "node:http";
import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import availabilityHandler from "../api/availability.mjs";
import bookingHandler from "../api/booking.mjs";
import adminBookingsHandler from "../api/admin/bookings.mjs";
import adminBlocksHandler from "../api/admin/blocks.mjs";

function loadDotEnv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^"|"$/g, "");
    }
  }
}

loadDotEnv();

const port = Number(process.env.VOYD_API_PORT || 8787);

// Local dev only - production runs these same handler files as native Vercel Functions.
const routes = {
  "/api/availability": availabilityHandler,
  "/api/booking": bookingHandler,
  "/api/admin/bookings": adminBookingsHandler,
  "/api/admin/blocks": adminBlocksHandler,
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function withVercelResponseShape(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.end(JSON.stringify(body));
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  withVercelResponseShape(res);
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const handler = routes[url.pathname];
  if (!handler) {
    res.status(404).json({ ok: false, error: "Not found" });
    return;
  }
  req.body = req.method === "GET" || req.method === "OPTIONS" ? undefined : await readRawBody(req);
  await handler(req, res);
});

server.listen(port, () => {
  console.info(`VOYD local API listening on http://127.0.0.1:${port}`);
});
