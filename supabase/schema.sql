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

-- 27 jul 2026 (aporte voluntario a la plataforma). MVP sin comisión: el donante
-- puede, opcionalmente, aportar a donAR "a voluntad" para bancar el proyecto.
-- Es ingreso propio de donAR (no fondos de terceros), y un experimento de
-- willingness-to-pay. Esta tabla registra el auto-reporte "ya colaboré" para
-- medir cuántos aportan (el importe real llega por transferencia directa al
-- alias de donAR, fuera de la app).
create table if not exists platform_support (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid references profiles(id) on delete set null,
  cause_id uuid references causes(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table platform_support enable row level security;
create policy "platform_support insert" on platform_support for insert
  with check (auth.uid() = supporter_id or supporter_id is null);
create policy "platform_support read own" on platform_support for select
  using (auth.uid() = supporter_id);

-- 29 jul 2026 (LOGIN OBLIGATORIO, cambio de modelo de identidad). Se abandonó
-- el modelo "sesión anónima por default + vincular mail opcional": generaba
-- sesiones huérfanas (causas sin dueño recuperable, donaciones invisibles al
-- cambiar de sesión). Ahora la app EXIGE cuenta (mail + contraseña) para todo:
-- donar, crear causa, recibir. Nada de sesiones anónimas.
--
-- PASOS MANUALES EN EL DASHBOARD DE SUPABASE (no son SQL, van en la UI):
--   1. Authentication > Sign In / Providers > Email: APAGAR "Confirm email".
--      Sin esto, signUp no loguea hasta confirmar el mail, y el mail de
--      confirmación hoy no se entrega (Resend sin dominio propio verificado).
--   2. (Opcional) Authentication > Providers: se puede desactivar "Anonymous
--      sign-ins", ya no se usan.
--
-- MIGRACIÓN DE LA CUENTA EXISTENTE DE GASTÓN (que se creó como anónima y se
-- "ascendió" con mail, sin contraseña): para poder entrar con el login nuevo
-- necesita una contraseña. Desde el dashboard: Authentication > Users >
-- (su usuario) > "Reset password" / "Send magic link", o setear una via el
-- Admin API. Alternativa simple para testing: crear una cuenta nueva con el
-- flujo de registro y, si hace falta, reasignar owner_id de sus causas a la
-- cuenta nueva (mismo patrón que la reasignación de "Me muero de hambre").

-- 29 jul 2026 (Épica 4: cierre de causa). El enum cause_status ya traía
-- 'completed' (cumplida, llegó a la meta) y 'closed' (cerrada sin llegar,
-- venció el plazo) desde el día 1; lo que faltaba era disparar el cierre y
-- darle al beneficiado un mensaje de cierre + agradecimiento.
alter table causes add column if not exists closed_at timestamptz;
alter table causes add column if not exists closing_message text;
alter table causes add column if not exists closing_photo_url text;

-- Agradecimiento puntual del beneficiado a un donante/aporte específico.
-- Igual que las contributions, se lee públicamente (transparencia del
-- recorrido): el donante necesita poder ver que le agradecieron. Solo el
-- dueño de la causa lo escribe.
create table if not exists cause_thanks (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references causes(id) on delete cascade,
  contribution_id uuid not null references contributions(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
alter table cause_thanks enable row level security;

create policy "thanks public read" on cause_thanks for select using (true);
create policy "thanks owner insert" on cause_thanks for insert
  with check (exists (select 1 from causes c where c.id = cause_id and c.owner_id = auth.uid()));

-- Recrear el view (mismo motivo que el fix del 27 jul: `select c.*` congela la
-- lista de columnas al momento del create, las agregadas después no quedan
-- expuestas sin recrearlo).
drop view if exists causes_public;
create view causes_public with (security_invoker = true) as
select
  c.*,
  coalesce((select sum(ct.amount) from contributions ct
            where ct.cause_id = c.id and ct.status = 'approved'), 0) as raised_amount,
  (select count(*) from contributions ct
   where ct.cause_id = c.id and ct.status = 'approved') as contributors
from causes c;

-- 29 jul 2026 (3.4: kudos al donante). Hasta ahora solo había created_at (el
-- momento del aporte original); no había forma de distinguir "recién te lo
-- confirmaron" de un aporte viejo ya aprobado hace días. contributions no
-- vive detrás de un view (se lee directo con RLS), así que esta columna
-- queda expuesta sin recrear nada.
alter table contributions add column if not exists confirmed_at timestamptz;

-- 29 jul 2026 (10.3: foto de perfil + nombre real). profiles ya es legible
-- por cualquiera (RLS "profiles readable"), así que avatar_url no necesita
-- policy nueva de lectura. Bucket público, mismo patrón que cause-covers.
alter table profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar file insert own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar file public read" on storage.objects for select
  using (bucket_id = 'avatars');

-- 31 jul 2026 (Épica 15: fixes de RLS/triggers). Corridos por Gastón en el SQL
-- Editor el 30 jul, exportados recién ahora de la base real con
-- pg_get_functiondef/pg_get_triggerdef/pg_policies (no reescritos de memoria):
-- sin esto, recrear el entorno desde este archivo salía sin los 4 fixes,
-- dos de ellos críticos. Comparado el resto de las policies del repo contra
-- las vigentes en la base: coinciden todas salvo "contributions insert".

-- 15.1 (crítico). La policy "contributions insert" original (línea ~98) solo
-- validaba donor_id: cualquiera podía insertar una contribution con
-- status='approved' y monto inventado, sin transferir nada, inflando meta y
-- ranking o disparando el cierre automático de una causa ajena. Ahora exige
-- que todo aporte nuevo entre en 'pending' por 'transfer'. Nota: donate()
-- en causes-store.tsx (flujo de Mercado Pago) todavía inserta con
-- status='approved'/method='mp'; hoy no se llama desde ninguna pantalla
-- (MP_ENABLED=false en donate/[id].tsx). Si se reactiva MP, ese insert va a
-- fallar contra esta policy: hace falta moverlo a una Edge Function con la
-- service key en vez de confiar en el cliente (que es además el diseño
-- correcto: el cliente no debería poder marcarse su propio pago como
-- aprobado).
drop policy if exists "contributions insert" on contributions;
create policy "contributions insert" on contributions for insert
  with check (auth.uid() = donor_id and status = 'pending' and method = 'transfer');

-- 15.2 (crítico). La policy "profiles update own" (línea 80) deja actualizar
-- cualquier columna de la propia fila con solo auth.uid() = id, incluida
-- is_curator: cualquier cuenta podía auto-nombrarse curadora y acceder a
-- DNI/selfie ajenos. Trigger de columnas protegidas: fuerza is_curator y
-- points a su valor anterior salvo que la conexión sea el service_role.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.is_curator := old.is_curator;
    new.points := old.points;
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- 15.3 (alto). La policy "causes update own" (línea 86) deja actualizar
-- cualquier columna de una causa propia, incluido status: el dueño podía
-- publicarse a sí mismo sin pasar por curaduría. Un curador (is_curator=true)
-- sigue pudiendo cualquier transición; el dueño solo las dos que ya dispara
-- la app: 'active'->'completed'/'closed' (cierre de causa, Épica 4) y
-- 'needs_info'->'review' (reenviar tras un pedido de información).
create or replace function public.guard_cause_status_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_curator boolean;
begin
  select is_curator into caller_is_curator from profiles where id = auth.uid();
  if coalesce(caller_is_curator, false) then
    return new;
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'active' and new.status in ('completed', 'closed'))
      or (old.status = 'needs_info' and new.status = 'review')
    ) then
      raise exception 'Transición de estado no permitida para el dueño de la causa';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_cause_status_update
  before update on public.causes
  for each row execute function public.guard_cause_status_update();

-- 15.4 (medio). La policy "contributions cause owner update" (línea ~263,
-- Épica 3: confirmar transferencia) deja al dueño de la causa actualizar
-- cualquier columna de un aporte ajeno, no solo status/confirmed_at: podía
-- alterar el amount ya registrado al confirmar o rechazar. Mismo patrón de
-- columnas protegidas: todo lo que no sea status/confirmed_at vuelve a su
-- valor anterior salvo que la conexión sea el service_role.
create or replace function public.guard_contribution_owner_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.amount := old.amount;
    new.donor_id := old.donor_id;
    new.cause_id := old.cause_id;
    new.method := old.method;
    new.receipt_url := old.receipt_url;
    new.message := old.message;
    new.anonymous := old.anonymous;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger guard_contribution_owner_update
  before update on public.contributions
  for each row execute function public.guard_contribution_owner_update();
