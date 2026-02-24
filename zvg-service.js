import http from "http";
import url from "url";
import { run } from "./zvg-scrape.js"; // exportiere run() aus deinem Script

const server = http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  // Healthcheck endpoint
  if (u.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }
  // Alle anderen Endpoints außer /scrape ablehnen
  if (u.pathname !== "/scrape") {
    res.writeHead(404);
    return res.end("not found");
  }

  const { ger_name, land_abk, ger_id } = u.query;
  if (!ger_name || !land_abk || !ger_id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "missing query params" }));
  }

  try {
    const results = await run(ger_name, land_abk, ger_id);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(results));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(3000, "0.0.0.0", () => {
  console.error("zvg_scraper listening on :3000");
});
