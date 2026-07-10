import http from "node:http";
import { handleVoydApi } from "./voyd-service.mjs";

const port = Number(process.env.VOYD_API_PORT || 8787);

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  const body = req.method === "GET" || req.method === "OPTIONS" ? "" : await readRawBody(req);
  const result = await handleVoydApi({
    method: req.method || "GET",
    url: req.url || "/",
    headers: req.headers,
    body,
    ip: req.socket.remoteAddress || "",
  });

  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body));
});

server.listen(port, () => {
  console.info(`VOYD API server listening on http://127.0.0.1:${port}`);
});
