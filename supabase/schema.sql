-- =====================================================================
--  ORT RANKINGS — esquema completo de Supabase
--  ---------------------------------------------------------------------
--  Cómo usarlo:
--    1. Entrá a tu proyecto en supabase.com
--    2. Menú lateral → SQL Editor → New query
--    3. Pegá TODO este archivo y apretá "Run"
--
--  Es idempotente: podés correrlo más de una vez sin romper nada, incluso
--  sobre una base que ya tenía la versión anterior de este esquema.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  TABLAS
-- ---------------------------------------------------------------------

-- Perfiles publicados en el ranking. El PUESTO LO ASIGNA EL ADMIN a mano:
-- ni los votos ni el score lo mueven, esos son informativos.
create table if not exists public.rankings (
  id                  uuid primary key default gen_random_uuid(),
  puesto              integer,                  -- lo asigna el admin; null = sin puesto
  puesto_anterior     integer,                  -- null = ingreso nuevo (chapa "NUEVO")
  nombre              text        not null,
  tagline             text,
  etiqueta_principal  text,                     -- destacada en dorado junto al nombre
  etiquetas           text[]      not null default '{}', -- chips de colores libres
  carrera             text,
  instagram           text,
  dato                text,
  foto_frente         text,                     -- la que se publica
  foto_alt            text,                     -- la otra, guardada para poder intercambiarlas
  votos               integer     not null default 0,
  puntaje             integer     not null default 0,
  activo              boolean     not null default true,
  creado              timestamptz not null default now()
);

-- Si la base ya tenía una versión vieja del esquema, la actualiza en el lugar.
alter table public.rankings add column if not exists puntaje integer not null default 0;
alter table public.rankings add column if not exists etiqueta_principal text;
alter table public.rankings add column if not exists etiquetas text[] not null default '{}';
alter table public.rankings add column if not exists foto_alt text;

-- Influence Breakdown: puntaje MANUAL que carga el admin, 6 categorías que suman
-- sobre 100. Es informativo: NO define el puesto (ese sale de los votos).
alter table public.rankings add column if not exists sc_aesthetics     integer not null default 0;
alter table public.rankings add column if not exists sc_frame          integer not null default 0;
alter table public.rankings add column if not exists sc_facial_harmony integer not null default 0;
alter table public.rankings add column if not exists sc_status         integer not null default 0;
alter table public.rankings add column if not exists sc_consistency    integer not null default 0;
alter table public.rankings add column if not exists sc_momentum       integer not null default 0;
alter table public.rankings add column if not exists puesto integer;
alter table public.rankings add column if not exists copes integer not null default 0;

-- Corona de campeón: se la deja puesta el admin al que gana el semestre.
-- Es permanente, no depende del puesto actual.
alter table public.rankings add column if not exists campeon text;
alter table public.rankings drop column if exists foto_perfil;
create index if not exists rankings_puesto_idx on public.rankings (puesto);

-- Solicitudes de ingreso enviadas desde /entrar
create table if not exists public.solicitudes (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  numero_estudiante  text not null,          -- PRIVADO: nunca se expone al público
  carrera            text not null,
  instagram          text,
  dato               text,
  foto_perfil        text not null,          -- solo para evaluar, nunca se publica
  foto_frente        text not null,
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente', 'aceptada', 'rechazada')),
  nota_admin         text,
  creado             timestamptz not null default now()
);
create index if not exists solicitudes_estado_idx on public.solicitudes (estado, creado);

-- Votos de la comunidad (uno por perfil y por navegador). Solo se insertan
-- desde la Edge Function "votar", nunca directo desde el navegador.
create table if not exists public.votos (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.rankings (id) on delete cascade,
  votante    text not null,
  ip         text,
  creado     timestamptz not null default now(),
  unique (perfil_id, votante)
);
alter table public.votos add column if not exists ip text;

