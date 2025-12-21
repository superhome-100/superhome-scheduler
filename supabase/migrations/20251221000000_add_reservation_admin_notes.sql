create table if not exists public.reservation_admin_notes (
    reservation_id integer primary key references public.reservations(reservation_id) on delete cascade,
    admin_note text,
    updated_at timestamptz not null default now(),
    updated_by uuid references public.user_profiles(uid)
);

-- RLS
alter table public.reservation_admin_notes enable row level security;

-- Only admins can select, insert, update, delete
create policy admin_notes_admin_all
    on public.reservation_admin_notes
    for all
    using (public.is_admin())
    with check (public.is_admin());
