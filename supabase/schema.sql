-- DonAR: esquema inicial del MVP
-- Pegar completo en Supabase > SQL Editor > New query > Run.

-- ========== Enums ==========
create type cause_status as enum ('review', 'needs_info', 'active', 'rejected', 'completed', 'closed');
create type payout_method as enum ('mp', 'cbu');
create type identity_state as enum ('unverified', 'pending', 'verified', 'rejected');

-- ========== profiles (extiende auth.users) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  initials text,
  identity_status identity_state not null default 'unverified',
  points int not null default 0,
  is_curator boolean not null default false,
  display_name text,
  is_registered boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== causes (datos públicos de la causa) ==========
create table causes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  story text,
  goal_amount numeric not null check (goal_amount > 0),
  deadline date,
  status cause_status not null default 'review',
  emoji text default '💙',
  cover_tint text default '#CFE6FB',
  image_urls text[] not null default '{}',
  verified boolean not null default false,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ========== cause_payouts (dónde cobra, PRIVADO) ==========
create table cause_payouts (
  cause_id uuid primary key references causes(id) on delete cascade,
  method payout_method not null,
  alias text not null
);

-- ========== contributions (aportes) ==========
create table contributions (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references causes(id) on delete cascade,
  donor_id uuid references profiles(id) on delete set null,
  amount numeric not null check (amount > 0),
  message text,
  anonymous boolean not null default false,
  status text not null default 'approved', -- 'approved' (MP, instantáneo) | 'pending' (transferencia, esperando confirmación del beneficiado)
  method text not null default 'mp',        -- 'mp' | 'transfer'
  receipt_url text,                          -- comprobante de transferencia (path en el bucket transfer-receipts)
  created_at timestamptz not null default now()
);

-- ========== Vista con totales calculados (respeta RLS) ==========
create view causes_public with (security_invoker = true) as
select
  c.*,
  coalesce((select sum(ct.amount) from contributions ct
            where ct.cause_id = c.id and ct.status = 'approved'), 0) as raised_amount,
  (select count(*) from contributions ct
   where ct.cause_id = c.id and ct.status = 'approved') as contributors
from causes c;

-- ========== Row Level Security ==========
alter table profiles enable row level security;
alter table causes enable row level security;
alter table cause_payouts enable row level security;
alter table contributions enable row level security;

-- profiles: los lee cualquiera, cada uno edita el suyo
create policy "profiles readable" on profiles for select using (true);
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

-- causes: se leen las publicadas (o las propias, aunque estén en review); el dueño crea y edita
create policy "causes public read" on causes for select
  using (status in ('active','completed','closed') or owner_id = auth.uid());
create policy "causes insert own" on causes for insert with check (owner_id = auth.uid());
create policy "causes update own" on causes for update using (owner_id = auth.uid());

-- cause_payouts: SOLO el dueño de la causa (candado anti-bypass)
create policy "payouts owner read" on cause_payouts for select
  using (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));
create policy "payouts owner insert" on cause_payouts for insert
  with check (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));
create policy "payouts owner update" on cause_payouts for update
  using (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));

-- contributions: las lee cualquiera (recorrido del dinero), las crea un usuario logueado
create policy "contributions public read" on contributions for select using (true);
create policy "contributions insert" on contributions for insert
  with check (auth.uid() = donor_id or donor_id is null);

-- ========== Trigger: crear el profile al registrarse (email, Google, etc.) ==========
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario'),
    upper(substr(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'US'), 1, 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== Migraciones (correr solo lo nuevo en una base ya creada) ==========
-- 25 jul 2026: soporte de imagen ilustrativa en la causa.
alter table causes add column if not exists image_url text;

-- 26 jul 2026: curaduría real (deja de auto-aprobarse la causa al crearla).
-- Estados nuevos de la máquina de estados del flujo de verificación.
alter type cause_status add value if not exists 'needs_info';
alter type cause_status add value if not exists 'rejected';

-- Quién es curador. Por ahora, una persona (vos), marcada a mano después de
-- vincular tu mail real (ver instrucciones aparte).
alter table profiles add column if not exists is_curator boolean not null default false;

-- Motivo que deja el curador al pedir info o rechazar.
alter table causes add column if not exists review_note text;
alter table causes add column if not exists reviewed_at timestamptz;

-- Evidencia de la causa (DNI frente/dorso, selfie, documento de respaldo).
-- Tabla aparte, igual que cause_payouts: privada, no forma parte de causes_public.
create table if not exists cause_evidence (
  cause_id uuid primary key references causes(id) on delete cascade,
  dni_front_url text,
  dni_back_url text,
  selfie_url text,
  backup_doc_url text,
  updated_at timestamptz not null default now()
);
alter table cause_evidence enable row level security;

create policy "evidence owner read" on cause_evidence for select
  using (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));
create policy "evidence owner insert" on cause_evidence for insert
  with check (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));
