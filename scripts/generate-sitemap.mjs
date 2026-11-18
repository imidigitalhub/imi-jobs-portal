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
  const shareMessage = [clean(x.title), "Organisation: " + (x.organization || "Not specified"), "Category: " + (x.category || "Opportunity"), "Deadline: " + date(x.deadline), "", "View this opportunity on IMI DIGITAL HUB:", pageUrl].join("\n");
  const shareEncodedMessage = encodeURIComponent(shareMessage);
  const shareEncodedUrl = encodeURIComponent(pageUrl);
  const shareButtons = `<div class="detail-actions">
    <a class="whatsapp-share" href="https://wa.me/?text=${shareEncodedMessage}" data-analytics-event="share_whatsapp" data-opportunity-id="${esc(x.id)}" data-opportunity-title="${esc(x.title)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
    <a class="telegram-share" href="https://t.me/share/url?url=${shareEncodedUrl}&amp;text=${shareEncodedMessage}" data-analytics-event="share_telegram" data-opportunity-id="${esc(x.id)}" data-opportunity-title="${esc(x.title)}" target="_blank" rel="noopener noreferrer">Share on Telegram</a>
    <a class="facebook-share" href="https://www.facebook.com/sharer/sharer.php?u=${shareEncodedUrl}&amp;quote=${encodeURIComponent(shareMessage)}" data-analytics-event="share_facebook" data-opportunity-id="${esc(x.id)}" data-opportunity-title="${esc(x.title)}" target="_blank" rel="noopener noreferrer">Share on Facebook</a>
  </div>`;
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
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8Z5D32ETJS"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-8Z5D32ETJS');
  document.addEventListener('click', function(event) {
    const link = event.target.closest('a[data-analytics-event]');
    if (!link || typeof gtag !== 'function') return;
    gtag('event', link.dataset.analyticsEvent, {
      opportunity_id: link.dataset.opportunityId || '',
      opportunity_title: link.dataset.opportunityTitle || '',
      link_url: link.href,
      transport_type: 'beacon'
    });
  });