-- "Cope": el dislike con justificación. Sin foto. Resta puntaje y queda
-- para que el admin lo lea en el panel. Solo vía la Edge Function "votar".
create table if not exists public.copes (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.rankings (id) on delete cascade,
  mensaje    text not null,
  votante    text not null,
  ip         text,
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

-- Límite de intentos por IP y por día, para votos y copes. Lo usa
-- exclusivamente la Edge Function; el navegador nunca la toca.
create table if not exists public.intentos_ip (
  ip         text not null,
  ambito     text not null check (ambito in ('voto', 'cope')),
  dia        date not null default current_date,
  cantidad   integer not null default 0,
  primary key (ip, ambito, dia)
);

-- ---------------------------------------------------------------------
--  El contador de votos y el puntaje se mantienen solos
-- ---------------------------------------------------------------------

-- Cuántos votos tiene cada perfil, para mostrarlo en el sitio.
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

-- Puntaje: cada voto suma, cada cope resta. El puesto del ranking sale
-- siempre de ordenar por esta columna, nunca se asigna a mano.
create or replace function public.sumar_puntaje_voto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rankings set puntaje = puntaje + 20 where id = new.perfil_id;
  return null;
end;
$$;

drop trigger if exists trg_puntaje_voto on public.votos;
create trigger trg_puntaje_voto
  after insert on public.votos
  for each row execute function public.sumar_puntaje_voto();

-- Cuántos COPE tiene cada perfil. Se usa para el neto (votos menos copes)
-- que decide cuánto se mueve del puesto base.
create or replace function public.sync_copes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  objetivo uuid := coalesce(new.perfil_id, old.perfil_id);
begin
  update public.rankings
     set copes = (select count(*) from public.copes where perfil_id = objetivo)
   where id = objetivo;
  return null;
end;
$$;

drop trigger if exists trg_sync_copes on public.copes;
create trigger trg_sync_copes
  after insert or delete on public.copes
  for each row execute function public.sync_copes();

create or replace function public.restar_puntaje_cope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rankings set puntaje = puntaje - 20 where id = new.perfil_id;
  return null;
end;
$$;

drop trigger if exists trg_puntaje_cope on public.copes;
create trigger trg_puntaje_cope
  after insert on public.copes
  for each row execute function public.restar_puntaje_cope();

-- ---------------------------------------------------------------------
--  ROW LEVEL SECURITY
--  Esto es lo que hace que la clave "anon" (pública, visible en el
--  navegador) no pueda leer datos privados ni tocar el ranking.
-- ---------------------------------------------------------------------

alter table public.rankings    enable row level security;
alter table public.solicitudes enable row level security;
alter table public.votos       enable row level security;
alter table public.copes       enable row level security;
alter table public.reportes    enable row level security;
alter table public.intentos_ip enable row level security;

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

-- ---- votos: SIN acceso público. Solo entran por la Edge Function, que -----
-- usa la clave service_role y por lo tanto se salta estas políticas.
-- El navegador ya no puede insertar un voto por su cuenta.
drop policy if exists "votos insert publico" on public.votos;
drop policy if exists "votos lectura publica" on public.votos;

drop policy if exists "votos admin lee" on public.votos;
create policy "votos admin lee" on public.votos
  for select to authenticated using (true);

drop policy if exists "votos admin borra" on public.votos;
create policy "votos admin borra" on public.votos
  for delete to authenticated using (true);

-- ---- copes: mismo criterio. Solo la Edge Function inserta, solo el admin lee --
drop policy if exists "copes admin lee" on public.copes;
create policy "copes admin lee" on public.copes
  for select to authenticated using (true);

drop policy if exists "copes admin borra" on public.copes;
create policy "copes admin borra" on public.copes
  for delete to authenticated using (true);

-- ---- intentos_ip: tabla interna, nadie del público la toca -------------
-- (sin políticas de anon a propósito: solo la Edge Function, vía service_role)

-- ---- reportes: cualquiera pide la baja, solo el admin los lee -----------
drop policy if exists "reportes insert publico" on public.reportes;
create policy "reportes insert publico" on public.reportes
  for insert to anon, authenticated
  with check (true);

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
--
--  Para que voten y copeen de verdad hace falta además desplegar la
--  Edge Function "votar" (carpeta supabase/functions/votar) y cargar el
--  secreto de Cloudflare Turnstile. Ver README.md, sección "Votos y cope".
-- =====================================================================