create policy "evidence owner update" on cause_evidence for update
  using (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));
create policy "evidence curator read" on cause_evidence for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_curator));

-- El curador necesita leer y actualizar causas ajenas en revisión, y ver a
-- dónde se cobra (para verificar el destino del dinero). Políticas
-- adicionales: se suman (OR) a las que ya existían, no las reemplazan.
create policy "causes curator read" on causes for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_curator));
create policy "causes curator update" on causes for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_curator));
create policy "payouts curator read" on cause_payouts for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_curator));

-- Bucket privado para la evidencia. Nadie la lee salvo el dueño de la causa
-- y un curador.
insert into storage.buckets (id, name, public)
values ('cause-evidence', 'cause-evidence', false)
on conflict (id) do nothing;

create policy "evidence file insert own" on storage.objects for insert
  with check (bucket_id = 'cause-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence file select own" on storage.objects for select
  using (bucket_id = 'cause-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence file select curator" on storage.objects for select
  using (
    bucket_id = 'cause-evidence'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_curator)
  );

-- 26 jul 2026 (noche): fotos de portada opcionales (hasta 2), públicas.
-- Distintas de la evidencia: cualquiera las puede ver, es lo que se muestra
-- en el feed. image_url (una sola) se reemplaza por image_urls (array).
alter table causes add column if not exists image_urls text[] not null default '{}';
update causes set image_urls = array[image_url] where image_url is not null and image_urls = '{}';
alter table causes drop column if exists image_url;

insert into storage.buckets (id, name, public)
values ('cause-covers', 'cause-covers', true)
on conflict (id) do nothing;

create policy "cover file insert own" on storage.objects for insert
  with check (bucket_id = 'cause-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cover file public read" on storage.objects for select
  using (bucket_id = 'cause-covers');

-- 26 jul 2026 (ranking): identidad para el ranking mensual. Al vincular el mail,
-- el perfil se marca is_registered=true y guarda un display_name (derivado del
-- mail). Solo los registrados entran al ranking; los anónimos figuran como
-- 'Usuario' y quedan afuera. profiles ya es legible por cualquiera (RLS).
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists is_registered boolean not null default false;

-- 27 jul 2026 (fix foto de portada): el view causes_public usa `select c.*`,
-- que Postgres congela a la lista de columnas del momento en que se creó el
-- view. Columnas agregadas después (image_urls, review_note, reviewed_at) no
-- quedaron expuestas, así que la foto de portada nunca llegaba al feed/detalle.
-- Recrear el view re-expande c.* con las columnas actuales.
drop view if exists causes_public;
create view causes_public with (security_invoker = true) as
select
  c.*,
  coalesce((select sum(ct.amount) from contributions ct
            where ct.cause_id = c.id and ct.status = 'approved'), 0) as raised_amount,
  (select count(*) from contributions ct
   where ct.cause_id = c.id and ct.status = 'approved') as contributors
from causes c;

-- 27 jul 2026 (Épica 2: dos métodos de pago). Transferencia con comprobante.
-- El aporte por transferencia entra 'pending' (no cuenta para la meta hasta que
-- el beneficiado lo confirme; causes_public solo suma 'approved'). MP entra 'approved'.
alter table contributions add column if not exists method text not null default 'mp';
alter table contributions add column if not exists receipt_url text;

-- El donante necesita ver el alias/CBU del beneficiado para transferir. Se abre
-- la lectura de cause_payouts para causas ya publicadas (coherente con
-- "conectar sin custodiar": el destino del dinero es público). Las políticas de
-- dueño y curador ya existentes se mantienen (se suman con OR).
create policy "payouts public read for published" on cause_payouts for select
  using (exists (
    select 1 from causes c
    where c.id = cause_id and c.status in ('active', 'completed', 'closed')
  ));

-- Bucket privado para los comprobantes de transferencia. Lo lee el donante que
-- lo subió y el dueño de la causa (para confirmar en la Épica 3).
insert into storage.buckets (id, name, public)
values ('transfer-receipts', 'transfer-receipts', false)
on conflict (id) do nothing;

create policy "receipt insert own" on storage.objects for insert
  with check (bucket_id = 'transfer-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipt read own" on storage.objects for select
  using (bucket_id = 'transfer-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipt read cause owner" on storage.objects for select
  using (
    bucket_id = 'transfer-receipts'
    and exists (
      select 1 from contributions ct
      join causes c on c.id = ct.cause_id
      where c.owner_id = auth.uid() and ct.receipt_url = name
    )
  );

-- 27 jul 2026 (Épica 3: confirmación de transferencia). El dueño de la causa
-- necesita poder confirmar/rechazar una transferencia pendiente (cambiar su
-- status). Hoy no hay policy de UPDATE en contributions, así que RLS lo bloquea.
create policy "contributions cause owner update" on contributions for update
  using (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));
