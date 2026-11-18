// Build SEO-ready static pages and a sitemap for every published opportunity.
import fs from "node:fs";
import path from "node:path";

const config = fs.readFileSync("supabase-config.js", "utf8");
const supabaseUrl = config.match(/IMI_SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
const key = config.match(/IMI_SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
if (!supabaseUrl || !key) throw new Error("Supabase public configuration was not found.");

const base = "https://imidigitalhub.github.io/imi-jobs-portal/";
const endpoint = new URL("/rest/v1/opportunities", supabaseUrl);
endpoint.searchParams.set("select", "id,title,organization,category,location,employment_type,description,eligibility,salary_or_funding,benefits,application_instructions,image_url,application_url,source_url,deadline,created_at,updated_at");
endpoint.searchParams.set("is_published", "eq.true");
endpoint.searchParams.set("order", "created_at.asc");

const rowsAll = [];
let offset = 0;
const pageSize = 500;
while (true) {
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${offset}-${offset + pageSize - 1}`, "Range-Unit": "items" }
  });
  if (!response.ok) throw new Error(`Supabase opportunity query failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  rowsAll.push(...rows);
  if (rows.length < pageSize) break;
  offset += pageSize;
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
const clean = value => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const date = value => value ? new Date(value + (String(value).length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-NG", {day:"numeric",month:"long",year:"numeric"}) : "Not specified";
const sitemap = [{loc:base, priority:"1.0"}];

for (const x of rowsAll) {
  if (!x.id) continue;
  const pageUrl = base + "opportunities/" + encodeURIComponent(x.id) + "/";
  const title = clean(x.title) + " | IMI DIGITAL HUB";
  const description = (clean(x.description) || clean(x.title)).slice(0, 155);
  const fields = [
    ["Organisation",x.organization],["Category",x.category],["Location",x.location],
    ["Employment type",x.employment_type],["Deadline",date(x.deadline)],
    ["Salary / funding",x.salary_or_funding],["Eligibility",x.eligibility],
    ["Benefits",x.benefits],["How to apply",x.application_instructions],["Description",x.description]
  ].filter(([,v]) => v);
  const image = x.image_url ? `<img class="listing-image" src="${esc(x.image_url)}" alt="${esc(x.title)}" loading="lazy" decoding="async">` : "";
  const applyUrl = x.application_url || x.source_url || "";
  const bodyFields = fields.map(([label,value]) => `<section class="field"><h2>${esc(label)}</h2><p>${esc(label === "Deadline" ? value : value)}</p></section>`).join("\n");
  const structured = {
    "@context":"https://schema.org",
    "@type":"WebPage",
    "name":title,
    "description":description,
    "url":pageUrl,
    "datePublished":x.created_at || undefined,
    "dateModified":x.updated_at || x.created_at || undefined,
    "publisher":{"@type":"Organization","name":"IMI DIGITAL HUB","url":base},
    "breadcrumb":{"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":base},
      {"@type":"ListItem","position":2,"name":"Opportunities","item":base+"#opportunities"},
      {"@type":"ListItem","position":3,"name":clean(x.title)}
    ]}
  };
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="IMI DIGITAL HUB">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(pageUrl)}">
${x.image_url ? `<meta property="og:image" content="${esc(x.image_url)}">` : ""}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${x.image_url ? `<meta name="twitter:image" content="${esc(x.image_url)}">` : ""}
<meta name="theme-color" content="#102a43">
<script type="application/ld+json">${JSON.stringify(structured).replace(/</g,"\\u003c")}</script>
<link rel="stylesheet" href="../../styles.css">
<style>.seo-page{max-width:900px;margin:38px auto;padding:0 22px 50px}.breadcrumbs{font-size:13px;margin:0 0 22px;color:#687987}.breadcrumbs a{color:#176b87}.seo-page h1{font-size:clamp(28px,5vw,42px);line-height:1.2;color:#102a43}.seo-page .field{border-bottom:1px solid #e1e9ec;padding:14px 0}.seo-page .field h2{font-size:16px;color:#102a43;margin:0 0 6px}.seo-page .field p{margin:0;white-space:pre-wrap}.listing-image{width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin:15px 0}.seo-apply{display:inline-block;background:#102a43;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;margin:20px 0}</style>
</head><body>
<header class="topbar"><a class="brand" href="../../"><span class="brand-mark">IMI</span><span>IMI <b>DIGITAL HUB</b><small>Jobs &amp; Opportunities</small></span></a><nav><a href="../../#opportunities">Explore</a><a href="../../#categories">Categories</a><a href="../../#about">About</a></nav></header>
<main class="seo-page">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../../">Home</a> › <a href="../../#opportunities">Opportunities</a> › <span>${esc(x.title)}</span></nav>
<article><p><span class="tag">${esc(x.category || "Opportunity")}</span></p>${image}<h1>${esc(x.title)}</h1><p><strong>${esc(x.organization || "")}</strong></p>
${bodyFields}
${applyUrl ? `<p><a class="seo-apply" href="${esc(applyUrl)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a></p>` : ""}
<p class="demo-note">Confirm eligibility, deadlines and application details with the official organisation before applying.</p>
<p><a href="../../#opportunities">← Browse more jobs and opportunities</a></p></article></main>
<footer><a class="brand footer-brand" href="../../"><span class="brand-mark">IMI</span><span>IMI <b>DIGITAL HUB</b><small>Building digital possibilities</small></span></a><p>© IMI DIGITAL HUB. All rights reserved.</p></footer>
</body></html>`;
  const outDir = path.join("opportunities", String(x.id));
  fs.mkdirSync(outDir, {recursive:true});
  fs.writeFileSync(path.join(outDir,"index.html"), html);
  sitemap.push({loc:pageUrl,lastmod:x.updated_at || x.created_at || "",priority:"0.8"});
}
const xmlEscape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const xml = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...sitemap.map(item=>[
"  <url>",`    <loc>${xmlEscape(item.loc)}</loc>`,item.lastmod ? `    <lastmod>${xmlEscape(new Date(item.lastmod).toISOString())}</lastmod>` : "",`    <priority>${item.priority}</priority>`,"  </url>"
].filter(Boolean).join("\n")),"</urlset>",""].join("\n");
fs.writeFileSync("sitemap.xml",xml);
console.log(`Generated ${rowsAll.length} static opportunity pages and sitemap with ${sitemap.length} URLs.`);
