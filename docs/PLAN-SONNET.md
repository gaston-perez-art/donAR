# Plan de implementación — handoff para Sonnet

Este documento es un **plan de ejecución** derivado de las decisiones de producto cerradas el 29 jul 2026 (ver `docs/BACKLOG.md`, épicas 3, 4, 5, 6, 10). Está pensado para implementarse con **Sonnet**: todo acá es réplica de patrones que ya existen en el repo, sin decisiones de producto pendientes (salvo los 3 parámetros marcados abajo).

**Antes de empezar, leé:** `memory.md` (estado técnico), `docs/BACKLOG.md` (el "qué" y el porqué de cada decisión), y el código de las pantallas que vas a tocar. Respetá **paridad iOS/Android** (regla dura del proyecto) y el patrón de `paddingBottom: Math.max(insets.bottom, Spacing.lg)` en footers fijos. Commits chicos, uno por bloque, directo a `main` (convención POC).

---

## Parámetros que Gastón tiene que definir antes (o confirmar el default propuesto)

1. **Monto mínimo para pedir (6.1):** default propuesto **$5.000 ARS**. Confirmar el número.
2. **Auto-confirmación sin servidor (3.3):** no hay Edge Function/cron corriendo (Expo Go). Estrategia propuesta: **lazy client-side** — al leer los aportes, cualquiera `pending` con más de 48 hs se trata como confirmado; si el que mira es el dueño de la causa, se persiste el cambio a `approved` en ese momento. Confirmar este enfoque (la alternativa server-side espera al dev build/EAS).
3. **Reloj de las 48 hs (3.3):** corridas, desde `created_at` del aporte (cuando se subió el comprobante). Ya decidido; solo se anota acá para que quede a la vista al implementar el countdown.

---

## Orden de implementación (por dependencia)

### BLOQUE A — Cierre de causa (Épica 4) · el de mayor valor
Depende de nada nuevo. Hacer primero A1 (habilita A2 y A3).

**A1 · Estado de cierre (4.1)**
- **Schema (`supabase/schema.sql`, migración al final con fecha):** sumar a `causes` el cierre. `status` ya existe (review/published/…); agregar los estados de cierre (`fulfilled` = cumplida, `expired` = cerrada sin llegar) + `closed_at timestamptz`. Definir cuál usás según convenga a las queries existentes.
- **Lógica (`store/causes-store.tsx`):** al confirmar (o auto-confirmar, ver Bloque B) un aporte, recalcular lo confirmado; si **confirmado ≥ meta** → marcar `fulfilled` + `closed_at = now()` y **cortar donaciones nuevas**. Cierre por tiempo: si venció el plazo y no llegó → `expired`. Los aportes en vuelo (`pending`) se completan igual aunque pasen la meta.
- **UI:** pill de estado de cierre en `cause/[id].tsx` y en "Mis causas" del perfil (reusa el patrón de pill de estado que ya existe, 1.2). En `cause/[id].tsx` y `donate/[id].tsx`, si la causa está cerrada → ocultar/deshabilitar el CTA de donar con copy claro ("Esta causa ya se cumplió").
- **Done cuando:** una causa que llega a la meta pasa a cumplida sola, deja de aceptar donaciones, y se ve el estado en detalle y en mis causas; una vencida sin llegar se ve como "cerrada sin llegar".

**A2 · Mini-reporte de cierre (4.2)**
- Sección en el detalle de la causa cerrada (o pantalla nueva del Stack) con: **cuánto se juntó, cuántas personas aportaron, en cuánto tiempo** (de `created_at` de la causa a `closed_at`).
- Reusa el patrón de **stat cards** del Perfil (las de "Donaste"/"Recibiste").
- **Done cuando:** al abrir una causa cumplida, el creador ve el mini-reporte con los 3 números.

