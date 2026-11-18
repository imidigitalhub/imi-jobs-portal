const db = window.supabase.createClient(window.IMI_SUPABASE_URL, window.IMI_SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const form = $("publicSubmitForm");
const button = $("submitButton");
function showMessage(message, success=false) {
  const box=$("submitMessage");box.hidden=false;box.textContent=message;
  box.style.background=success?"#e8f8ef":"#fff4e5";
}
function validHttpUrl(value) {
  if (!value) return true;
  try { const url=new URL(value); return url.protocol==="https:" || url.protocol==="http:"; } catch { return false; }
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if ($("website").value) return;
  const source=$("source_url").value.trim();
  const application=$("application_url").value.trim();
  if(!validHttpUrl(source)||!validHttpUrl(application)){showMessage("Please enter valid website links beginning with https:// or http://.");return;}
  button.disabled=true;button.textContent="Sending for review…";
  const payload={
    title:$("title").value.trim(),
    organization:$("organization").value.trim(),
    category:$("category").value,
    location:$("location").value.trim()||null,
    employment_type:$("employment_type").value.trim()||null,
    deadline:$("deadline").value||null,
    description:$("description").value.trim(),
    source_url:source,
    application_url:application||null,
    application_instructions:$("application_instructions").value.trim()||null,
    contributor_name:$("contributor_name").value.trim(),
    submission_status:"pending",
    is_published:false,
    is_featured:false
  };
  const {error}=await db.from("opportunities").insert(payload);
  if(error){
    console.error("Public opportunity submission failed:",error.message);
    showMessage("We could not send your submission right now. Please check the details and try again. If the problem continues, contact the portal team.");
    button.disabled=false;button.textContent="Send for admin approval";return;
  }
  form.reset();
  showMessage("Thank you! Your opportunity has been submitted successfully and is now Pending Approval. It will only appear on the portal after the admin team verifies and approves it.",true);
  button.disabled=false;button.textContent="Send for admin approval";
});
const menuButton=$("menuBtn"),nav=$("mainNav");
menuButton.addEventListener("click",()=>{const open=nav.classList.toggle("open");menuButton.setAttribute("aria-expanded",String(open));menuButton.setAttribute("aria-label",open?"Close menu":"Open menu");});
$("year").textContent=new Date().getFullYear();