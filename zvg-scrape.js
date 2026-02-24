import { CookieJar } from "tough-cookie";
import fetchCookie from "fetch-cookie";
import * as cheerio from "cheerio";
import crypto from "crypto";

const jar = new CookieJar();
const fetch = fetchCookie(globalThis.fetch, jar);

const REF = "https://www.zvg-portal.de/index.php?button=Termine%20suchen";
const SEARCH_URL = "https://www.zvg-portal.de/index.php?button=Suchen";

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("?")) return "https://www.zvg-portal.de/index.php" + href;
  return "https://www.zvg-portal.de/" + href.replace(/^\//, "");
}

function norm(s) {
  return (s ?? "").toString().replace(/\s+/g, " ").trim();
}

function computeHash(data) {
  const basis = [
    norm(data.aktenzeichen),
    norm(data.amtsgericht),
    norm(data.objekt_art),
    norm(data.lage),
    norm(data.verkehrswert_eur),
    norm(data.termin),
    norm(data.letzte_aktualisierung),
    norm(data.bekanntmachung_url),
  ].join("|");

  return crypto.createHash("sha256").update(basis, "utf8").digest("hex");
}

async function getHtml(ger_name, land_abk, ger_id) {
  // 1) Session holen
  await fetch(REF, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  // 2) POST Suche
  const body = new URLSearchParams({
    ger_name,
    order_by: "2",
    land_abk,
    ger_id,
    az1: "",
    az2: "",
    az3: "",
    az4: "",
    art: "",
    obj: "",
    str: "",
    hnr: "",
    plz: "",
    ort: "",
    ortsteil: "",
    vtermin: "",
    btermin: "",
  });

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": REF,
      "User-Agent": "Mozilla/5.0",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function parseSearchResults(html) {
  const $ = cheerio.load(html);
  const observed_at = new Date().toISOString();
  const table = $("#inhalt table").first();
  if (!table.length) return [];

  const rows = table.find("tr").toArray();
  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const tr = rows[i];
    const tds = $(tr).find("td");
    const firstLabel = $(tds[0]).text().replace(/\s+/g, " ").trim();
    if (!/^Aktenzeichen\b/.test(firstLabel)) continue;

    const a = $(tds[1]).find("a[href*='showZvg']").first();
    const detailHref = a.attr("href");
    const aktenzeichenRaw = a.text().replace(/\s+/g, " ").trim();
    const zvgIdMatch = (detailHref || "").match(/zvg_id=(\d+)/);
    const zvg_id = zvgIdMatch ? zvgIdMatch[1] : null;

    const letzteAktRaw = $(tds[2]).text().replace(/\s+/g, " ").trim().replace(/^\(|\)$/g, "");

    const item = {
      zvg_id,
      aktenzeichen: aktenzeichenRaw.replace(/\s*\(Detailansicht\)\s*/i, "").trim(),
      detail_url: absUrl(detailHref),
      letzte_aktualisierung: letzteAktRaw.replace(/\s*letzte Aktualisierung\s*/i, "").trim() || null,

      amtsgericht: null,
      objekt_art: null,
      lage: null,
      verkehrswert_eur: null,
      termin: null,

      bekanntmachung_url: null,
      bekanntmachung_file_id: null,
      bekanntmachung_size: null,
    };

    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j];
      if ($(r).find("hr").length) {
        i = j;
        break;
      }

      const cols = $(r).find("td");
      if (!cols.length) continue;

      const label = $(cols[0]).text().replace(/\s+/g, " ").trim();

      if (label === "Amtsgericht") {
        item.amtsgericht = $(cols[1]).text().replace(/\s+/g, " ").trim();
      } else if (label === "Objekt/Lage") {
        const td = $(cols[1]);
        const artRaw = td.find("b").first().text().replace(/\s+/g, " ").trim();
        item.objekt_art = artRaw.replace(/:$/, "").trim() || null;

        const cloned = td.clone();
        cloned.find("b").first().remove();
        item.lage = cloned.text().replace(/\s+/g, " ").trim() || null;
      } else if (/^Verkehrswert\b/.test(label)) {
        item.verkehrswert_eur = $(cols[1]).text().replace(/\s+/g, " ").trim();
      } else if (label === "Termin") {
        item.termin = $(cols[1]).text().replace(/\s+/g, " ").trim();
      } else if (label === "" || label === "\u00A0") {
        const link = $(cols[1]).find("a[href*='showAnhang']").first();
        if (link.length) {
          const href = link.attr("href");
          item.bekanntmachung_url = absUrl(href);
          const fileIdMatch = (href || "").match(/file_id=(\d+)/);
          item.bekanntmachung_file_id = fileIdMatch ? fileIdMatch[1] : null;
          item.bekanntmachung_size = $(cols[1]).find("span.kleinereSchrift").first().text().trim() || null;
        }
      }

      if (j === rows.length - 1) i = j;
    }

    // Hash + last_seen/observed_at dazu
    const hash = computeHash(item);
    results.push({ zvg_id: item.zvg_id, hash, data: item, last_seen: observed_at });
  }

  return results;
}

export async function run(ger_name, land_abk, ger_id) {
  const html = await getHtml(ger_name, land_abk, ger_id);
  const results = parseSearchResults(html);
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , ger_name, land_abk, ger_id] = process.argv;

  if (!ger_name || !land_abk || !ger_id) {
    console.error("Usage: node zvg-scrape.js <ger_name> <land_abk> <ger_id>");
    process.exit(1);
  }

  run(ger_name, land_abk, ger_id)
    .then(results => {
      process.stdout.write(JSON.stringify(results));
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

// Alternativ: Direkt testen
// node zvg-scrape.js Ahaus nw R2701