**A3 · Flujo de agradecimiento (4.3)** · el cierre emocional, pedido enfático de Gastón
- **Schema:** mensaje de cierre por causa (`closing_message text`, `closing_photo_url text` nullable) + agradecimiento puntual opcional (columna/tabla para "gracias a donante X"; lo simple: `thanked boolean` o una tabla `thanks(cause_id, contribution_id, message)` si querés mensaje personalizado).
- **UI beneficiado:** al cerrarse la causa, prompt en el panel de mi causa para dejar el **mensaje de cierre público** (texto + foto opcional). La subida de foto **reusa el patrón de `cause-covers`** (bucket público). En la lista de aportes confirmados, botón de **gracias puntual** por donante (ya se ve el `display_name`).
- **UI donante:** en `activity.tsx` y `donated.tsx`, cuando una causa que apoyé pasa a **cumplida**, mostrar el agradecimiento ("[Nombre] cerró la causa que apoyaste y dejó un mensaje").
- **Dependencia consciente:** el aviso ideal sería push, **bloqueado en Expo Go** → por ahora vive **in-app en Actividad**, sin push. No intentar push acá.
- **Done cuando:** el beneficiado deja mensaje+foto al cerrar, y el donante lo ve en su Actividad; el gracias puntual funciona.

### BLOQUE B — Timeout 48 hs + countdown (3.3)
Depende de A1 (reusa la lógica "confirmar → recalcular → chequear cierre").
- **Lógica (`store/causes-store.tsx`):** auto-confirmación lazy (ver parámetro 2). Al leer aportes, los `pending` con `created_at` + 48 h vencidas se tratan como `approved`; si el lector es el dueño, se persiste. El auto-confirmado **suma a meta y puntos igual** que un confirmado explícito.
- **UI countdown:** en `cause/[id].tsx` (panel del beneficiado, sobre cada transferencia pendiente) y del lado del donante (su aporte pending, en `activity.tsx`/`donated.tsx`): mostrar **cuánto falta para que se confirme solo** ("se confirma en 41 h"). Countdown en tiempo real o refresco al abrir; mantenerlo simple y **paritario iOS/Android**.
- **Done cuando:** una transferencia sin tocar por 48 h se auto-confirma y suma; el countdown se ve en ambos lados.

### BLOQUE C — Quick wins independientes
Se pueden intercalar; no dependen de A/B (salvo 3.4, que se apoya en la confirmación).
- **6.1 · Monto mínimo:** validación en `create.tsx` con el piso del parámetro 1. Copy claro si no lo alcanza.
- **5.1 · Puntos solo confirmados:** verificar que la fórmula de puntos y el avance de meta tomen **solo `approved`** (con auto-confirm, los approved ya incluyen a los auto-confirmados). Probablemente ya está bien; confirmar y ajustar si no.
- **3.4 · Kudos al donante:** columna `confirmed_at` en `contributions` (hoy solo hay `created_at`) + aviso puntual en `activity.tsx` que distinga "recién te lo confirmaron" de un aporte viejo. Se apoya en la confirmación del Bloque B.

### BLOQUE D — Identidad
- **10.3 · Foto de perfil + nombre real:** **se puede hacer ya** (no depende de Resend). (a) Pedir **nombre y apellido** en el registro (`auth-screen.tsx`) → iniciales reales en el avatar (hoy "VOS"/"GP" hardcodeado); (b) subir **foto de perfil** (bucket público `avatars`, mismo patrón que `cause-covers`). El `display_name` deja de derivarse del mail.
- **10.2 · Recuperar contraseña:** el código (`resetPasswordForEmail` de Supabase + pantalla) se puede escribir, pero **probarlo de verdad necesita el dominio propio verificado en Resend** (trámite de Gastón, fuera del repo). No dar por cerrado hasta que el mail llegue a una casilla que no sea la de Gastón.

---

## Resumen de secuencia sugerida
**A (cierre) → B (48h/countdown) → C (quick wins) → D (identidad).**
A es el mayor salto de valor y lo más pedido. B se apoya en A. C y D son independientes y se pueden meter cuando convenga (10.2 espera al dominio de Resend).

## Lo que NO tocar (parqueado / post-MVP)
Push reales (necesita dev build EAS), Mercado Pago (oculto hasta el split), descubrimiento por cercanía (Épica 7), buscador/filtros (Épica 11), Google Sign-In, lista de causas vetadas (postergada). Ver `docs/BACKLOG.md`.