</script>
<script type="application/ld+json">${JSON.stringify(structured).replace(/</g,"\\u003c")}</script>
<link rel="stylesheet" href="../../styles.css">
<style>.seo-page{max-width:900px;margin:38px auto;padding:0 22px 50px}.breadcrumbs{font-size:13px;margin:0 0 22px;color:#687987}.breadcrumbs a{color:#176b87}.seo-page h1{font-size:clamp(28px,5vw,42px);line-height:1.2;color:#102a43}.seo-page .field{border-bottom:1px solid #e1e9ec;padding:14px 0}.seo-page .field h2{font-size:16px;color:#102a43;margin:0 0 6px}.seo-page .field p{margin:0;white-space:pre-wrap}.listing-image{width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin:15px 0}.seo-apply{display:inline-block;background:#102a43;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;margin:20px 0}</style>
</head><body>
<header class="topbar"><a class="brand" href="../../"><span class="brand-mark">IMI</span><span>IMI <b>DIGITAL HUB</b><small>Jobs &amp; Opportunities</small></span></a><nav><a href="../../#opportunities">Explore</a><a href="../../#categories">Categories</a><a href="../../#about">About</a></nav></header>
<main class="seo-page">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../../">Home</a> › <a href="../../#opportunities">Opportunities</a> › <span>${esc(x.title)}</span></nav>
<article><p><span class="tag">${esc(x.category || "Opportunity")}</span></p>${image}<h1>${esc(x.title)}</h1><p><strong>${esc(x.organization || "")}</strong></p>
${bodyFields}
${applyUrl ? `<p><a class="seo-apply" href="${esc(applyUrl)}" data-analytics-event="application_click" data-opportunity-id="${esc(x.id)}" data-opportunity-title="${esc(x.title)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a></p>` : ""}
${shareButtons}\n<p class="demo-note">Confirm eligibility, deadlines and application details with the official organisation before applying.</p>
<p><a href="../../#opportunities">← Browse more jobs and opportunities</a></p></article></main>
<footer><a class="brand footer-brand" href="../../"><span class="brand-mark">IMI</span><span>IMI <b>DIGITAL HUB</b><small>Building digital possibilities</small></span></a><p>© IMI DIGITAL HUB. All rights reserved.</p></footer>
</body></html>`;
  const outDir = path.join("opportunities", String(x.id));
  fs.mkdirSync(outDir, {recursive:true});
  fs.writeFileSync(path.join(outDir,"index.html"), html);
  sitemap.push({loc:pageUrl,lastmod:x.updated_at || x.created_at || "",priority:"0.8"});
}
// Generate dedicated SEO landing pages for the four additional opportunity categories.
const categoryPages = [
  {
    category: "Jobs",
    slug: "jobs",
    title: "Job Vacancies in Nigeria and Abroad",
    description: "Find job vacancies in Nigeria and internationally, including graduate jobs, entry-level roles, remote work and experienced-hire opportunities. Check requirements and apply through official sources.",
    intro: "Explore current job vacancies in Nigeria and abroad, including graduate and entry-level roles, experienced-hire positions and remote opportunities. Review each job's requirements, location and deadline, then use the official employer or recruiter link to confirm details and apply."
  },
  {
    category: "Scholarships",
    slug: "scholarships",
    title: "Scholarships in Nigeria and Abroad",
    description: "Explore scholarship opportunities for Nigerian students and applicants worldwide. Review eligibility, funding details, deadlines and official application links.",
    intro: "Discover scholarship opportunities for Nigerian students and applicants looking to study in Nigeria or abroad. Browse available listings, check eligibility requirements and funding details, and always confirm deadlines and application instructions with the official provider."
  },
  {
    category: "Internships",
    slug: "internships",
    title: "Internships and Graduate Opportunities",
    description: "Find internship opportunities, graduate placements and practical experience programmes in Nigeria and internationally.",
    intro: "Explore internships and practical experience opportunities that can help students, graduates and early-career professionals build skills. Review each listing carefully and use the official organisation link to confirm requirements and apply."
  },
  {
    category: "Grants",
    slug: "grants",
    title: "Grants and Funding Opportunities",
    description: "Discover grants, funding calls and financial support opportunities. Check eligibility, application requirements and official deadlines.",
    intro: "Browse grants and funding opportunities for eligible individuals, businesses, researchers and organisations. Funding criteria vary, so read each official call carefully and verify all application requirements before submitting."
  },
  {
    category: "Training",
    slug: "training",
    title: "Training and Skills Development Opportunities",
    description: "Explore professional training, skills development courses and learning programmes in Nigeria and beyond.",
    intro: "Find training programmes and skills-development opportunities to support your personal and professional growth. Check the programme format, eligibility, costs and dates directly with the training provider."
  }
];
const today = new Date().toISOString().slice(0, 10);
for (const page of categoryPages) {
  const matching = rowsAll.filter(x =>
    x.category === page.category && (!x.deadline || String(x.deadline).slice(0, 10) >= today)
  );
  const pageUrl = base + page.slug + "/";
  const cards = matching.map(x => {
    const itemUrl = base + "opportunities/" + encodeURIComponent(x.id) + "/";
    const summary = clean(x.description).slice(0, 230);
    return `<article class="opp-card">
      <span class="tag">${esc(x.category)}</span>
      <h2><a href="${esc(itemUrl)}">${esc(x.title)}</a></h2>
      <p class="org">${esc(x.organization || "")}</p>
      <p>${esc(summary)}${summary.length >= 230 ? "…" : ""}</p>
      <p class="category-meta">${x.location ? "Location: " + esc(x.location) + " · " : ""}Deadline: ${esc(date(x.deadline))}</p>
      <a class="details-link" href="${esc(itemUrl)}">View opportunity details ↗</a>
    </article>`;
  }).join("\\n");
  const categoryHtml = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)} | IMI DIGITAL HUB</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="IMI DIGITAL HUB">
<meta property="og:title" content="${esc(page.title)} | IMI DIGITAL HUB">
<meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(page.title)} | IMI DIGITAL HUB">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="theme-color" content="#102a43">
<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    "name":page.title + " | IMI DIGITAL HUB",
    "description":page.description,
    "url":pageUrl,
    "isPartOf":{"@type":"WebSite","name":"IMI DIGITAL HUB","url":base},
    "mainEntity":{"@type":"ItemList","numberOfItems":matching.length,"itemListElement":matching.map((x,i)=>({
      "@type":"ListItem","position":i+1,"url":base+"opportunities/"+encodeURIComponent(x.id)+"/","name":clean(x.title)
    }))}
  }).replace(/</g,"\\\\u003c")}</script>
<link rel="stylesheet" href="../styles.css">
<style>
.category-page{max-width:1100px;margin:42px auto;padding:0 22px 60px}
.category-page h1{font-size:clamp(30px,5vw,44px);line-height:1.15;color:#102a43;margin:12px 0}
.category-intro{max-width:820px;color:#526574;line-height:1.8;margin:0 0 28px}
.category-page .opportunity-grid{margin-top:22px}
.category-page .opp-card h2{font-size:18px;line-height:1.35;margin:15px 0 6px}
.category-page .opp-card h2 a{color:#102a43;text-decoration:none}
.category-page .opp-card h2 a:hover{color:#176b87}
.category-page .opp-card p{font-size:13px;color:#526574}
.category-meta{font-size:11px!important;color:#687987!important}
.category-empty{padding:28px;border:1px solid #e1e9ec;border-radius:12px;color:#526574;background:#f7fafb}
.category-back{display:inline-block;margin-top:28px;color:#176b87;font-weight:700;text-decoration:none}
</style></head><body>
<header class="topbar"><a class="brand" href="../"><span class="brand-mark">IMI</span><span>IMI <b>DIGITAL HUB</b><small>Jobs &amp; Opportunities</small></span></a><nav><a href="../#opportunities">Explore</a><a href="../#categories">Categories</a><a href="../#about">About</a></nav></header>
<main class="category-page">
<p class="eyebrow dark">EXPLORE BY CATEGORY</p>
<h1>${esc(page.title)}</h1>
<p class="category-intro">${esc(page.intro)}</p>
<p class="result-count">${matching.length} current listing${matching.length === 1 ? "" : "s"}</p>
<div class="opportunity-grid">${cards || '<p class="category-empty">There are no current published listings in this category. Please check back soon or browse all opportunities.</p>'}</div>
<a class="category-back" href="../#opportunities">← Browse all jobs and opportunities</a>
<p class="demo-note">Confirm eligibility, deadlines, fees and application instructions with the official provider before applying.</p>
</main>
<footer><a class="brand footer-brand" href="../"><span class="brand-mark">IMI</span><span>IMI <b>DIGITAL HUB</b><small>Building digital possibilities</small></span></a><p>© IMI DIGITAL HUB. All rights reserved.</p></footer>
</body></html>`;
  const outDir = path.join(page.slug);
  fs.mkdirSync(outDir, {recursive:true});
  fs.writeFileSync(path.join(outDir,"index.html"), categoryHtml);
  sitemap.push({loc:pageUrl,priority:"0.9"});
}

const xmlEscape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const xml = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...sitemap.map(item=>[
"  <url>",`    <loc>${xmlEscape(item.loc)}</loc>`,item.lastmod ? `    <lastmod>${xmlEscape(new Date(item.lastmod).toISOString())}</lastmod>` : "",`    <priority>${item.priority}</priority>`,"  </url>"
].filter(Boolean).join("\n")),"</urlset>",""].join("\n");
fs.writeFileSync("sitemap.xml",xml);
console.log(`Generated ${rowsAll.length} static opportunity pages and sitemap with ${sitemap.length} URLs.`);
