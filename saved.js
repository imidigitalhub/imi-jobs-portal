const supabaseClient = window.supabase.createClient(window.IMI_SUPABASE_URL, window.IMI_SUPABASE_PUBLISHABLE_KEY);
const grid = document.getElementById("savedGrid");
const empty = document.getElementById("savedEmpty");
const status = document.getElementById("savedStatus");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const niceDate = value => value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "Not specified";
function readSavedIds() {
  try {
    const value = JSON.parse(localStorage.getItem("imiSavedOpportunities") || "[]");
    return Array.isArray(value) ? [...new Set(value.map(String))] : [];
  } catch { return []; }
}
function removeSaved(id) {
  const next = readSavedIds().filter(savedId => savedId !== String(id));
  try { localStorage.setItem("imiSavedOpportunities", JSON.stringify(next)); } catch (error) { console.warn("Could not update saved opportunities:", error); }
  renderSaved();
}
function renderSaved() {
  const savedIds = readSavedIds();
  const items = window.savedOpportunities.filter(item => savedIds.includes(String(item.id)));
  status.textContent = items.length ? items.length + (items.length === 1 ? " opportunity saved in this browser." : " opportunities saved in this browser.") : "";
  grid.innerHTML = items.map(item => {
    const details = [item.location, item.employment_type].filter(Boolean).map(escapeHtml).join(" • ");
    const applyUrl = item.application_url || item.source_url;
    const expired = item.deadline && item.deadline < new Date().toISOString().slice(0,10);
    return `<article class="opp-card">
      <div class="opp-top"><span class="tag">${escapeHtml(item.category || "Opportunity")}</span><span class="demo-tag">${expired ? "CHECK DEADLINE" : "SAVED"}</span></div>
      ${item.image_url ? `<img class="opp-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin:10px 0">` : ""}
      <h3>${escapeHtml(item.title)}</h3><div class="org">${escapeHtml(item.organization || "")}</div>
      <div class="opp-meta"><span>⌖ ${details || "Details on listing"}</span></div>
      <p>${escapeHtml(item.description).slice(0,240)}${item.description && item.description.length > 240 ? "…" : ""}</p>
      <div class="opp-bottom"><span class="deadline">Deadline: ${niceDate(item.deadline)}</span><a class="details-link" href="opportunities/${encodeURIComponent(item.id)}/">View details ↗</a>${applyUrl ? `<a href="${escapeHtml(applyUrl)}" target="_blank" rel="noopener noreferrer">Official source ↗</a>` : ""}</div>
      <button class="save-opportunity-btn is-saved" type="button" data-remove-id="${escapeHtml(item.id)}">★ Remove from saved</button>
    </article>`;
  }).join("");
  empty.hidden = items.length !== 0;
  grid.hidden = items.length === 0;
}
window.savedOpportunities = [];
async function loadSaved() {
  const ids = readSavedIds();
  if (!ids.length) { renderSaved(); return; }
  const {data,error} = await supabaseClient.from("opportunities").select("id,title,organization,category,location,employment_type,description,application_url,source_url,deadline,image_url").eq("is_published",true).in("id",ids);
  if (error) {
    status.textContent = "We could not load your saved opportunities. Please refresh and try again.";
    console.error("Supabase saved listing error:", error.message);
    return;
  }
  window.savedOpportunities = data || [];
  renderSaved();
}
grid.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-id]");
  if (button) removeSaved(button.dataset.removeId);
});
const menuButton = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});
document.getElementById("year").textContent = new Date().getFullYear();
loadSaved();
