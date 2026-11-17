// Generate a sitemap containing the homepage and every published opportunity.
// Uses the public Supabase key already configured for the public portal.
import fs from "node:fs";

const config = fs.readFileSync("supabase-config.js", "utf8");
const url = config.match(/IMI_SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
const key = config.match(/IMI_SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];

if (!url || !key) throw new Error("Supabase public configuration was not found.");

const base = "https://imidigitalhub.github.io/imi-jobs-portal/";
const endpoint = new URL("/rest/v1/opportunities", url);
endpoint.searchParams.set("select", "id,updated_at,created_at");
endpoint.searchParams.set("is_published", "eq.true");
endpoint.searchParams.set("order", "created_at.asc");

const urls = [{ loc: base, priority: "1.0" }];
let offset = 0;
const pageSize = 500;

while (true) {
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Range: `${offset}-${offset + pageSize - 1}`,
      "Range-Unit": "items"
    }
  });
  if (!response.ok) {
    throw new Error(`Supabase sitemap query failed: ${response.status} ${await response.text()}`);
  }
  const rows = await response.json();
  for (const row of rows) {
    if (!row.id) continue;
    urls.push({
      loc: base + "opportunity.html?id=" + encodeURIComponent(row.id),
      lastmod: row.updated_at || row.created_at || "",
      priority: "0.8"
    });
  }
  if (rows.length < pageSize) break;
  offset += pageSize;
}

const escapeXml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(item => [
    "  <url>",
    `    <loc>${escapeXml(item.loc)}</loc>`,
    item.lastmod ? `    <lastmod>${escapeXml(new Date(item.lastmod).toISOString())}</lastmod>` : "",
    `    <priority>${item.priority}</priority>`,
    "  </url>"
  ].filter(Boolean).join("\n")),
  "</urlset>",
  ""
].join("\n");

fs.writeFileSync("sitemap.xml", xml);
console.log(`Generated sitemap with ${urls.length} URLs.`);
