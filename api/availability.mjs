import { handleVoydApi } from "../server/voyd-service.mjs";

export default async function handler(req, res) {
  const result = await handleVoydApi({
    method: req.method || "GET",
    url: req.url || "/api/availability",
    headers: req.headers,
    body: req.body,
    ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
  });
  for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
  return res.status(result.status).json(result.body);
}
