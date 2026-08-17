-- =====================================================================
--  ORT RANKINGS — esquema completo de Supabase
--  ---------------------------------------------------------------------
--  Cómo usarlo:
--    1. Entrá a tu proyecto en supabase.com
--    2. Menú lateral → SQL Editor → New query
--    3. Pegá TODO este archivo y apretá "Run"
--
--  Es idempotente: podés correrlo más de una vez sin romper nada.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  TABLAS
-- ---------------------------------------------------------------------

-- Perfiles publicados en el ranking
create table if not exists public.rankings (
  id               uuid primary key default gen_random_uuid(),
  puesto           integer,                  -- null = todavía SIN PUESTO ASIGNADO
  puesto_anterior  integer,                  -- null = ingreso nuevo (chapa "NUEVO")
  nombre           text        not null,
  tagline          text,
  carrera          text,
  instagram        text,
  dato             text,
  foto_perfil      text,
  foto_frente      text,
  votos            integer     not null default 0,
  activo           boolean     not null default true,
  creado           timestamptz not null default now()
);
create index if not exists rankings_puesto_idx on public.rankings (puesto);

-- Solicitudes de ingreso enviadas desde /entrar
create table if not exists public.solicitudes (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  numero_estudiante  text not null,          -- PRIVADO: nunca se expone al público
  carrera            text not null,
  instagram          text,
  dato               text,
  foto_perfil        text not null,
  foto_frente        text not null,
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente', 'aceptada', 'rechazada')),
  nota_admin         text,
  creado             timestamptz not null default now()
);
create index if not exists solicitudes_estado_idx on public.solicitudes (estado, creado);

-- Votos de la comunidad (uno por perfil y por navegador)
create table if not exists public.votos (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.rankings (id) on delete cascade,
  votante    text not null,
  creado     timestamptz not null default now(),
  unique (perfil_id, votante)
);

-- Pedidos de baja / reportes desde el perfil
create table if not exists public.reportes (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid references public.rankings (id) on delete cascade,
  tipo       text not null default 'baja',
  mensaje    text,
  contacto   text,
  creado     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  El contador de votos se mantiene solo
-- ---------------------------------------------------------------------

create or replace function public.sync_votos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  objetivo uuid := coalesce(new.perfil_id, old.perfil_id);
begin
  update public.rankings
     set votos = (select count(*) from public.votos where perfil_id = objetivo)
   where id = objetivo;
  return null;
end;
$$;

drop trigger if exists trg_sync_votos on public.votos;
create trigger trg_sync_votos
  after insert or delete on public.votos
  for each row execute function public.sync_votos();

-- ---------------------------------------------------------------------
--  ROW LEVEL SECURITY
--  Esto es lo que hace que la clave "anon" (pública, visible en el
--  navegador) no pueda leer datos privados ni tocar el ranking.
-- ---------------------------------------------------------------------

alter table public.rankings    enable row level security;
alter table public.solicitudes enable row level security;
alter table public.votos       enable row level security;
alter table public.reportes    enable row level security;

-- ---- rankings: lectura pública de los activos, escritura solo admin ----
drop policy if exists "rankings lectura publica" on public.rankings;
create policy "rankings lectura publica" on public.rankings
  for select to anon, authenticated
  using (activo);

drop policy if exists "rankings admin" on public.rankings;
create policy "rankings admin" on public.rankings
  for all to authenticated
  using (true) with check (true);

-- ---- solicitudes: cualquiera envía, SOLO el admin puede leer -----------
-- (esto es lo que protege el número de estudiante)
drop policy if exists "solicitudes envio publico" on public.solicitudes;
create policy "solicitudes envio publico" on public.solicitudes
  for insert to anon, authenticated
  with check (estado = 'pendiente');

drop policy if exists "solicitudes admin lee" on public.solicitudes;
create policy "solicitudes admin lee" on public.solicitudes
  for select to authenticated using (true);

drop policy if exists "solicitudes admin edita" on public.solicitudes;
create policy "solicitudes admin edita" on public.solicitudes
  for update to authenticated using (true) with check (true);

drop policy if exists "solicitudes admin borra" on public.solicitudes;
create policy "solicitudes admin borra" on public.solicitudes
  for delete to authenticated using (true);

-- ---- votos --------------------------------------------------------------
drop policy if exists "votos insert publico" on public.votos;
create policy "votos insert publico" on public.votos
  for insert to anon, authenticated with check (true);

drop policy if exists "votos lectura publica" on public.votos;
create policy "votos lectura publica" on public.votos
  for select to anon, authenticated using (true);

drop policy if exists "votos admin borra" on public.votos;
create policy "votos admin borra" on public.votos
  for delete to authenticated using (true);

-- ---- reportes: cualquiera pide la baja, solo el admin los lee -----------
drop policy if exists "reportes insert publico" on public.reportes;
create policy "reportes insert publico" on public.reportes
  for insert to anon, authenticated with check (true);

drop policy if exists "reportes admin lee" on public.reportes;
create policy "reportes admin lee" on public.reportes
  for select to authenticated using (true);

drop policy if exists "reportes admin borra" on public.reportes;
create policy "reportes admin borra" on public.reportes
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
--  STORAGE — bucket público "fotos"
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos lectura publica" on storage.objects;
create policy "fotos lectura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fotos');

drop policy if exists "fotos subida publica" on storage.objects;
create policy "fotos subida publica" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'fotos');

drop policy if exists "fotos admin borra" on storage.objects;
create policy "fotos admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos');

-- =====================================================================
--  LISTO.
--  Último paso, desde el panel de Supabase (no por SQL):
--    Authentication → Users → "Add user" → tu email y contraseña.
--    Ese es el usuario con el que entrás a ortrankings.github.io/admin
--
--  Y desactivá el registro abierto para que nadie más se cree un admin:
--    Authentication → Providers → Email → "Allow new users to sign up" = OFF
-- =====================================================================
