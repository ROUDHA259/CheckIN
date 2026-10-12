create table if not exists public.checkins (
  email text primary key,
  arrived boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.checkins enable row level security;

-- Suitable for a private event URL. Add Supabase Auth before using this on a public site.
create policy "Public can read check-ins"
on public.checkins for select
to anon
using (true);

create policy "Public can add check-ins"
on public.checkins for insert
to anon
with check (true);

create policy "Public can update check-ins"
on public.checkins for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.checkins;
