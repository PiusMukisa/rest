create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(btrim(sender_name)) between 1 and 100),
  email text not null check (
    char_length(email) <= 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  subject text check (subject is null or char_length(subject) <= 160),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text check (donor_name is null or char_length(donor_name) <= 100),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reference text not null check (char_length(btrim(reference)) between 1 and 120),
  donated_on date not null,
  notes text check (notes is null or char_length(notes) <= 500),
  recorded_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_delivery_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0)
);

alter table public.contact_delivery_limits enable row level security;
revoke all on public.contact_delivery_limits from public, anon, authenticated;

create or replace function public.consume_contact_delivery_limit(
  p_ip_hash text,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'
    or p_limit is null or p_limit < 1 or p_limit > 10 then
    raise exception 'Invalid contact-message rate-limit parameters'
      using errcode = '22023';
  end if;

  delete from public.contact_delivery_limits
  where window_started_at < now() - interval '24 hours';

  insert into public.contact_delivery_limits as limits (ip_hash)
  values (p_ip_hash)
  on conflict (ip_hash) do update
  set
    window_started_at = case
      when limits.window_started_at <= now() - interval '1 hour' then now()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= now() - interval '1 hour' then 1
      else least(limits.request_count + 1, p_limit + 1)
    end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_contact_delivery_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_delivery_limit(text, integer) to service_role;

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx
  on public.contact_messages (status);
create index if not exists donations_donated_on_idx
  on public.donations (donated_on desc);

create or replace function public.limit_public_contact_submissions()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  recent_submissions integer;
begin
  if auth.uid() is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(lower(new.email), 0)
    );

    select count(*)::integer
    into recent_submissions
    from public.contact_messages
    where lower(email) = lower(new.email)
      and created_at > now() - interval '1 hour';

    if recent_submissions >= 5 then
      raise exception 'Contact message submission limit reached'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.limit_public_contact_submissions() from public;
grant execute on function public.limit_public_contact_submissions() to anon, authenticated;

drop trigger if exists limit_public_contact_submissions on public.contact_messages;
create trigger limit_public_contact_submissions
  before insert on public.contact_messages
  for each row execute function public.limit_public_contact_submissions();

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_updated_at on public.site_content;
create trigger site_content_updated_at
  before update on public.site_content
  for each row execute function public.set_site_content_updated_at();

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create or replace function public.admin_donation_stats()
returns table (currency text, total numeric, contribution_count bigint)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_site_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
    select d.currency, sum(d.amount), count(*)
    from public.donations as d
    group by d.currency
    order by d.currency;
end;
$$;

revoke all on function public.admin_donation_stats() from public;
grant execute on function public.admin_donation_stats() to authenticated;

alter table public.site_content enable row level security;
alter table public.admins enable row level security;
alter table public.contact_messages enable row level security;
alter table public.donations enable row level security;

drop policy if exists "Public can read website content" on public.site_content;
create policy "Public can read website content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can add website content" on public.site_content;
create policy "Admins can add website content"
  on public.site_content for insert
  to authenticated
  with check (public.is_site_admin());

drop policy if exists "Admins can update website content" on public.site_content;
create policy "Admins can update website content"
  on public.site_content for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "Public can submit contact messages" on public.contact_messages;
create policy "Public can submit contact messages"
  on public.contact_messages for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_site_admin());

drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages"
  on public.contact_messages for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "Admins can delete contact messages" on public.contact_messages;
create policy "Admins can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (public.is_site_admin());

drop policy if exists "Admins can manage donations" on public.donations;
create policy "Admins can manage donations"
  on public.donations for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant usage on schema public to anon, authenticated;
grant usage on schema public to service_role;
grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;
grant insert (sender_name, email, subject, message) on public.contact_messages to anon, authenticated;
grant select, update (status), delete on public.contact_messages to authenticated;
grant select, delete on public.donations to authenticated;
grant insert (donor_name, amount, currency, reference, donated_on, notes) on public.donations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "Admins can upload site images" on storage.objects;
create policy "Admins can upload site images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images' and public.is_site_admin());

drop policy if exists "Admins can update site images" on storage.objects;
create policy "Admins can update site images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-images' and public.is_site_admin())
  with check (bucket_id = 'site-images' and public.is_site_admin());

insert into public.site_content (key, value)
values
  ('logo_path', ''),
  ('home_pastor_image', ''),
  ('home_mission_image', ''),
  ('home_gallery_outreach_image', ''),
  ('home_gallery_care_image', ''),
  ('home_gallery_baptism_image', ''),
  ('home_gallery_children_image', ''),
  ('about_evangelism_image', ''),
  ('about_outreach_image', ''),
  ('about_fellowship_image', ''),
  ('about_faith_image', ''),
  ('about_pastor_image', ''),
  ('pastor_video_url', 'https://www.tiktok.com/@muwayifaizal/video/7704317331232607495?is_from_webapp=1&sender_device=pc'),
  ('home_intro', ''),
  ('about_intro', ''),
  ('vision', ''),
  ('mission', ''),
  ('contact_email', 'restchurh37@gmail.com'),
  ('contact_phone', '0757885829'),
  ('address', ''),
  ('bank_name', 'ABSA Bank'),
  ('bank_code', ''),
  ('account_name', 'Living in Rest church Ministries'),
  ('account_number', '60 09 19 76 97'),
  ('account_type', ''),
  ('payment_reference', ''),
  ('payment_instructions', 'For the church land appeal, use the reference “Church land” where possible. Confirm the details with the church before sending a transfer.')
on conflict (key) do nothing;
