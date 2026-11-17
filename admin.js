const db = window.supabase.createClient(window.IMI_SUPABASE_URL, window.IMI_SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function message(id,text){$(id).textContent=text;$(id).classList.remove("hidden");}
function clearMessage(id){$(id).textContent="";$(id).classList.add("hidden");}
async function isAdmin(user){const {data,error}=await db.from("portal_admins").select("user_id").eq("user_id",user.id).maybeSingle();return !error && !!data;}
async function showDashboard(user){
 if(!await isAdmin(user)){await db.auth.signOut();message("loginMessage","This account is not authorised as a portal administrator.");return;}
 $("loginPanel").classList.add("hidden");$("dashboard").classList.remove("hidden");await loadAdminListings();
}
async function loadAdminListings(){
 $("adminList").textContent="Loading listings…";
 const {data,error}=await db.from("opportunities").select("*").order("created_at",{ascending:false});
 if(error){$("adminList").textContent="Could not load listings: "+error.message;return;}
 if(!data.length){$("adminList").textContent="No opportunities have been added yet.";return;}
 $("adminList").innerHTML=data.map(x=>`<div class="admin-item"><div><strong>${safe(x.title)}</strong><p>${safe(x.category)} · ${safe(x.organization)} · ${x.is_published?"Published":"Draft"}</p></div><div class="admin-actions"><button class="admin-btn secondary" data-edit="${x.id}">Edit</button><button class="admin-btn secondary" data-toggle="${x.id}" data-published="${x.is_published}">${x.is_published?"Unpublish":"Publish"}</button><button class="admin-btn danger" data-delete="${x.id}">Delete</button></div></div>`).join("");
 $("adminList").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editListing(data.find(x=>x.id===b.dataset.edit))));
 $("adminList").querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>togglePublish(b.dataset.toggle,b.dataset.published==="true")));
 $("adminList").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteListing(b.dataset.delete)));
}
function editListing(x){$("recordId").value=x.id;$("title").value=x.title;$("organization").value=x.organization;$("category").value=x.category;$("location").value=x.location||"";$("employment_type").value=x.employment_type||"";$("deadline").value=x.deadline||"";$("description").value=x.description;$("application_url").value=x.application_url||"";$("source_url").value=x.source_url||"";$("eligibility").value=x.eligibility||"";$("salary_or_funding").value=x.salary_or_funding||"";$("benefits").value=x.benefits||"";$("application_instructions").value=x.application_instructions||"";$("is_published").checked=x.is_published;$("formHeading").textContent="Edit opportunity";window.scrollTo({top:0,behavior:"smooth"});}
function resetForm(){$("opportunityForm").reset();$("recordId").value="";$("formHeading").textContent="Add an opportunity";}
$("opportunityForm").addEventListener("submit",async e=>{e.preventDefault();clearMessage("adminMessage");const payload={title:$("title").value.trim(),organization:$("organization").value.trim(),category:$("category").value,location:$("location").value.trim()||null,employment_type:$("employment_type").value.trim()||null,deadline:$("deadline").value||null,description:$("description").value.trim(),application_url:$("application_url").value.trim()||null,source_url:$("source_url").value.trim()||null,eligibility:$("eligibility").value.trim()||null,salary_or_funding:$("salary_or_funding").value.trim()||null,benefits:$("benefits").value.trim()||null,application_instructions:$("application_instructions").value.trim()||null,is_published:$("is_published").checked,updated_at:new Date().toISOString()};
const id=$("recordId").value;const result=id?await db.from("opportunities").update(payload).eq("id",id):await db.from("opportunities").insert(payload);
if(result.error){message("adminMessage","Save failed: "+result.error.message);return;}message("adminMessage",id?"Opportunity updated.":"Opportunity added.");resetForm();await loadAdminListings();});
async function togglePublish(id,current){const {error}=await db.from("opportunities").update({is_published:!current,updated_at:new Date().toISOString()}).eq("id",id);if(error){message("adminMessage","Could not change publication status: "+error.message);return;}await loadAdminListings();}
async function deleteListing(id){if(!confirm("Permanently delete this opportunity?"))return;const {error}=await db.from("opportunities").delete().eq("id",id);if(error){message("adminMessage","Delete failed: "+error.message);return;}message("adminMessage","Opportunity deleted.");await loadAdminListings();}
$("resetForm").addEventListener("click",resetForm);
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();clearMessage("loginMessage");const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){message("loginMessage","Sign-in failed: "+error.message);return;}await showDashboard(data.user);});
$("signOut").addEventListener("click",async()=>{await db.auth.signOut();$("dashboard").classList.add("hidden");$("loginPanel").classList.remove("hidden");$("password").value="";});
(async()=>{const {data}=await db.auth.getSession();if(data.session)await showDashboard(data.session.user);})();