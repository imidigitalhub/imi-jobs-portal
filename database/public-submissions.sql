-- IMI DIGITAL HUB: visitor-submitted opportunities with admin approval
-- Run this in Supabase Dashboard > SQL Editor.

alter table public.opportunities
  add column if not exists contributor_name text,
  add column if not exists submission_status text not null default 'approved';

update public.opportunities
set submission_status = 'approved'
where submission_status is null;

alter table public.opportunities
  drop constraint if exists opportunities_submission_status_check;

alter table public.opportunities
  add constraint opportunities_submission_status_check
  check (submission_status in ('pending', 'approved', 'rejected'));

-- Visitors may submit rows, but they cannot publish or feature them.
grant insert on table public.opportunities to anon;

drop policy if exists "Anyone can submit pending opportunities" on public.opportunities;

create policy "Anyone can submit pending opportunities"
on public.opportunities
for insert
to anon
with check (
  submission_status = 'pending'
  and is_published = false
  and coalesce(is_featured, false) = false
  and contributor_name is not null
  and length(trim(contributor_name)) between 2 and 100
  and title is not null
  and length(trim(title)) between 3 and 180
  and organization is not null
  and length(trim(organization)) between 2 and 180
  and description is not null
  and length(trim(description)) between 20 and 10000
  and source_url is not null
  and source_url ~* '^https?://'
  and category in ('Jobs', 'Scholarships', 'Internships', 'Grants', 'Training')
);

-- Existing public read and administrator policies should remain in place.
-- Public visitors should only be able to read published records; admins can review all rows.
