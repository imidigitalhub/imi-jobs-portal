const supabaseClient = window.supabase.createClient(window.IMI_SUPABASE_URL, window.IMI_SUPABASE_PUBLISHABLE_KEY);
let category = "All", query = "", locationFilter = "", opportunities = [];
const grid = document.getElementById("opportunityGrid");
const empty = document.getElementById("emptyState");
const featuredSection = document.getElementById("featuredSection");
const featuredGrid = document.getElementById("featuredGrid");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const niceDate = value => value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "Not specified";
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
function opportunityUrl(x) {
  return new URL("opportunity.html?id=" + encodeURIComponent(x.id), window.location.href).href;
}
function whatsappShareUrl(x) {
  const pageUrl = opportunityUrl(x);
  const text = [
    x.title,
    "Organisation: " + (x.organization || "Not specified"),
    "Category: " + (x.category || "Opportunity"),
    "Deadline: " + niceDate(x.deadline),
    "",
    "View this opportunity on IMI DIGITAL HUB:",
    pageUrl
  ].join("\n");
  return "https://wa.me/?text=" + encodeURIComponent(text);
}
function telegramShareUrl(x) {
  const pageUrl = opportunityUrl(x);
  const text = [
    x.title,
    "Organisation: " + (x.organization || "Not specified"),
    "Category: " + (x.category || "Opportunity"),
    "Deadline: " + niceDate(x.deadline),
    "",
    "View this opportunity on IMI DIGITAL HUB:",
    pageUrl
  ].join("\n");
  return "https://t.me/share/url?url=" + encodeURIComponent(pageUrl) + "&text=" + encodeURIComponent(text);
}
function facebookShareUrl(x) {
  const pageUrl = opportunityUrl(x);
  const quote = [
    x.title,
    "Organisation: " + (x.organization || "Not specified"),
    "Category: " + (x.category || "Opportunity"),
    "Deadline: " + niceDate(x.deadline),
    "Find this opportunity on IMI DIGITAL HUB."
  ].join("\n");
  return "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageUrl) + "&quote=" + encodeURIComponent(quote);
}
function filteredItems() {
  return opportunities.filter(x =>
    (!x.deadline || x.deadline >= localToday()) &&
    (category === "All" || x.category === category) &&
    (!query || [x.title,x.organization,x.category,x.description,x.location].join(" ").toLowerCase().includes(query)) &&
    (!locationFilter || x.location === locationFilter || (locationFilter === "International" && x.location !== "Nigeria"))
  );
}
function render() {
  let items = filteredItems();
  if (document.getElementById("sortFilter").value === "title") items.sort((a,b) => a.title.localeCompare(b.title));
  grid.innerHTML = items.map(x => {
    const details = [x.location, x.employment_type].filter(Boolean).map(escapeHtml).join(" • ");
    const link = x.application_url || x.source_url;
    return `<article class="opp-card">
      <div class="opp-top"><span class="tag">${escapeHtml(x.category)}</span><span class="demo-tag" style="background:#e7f7ed;color:#176b3a">PUBLISHED</span></div>\n      ${x.image_url ? `<img class="opp-image" src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}" loading="lazy" style="width:100%;max-height:240px;object-fit:cover;border-radius:10px;margin:10px 0;">` : ""}
      <h3>${escapeHtml(x.title)}</h3><div class="org">${escapeHtml(x.organization)}</div>
      <div class="opp-meta"><span>⌖ ${details || "Details on listing"}</span></div>
      <p>${escapeHtml(x.description).slice(0,260)}${x.description && x.description.length>260 ? "…" : ""}</p>
      ${x.salary_or_funding ? `<p><strong>Salary / funding:</strong> ${escapeHtml(x.salary_or_funding)}</p>` : ""}
      ${x.eligibility ? `<p><strong>Eligibility:</strong> ${escapeHtml(x.eligibility)}</p>` : ""}
      ${x.benefits ? `<p><strong>Benefits:</strong> ${escapeHtml(x.benefits)}</p>` : ""}
      ${x.application_instructions ? `<p><strong>How to apply:</strong> ${escapeHtml(x.application_instructions)}</p>` : ""}
      <div class="opp-bottom"><span class="deadline">Deadline: ${niceDate(x.deadline)}</span><a class="details-link" href="${escapeHtml(opportunityUrl(x))}">View details ↗</a>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a>` : ""}</div><a class="whatsapp-share" href="${escapeHtml(whatsappShareUrl(x))}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on WhatsApp">↗ Share on WhatsApp</a><a class="telegram-share" href="${escapeHtml(telegramShareUrl(x))}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Telegram">↗ Share on Telegram</a><a class="facebook-share" href="${escapeHtml(facebookShareUrl(x))}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Facebook">↗ Share on Facebook</a>
    </article>`;
  }).join("");
  empty.hidden = items.length !== 0;
  grid.hidden = items.length === 0;
  document.getElementById("resultCount").textContent = `${items.length} available opportunit${items.length===1?"y":"ies"}`;
}
function setCategory(value) {
  category = value;
  document.querySelectorAll("[data-category]").forEach(b => b.classList.toggle("selected", b.classList.contains("chip") && b.dataset.category === value));
  document.querySelectorAll(".category").forEach(b => b.classList.toggle("active", b.dataset.category === value));
  render();
}
function renderFeatured() {
  const featured = opportunities.filter(x => x.is_featured && (!x.deadline || x.deadline >= localToday()));
  featuredSection.hidden = featured.length === 0;
  featuredGrid.innerHTML = featured.map(x => {
    const link = x.application_url || x.source_url;
    const details = [x.location, x.employment_type].filter(Boolean).map(escapeHtml).join(" • ");
    return `<article class="opp-card">
      <div class="opp-top"><span class="tag">${escapeHtml(x.category)}</span><span class="demo-tag" style="background:#fff5df;color:#8a641c">★ FEATURED</span></div>
      ${x.image_url ? `<img class="opp-image" src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}" loading="lazy" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin:10px 0;">` : ""}
      <h3>${escapeHtml(x.title)}</h3><div class="org">${escapeHtml(x.organization)}</div>
      <div class="opp-meta"><span>⌖ ${details || "Details on listing"}</span></div>
      <p>${escapeHtml(x.description).slice(0,220)}${x.description && x.description.length>220 ? "…" : ""}</p>
      <div class="opp-bottom"><span class="deadline">Deadline: ${niceDate(x.deadline)}</span><a class="details-link" href="${escapeHtml(opportunityUrl(x))}">View details ↗</a>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a>` : ""}</div><a class="whatsapp-share" href="${escapeHtml(whatsappShareUrl(x))}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on WhatsApp">↗ Share on WhatsApp</a><a class="telegram-share" href="${escapeHtml(telegramShareUrl(x))}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Telegram">↗ Share on Telegram</a><a class="facebook-share" href="${escapeHtml(facebookShareUrl(x))}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Facebook">↗ Share on Facebook</a>
    </article>`;
  }).join("");
}
async function loadOpportunities() {
  grid.innerHTML = '<p>Loading published opportunities…</p>';
  const { data, error } = await supabaseClient.from("opportunities").select("id,title,organization,category,location,employment_type,description,eligibility,salary_or_funding,benefits,application_instructions,image_url,application_url,source_url,deadline,created_at,is_featured").eq("is_published", true).order("created_at", {ascending:false});
  if (error) {
    grid.innerHTML = '<p>We could not load opportunities right now. Please refresh the page later.</p>';
    document.getElementById("resultCount").textContent = "Unable to load listings";
    console.error("Supabase listing error:", error.message);
    return;
  }
  opportunities = data || [];
  renderFeatured();
  render();
}
document.querySelectorAll("[data-category]").forEach(b => b.addEventListener("click", () => setCategory(b.dataset.category)));
document.getElementById("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  query = document.getElementById("searchInput").value.trim().toLowerCase();
  locationFilter = document.getElementById("locationFilter").value;
  render();
  document.getElementById("opportunities").scrollIntoView({behavior:"smooth"});
});
document.getElementById("sortFilter").addEventListener("change", render);
document.getElementById("clearFilters").addEventListener("click", () => {
  query = ""; locationFilter = ""; category = "All";
  document.getElementById("searchInput").value = "";
  document.getElementById("locationFilter").value = "";
  setCategory("All");
});
document.getElementById("menuBtn").addEventListener("click", () => document.querySelector("nav").classList.toggle("open"));
document.querySelectorAll("nav a").forEach(a => a.addEventListener("click", () => document.querySelector("nav").classList.remove("open")));
document.getElementById("year").textContent = new Date().getFullYear();
loadOpportunities();
