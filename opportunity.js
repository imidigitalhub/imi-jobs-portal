const db = window.supabase.createClient(window.IMI_SUPABASE_URL, window.IMI_SUPABASE_PUBLISHABLE_KEY);
const root = document.getElementById("opportunityDetail");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const niceDate = value => value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "Not specified";
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const pageUrl = window.location.href;
function shareLinks(x) {
  const message = [x.title,"Organisation: "+(x.organization || "Not specified"),"Category: "+(x.category || "Opportunity"),"Deadline: "+niceDate(x.deadline),"","View this opportunity on IMI DIGITAL HUB:",pageUrl].join("\n");
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedMessage = encodeURIComponent(message);
  return `<div class="detail-actions">
    <a class="whatsapp-share" href="https://wa.me/?text=${encodedMessage}" data-analytics-event="share_whatsapp" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
    <a class="telegram-share" href="https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}" data-analytics-event="share_telegram" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer">Share on Telegram</a>
    <a class="facebook-share" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(message)}" data-analytics-event="share_facebook" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer">Share on Facebook</a>
  </div>`;
}
async function loadOpportunity() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) { root.textContent = "No opportunity was specified. Please return to the opportunities list."; return; }
  const {data:x,error} = await db.from("opportunities").select("id,title,organization,category,location,employment_type,description,eligibility,salary_or_funding,benefits,application_instructions,image_url,application_url,source_url,deadline,is_published,contributor_name").eq("id",id).eq("is_published",true).maybeSingle();
  if (error || !x) { root.textContent = "This opportunity could not be found. It may have been unpublished or the link may be incorrect."; return; }
  const pageTitle = x.title + " | IMI DIGITAL HUB";
  const plainDescription = String(x.description || x.title).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const canonicalUrl = window.location.origin + window.location.pathname.replace(/opportunity\.html$/, "opportunities/" + encodeURIComponent(x.id) + "/");
  document.title = pageTitle;
  function setMeta(selector, attribute, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute(attribute, value);
  }
  setMeta('meta[name="description"]', "content", plainDescription);
  setMeta('meta[property="og:title"]', "content", pageTitle);
  setMeta('meta[property="og:description"]', "content", plainDescription);
  setMeta('meta[property="og:url"]', "content", canonicalUrl);
  setMeta('meta[name="twitter:title"]', "content", pageTitle);
  setMeta('meta[name="twitter:description"]', "content", plainDescription);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": pageTitle,
    "description": plainDescription,
    "url": canonicalUrl,
    "publisher": { "@type": "Organization", "name": "IMI DIGITAL HUB" }
  };
  let structuredScript = document.getElementById("opportunityStructuredData");
  if (!structuredScript) {
    structuredScript = document.createElement("script");
    structuredScript.id = "opportunityStructuredData";
    structuredScript.type = "application/ld+json";
    document.head.appendChild(structuredScript);
  }
  structuredScript.textContent = JSON.stringify(structuredData);
  const fields = [
    ["Location",x.location],["Employment type",x.employment_type],["Deadline",niceDate(x.deadline)],
    ["Salary / funding",x.salary_or_funding],["Eligibility",x.eligibility],["Benefits",x.benefits],
    ["Application instructions",x.application_instructions],["Description",x.description]
  ].filter(([,v])=>v);
  const apply = x.application_url || x.source_url;
  root.className = "detail-card";
  root.innerHTML = `
    <a class="back-btn" href="index.html#opportunities">← Back to opportunities</a>
    <div style="margin-top:22px"><span class="tag">${escapeHtml(x.category)}</span></div>
    ${x.image_url ? `<img src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}" style="width:100%;max-height:360px;object-fit:cover;border-radius:10px;margin-top:20px">` : ""}
    <h1>${escapeHtml(x.title)}</h1>
    <p class="detail-org">${escapeHtml(x.organization)}</p>${x.contributor_name ? `<p class="detail-org contributor-credit">Opportunity shared by ${escapeHtml(x.contributor_name)}</p>` : ""}
    <div class="detail-fields">${fields.map(([label,value])=>`<div class="detail-field"><strong>${escapeHtml(label)}</strong><div class="${label==="Description"?"detail-description":""}">${escapeHtml(label==="Deadline"?value:value)}</div></div>`).join("")}</div>
    <div class="detail-actions">${apply ? `<a class="apply-btn" href="${escapeHtml(apply)}" data-analytics-event="application_click" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a>` : ""}<a class="back-btn" href="index.html#opportunities">Browse more opportunities</a></div>
    ${shareLinks(x)}
    <p class="demo-note">Confirm eligibility, deadlines and application details with the official organisation before applying.</p>`;
}
document.getElementById("year").textContent = new Date().getFullYear();
loadOpportunity();
