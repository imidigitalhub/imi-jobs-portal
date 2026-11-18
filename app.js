const supabaseClient = window.supabase.createClient(window.IMI_SUPABASE_URL, window.IMI_SUPABASE_PUBLISHABLE_KEY);
let category = "All", query = "", locationFilter = "", employmentFilter = "", opportunities = [];
let visibleLimit = 9;
const pageSize = 9;
let savedOnly = false;
let savedIds = [];
try { savedIds = JSON.parse(localStorage.getItem("imiSavedOpportunities") || "[]"); } catch { savedIds = []; }
if (!Array.isArray(savedIds)) savedIds = [];
function saveButton(x) {
  const isSaved = savedIds.includes(String(x.id));
  return `<button class="save-opportunity-btn${isSaved ? " is-saved" : ""}" type="button" data-save-id="${escapeHtml(x.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove saved opportunity" : "Save opportunity"}">${isSaved ? "★ Saved" : "☆ Save opportunity"}</button>`;
}
function updateSavedControl() {
  const button = document.getElementById("showSavedBtn");
  button.textContent = `Saved opportunities (${savedIds.length})`;
  button.setAttribute("aria-pressed", String(savedOnly));
  button.classList.toggle("active", savedOnly);
}
function toggleSaved(id) {
  id = String(id);
  savedIds = savedIds.includes(id) ? savedIds.filter(item => item !== id) : [...savedIds, id];
  try { localStorage.setItem("imiSavedOpportunities", JSON.stringify(savedIds)); } catch (error) { console.warn("Could not save bookmarks in this browser:", error); }
  updateSavedControl();
  render();
  renderFeatured();
}
const grid = document.getElementById("opportunityGrid");
const empty = document.getElementById("emptyState");
const featuredSection = document.getElementById("featuredSection");
const featuredGrid = document.getElementById("featuredGrid");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const niceDate = value => value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "Not specified";
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
function opportunityUrl(x) {
  return new URL("opportunities/" + encodeURIComponent(x.id) + "/", window.location.href).href;
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
  return opportunities.filter(x => {
    if (savedOnly && !savedIds.includes(String(x.id))) return false;
    const location = String(x.location || "").toLowerCase();
    const employment = String(x.employment_type || "").toLowerCase();
    const searchText = [x.title,x.organization,x.category,x.description,x.location,x.employment_type].join(" ").toLowerCase();
    const matchesLocation = !locationFilter ||
      (locationFilter === "Nigeria" && location.includes("nigeria")) ||
      (locationFilter === "Remote" && (location.includes("remote") || employment.includes("remote"))) ||
      (locationFilter === "International" && !location.includes("nigeria"));
    return (!x.deadline || x.deadline >= localToday()) &&
      (category === "All" || x.category === category) &&
      (!query || searchText.includes(query)) &&
      matchesLocation &&
      (!employmentFilter || employment === employmentFilter.toLowerCase());
  });
}
function render() {
  let items = filteredItems();
  const totalItems = items.length;
  const sortBy = document.getElementById("sortFilter").value;
  if (sortBy === "title") items.sort((a,b) => a.title.localeCompare(b.title));
  if (sortBy === "deadline") items.sort((a,b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  const visibleItems = items.slice(0, visibleLimit);
  grid.innerHTML = visibleItems.map(x => {
    const details = [x.location, x.employment_type].filter(Boolean).map(escapeHtml).join(" • ");
    const link = x.application_url || x.source_url;
    return `<article class="opp-card">
      <div class="opp-top"><span class="tag">${escapeHtml(x.category)}</span><span class="demo-tag" style="background:#e7f7ed;color:#176b3a">PUBLISHED</span></div>${saveButton(x)}\n      ${x.image_url ? `<img class="opp-image" src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}" loading="lazy" style="width:100%;max-height:240px;object-fit:cover;border-radius:10px;margin:10px 0;">` : ""}
      <h3>${escapeHtml(x.title)}</h3><div class="org">${escapeHtml(x.organization)}</div>
      <div class="opp-meta"><span>⌖ ${details || "Details on listing"}</span></div>
      <p>${escapeHtml(x.description).slice(0,260)}${x.description && x.description.length>260 ? "…" : ""}</p>
      ${x.salary_or_funding ? `<p><strong>Salary / funding:</strong> ${escapeHtml(x.salary_or_funding)}</p>` : ""}
      ${x.eligibility ? `<p><strong>Eligibility:</strong> ${escapeHtml(x.eligibility)}</p>` : ""}
      ${x.benefits ? `<p><strong>Benefits:</strong> ${escapeHtml(x.benefits)}</p>` : ""}
      ${x.application_instructions ? `<p><strong>How to apply:</strong> ${escapeHtml(x.application_instructions)}</p>` : ""}
      <div class="opp-bottom"><span class="deadline">Deadline: ${niceDate(x.deadline)}</span><a class="details-link" href="${escapeHtml(opportunityUrl(x))}">View details ↗</a>${link ? `<a href="${escapeHtml(link)}" data-analytics-event="application_click" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a>` : ""}</div><a class="whatsapp-share" href="${escapeHtml(whatsappShareUrl(x))}" data-analytics-event="share_whatsapp" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on WhatsApp">↗ Share on WhatsApp</a><a class="telegram-share" href="${escapeHtml(telegramShareUrl(x))}" data-analytics-event="share_telegram" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Telegram">↗ Share on Telegram</a><a class="facebook-share" href="${escapeHtml(facebookShareUrl(x))}" data-analytics-event="share_facebook" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Facebook">↗ Share on Facebook</a>
    </article>`;
  }).join("");
  empty.hidden = items.length !== 0;
  grid.hidden = items.length === 0;
  if (savedOnly && items.length === 0) { empty.querySelector("h3").textContent = "No saved opportunities yet"; empty.querySelector("p").textContent = "Tap Save opportunity on any listing to keep it here."; } else { empty.querySelector("h3").textContent = "No matching opportunities"; empty.querySelector("p").textContent = "Try another keyword or category."; }
  document.getElementById("resultCount").textContent = totalItems > visibleItems.length
    ? `Showing ${visibleItems.length} of ${totalItems} opportunities`
    : `${totalItems} available opportunit${totalItems===1?"y":"ies"}`;
  const loadMoreButton = document.getElementById("loadMoreBtn");
  loadMoreButton.hidden = visibleItems.length >= totalItems;
  loadMoreButton.textContent = `Load more opportunities (${totalItems - visibleItems.length} remaining)`;
  updateSavedControl();
}
function setCategory(value) {
  category = value;
  visibleLimit = pageSize;
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
      <div class="opp-top"><span class="tag">${escapeHtml(x.category)}</span><span class="demo-tag" style="background:#fff5df;color:#8a641c">★ FEATURED</span></div>${saveButton(x)}
      ${x.image_url ? `<img class="opp-image" src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.title)}" loading="lazy" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin:10px 0;">` : ""}
      <h3>${escapeHtml(x.title)}</h3><div class="org">${escapeHtml(x.organization)}</div>
      <div class="opp-meta"><span>⌖ ${details || "Details on listing"}</span></div>
      <p>${escapeHtml(x.description).slice(0,220)}${x.description && x.description.length>220 ? "…" : ""}</p>
      <div class="opp-bottom"><span class="deadline">Deadline: ${niceDate(x.deadline)}</span><a class="details-link" href="${escapeHtml(opportunityUrl(x))}">View details ↗</a>${link ? `<a href="${escapeHtml(link)}" data-analytics-event="application_click" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer">Apply / official source ↗</a>` : ""}</div><a class="whatsapp-share" href="${escapeHtml(whatsappShareUrl(x))}" data-analytics-event="share_whatsapp" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on WhatsApp">↗ Share on WhatsApp</a><a class="telegram-share" href="${escapeHtml(telegramShareUrl(x))}" data-analytics-event="share_telegram" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Telegram">↗ Share on Telegram</a><a class="facebook-share" href="${escapeHtml(facebookShareUrl(x))}" data-analytics-event="share_facebook" data-opportunity-id="${escapeHtml(x.id)}" data-opportunity-title="${escapeHtml(x.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share ${escapeHtml(x.title)} on Facebook">↗ Share on Facebook</a>
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
  const employmentSelect = document.getElementById("employmentFilter");
  const employmentTypes = [...new Set(opportunities.map(x => String(x.employment_type || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  employmentSelect.innerHTML = '<option value="">All types</option>' + employmentTypes.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
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
document.getElementById("searchInput").addEventListener("input", e => {
  query = e.target.value.trim().toLowerCase();
  visibleLimit = pageSize;
  render();
});
document.getElementById("locationFilter").addEventListener("change", e => { locationFilter = e.target.value; visibleLimit = pageSize; render(); });
document.getElementById("employmentFilter").addEventListener("change", e => { employmentFilter = e.target.value; visibleLimit = pageSize; render(); });
document.getElementById("sortFilter").addEventListener("change", () => { visibleLimit = pageSize; render(); });
document.getElementById("loadMoreBtn").addEventListener("click", () => { visibleLimit += pageSize; render(); });
document.getElementById("showSavedBtn").addEventListener("click", () => {
  savedOnly = !savedOnly;
  visibleLimit = pageSize;
  document.getElementById("opportunities").scrollIntoView({behavior:"smooth"});
  render();
});
[grid, featuredGrid].forEach(container => container.addEventListener("click", event => {
  const button = event.target.closest("[data-save-id]");
  if (button) toggleSaved(button.dataset.saveId);
}));
function clearAllFilters() {
  query = ""; locationFilter = ""; employmentFilter = ""; category = "All"; visibleLimit = pageSize; savedOnly = false;
  document.getElementById("searchInput").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("employmentFilter").value = "";
  document.getElementById("sortFilter").value = "newest";
  setCategory("All");
}
document.getElementById("clearFilters").addEventListener("click", clearAllFilters);
document.getElementById("clearFiltersTop").addEventListener("click", clearAllFilters);
const menuButton = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});
document.querySelectorAll("#mainNav a").forEach(a => a.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open menu");
}));
document.getElementById("year").textContent = new Date().getFullYear();
loadOpportunities();
