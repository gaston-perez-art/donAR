# Plan de implementación 2 — handoff para Sonnet

**Onboarding (dos tours), estados vacíos, skeletons y la deuda pendiente de Supabase.** Derivado de la sesión del 31 jul 2026 con Gastón. Continúa `docs/PLAN-SONNET.md` (el plan del 29 jul, ya ejecutado).

**Antes de empezar, leé:** `AGENTS.md` (reglas duras), `memory.md` (estado técnico), `docs/BACKLOG.md` (el porqué de cada decisión) y `docs/paper-fundacional-donar.md` (la propuesta de valor, que es literalmente el contenido del Tour 1). Reglas que se rompen fácil en este trabajo: **prohibido el guion largo en cualquier texto**, UI en español, comentarios y variables en inglés, **paridad iOS/Android**, `paddingBottom: Math.max(insets.bottom, Spacing.lg)` en footers fijos. Commits chicos, uno por bloque, directo a `main`.

**Verificación obligatoria antes de decir "listo" en cada bloque:** `npx tsc --noEmit` limpio y `npx expo lint` sin warnings nuevos (hay 2 preexistentes: `Text` sin usar en `donar-tab-bar.tsx`, `empty` sin usar en `causes-store.tsx:1183`; no son tuyos, no los toques). Para cambios estructurales, `npx expo export --platform ios` tiene que bundlear.

---

## Lo que Gastón ya decidió (no re-abrir)

1. **Dos tours, no uno.**
   - **Tour 1, antes del registro:** modal con pasos e **imágenes**, sobre qué es donAR y su propuesta de valor. El registro sigue siendo obligatorio; esto va antes para que entienda qué le estás pidiendo y por qué.
   - **Tour 2, después del login:** ilumina secciones de la app real para enseñar dónde está cada cosa y para qué sirve cada botón.
2. **Los dos se pueden omitir y volver a ver** desde un lugar fijo tipo **"Cómo funciona"**.
3. El contenido del Tour 1 es la propuesta de valor; el del Tour 2 es operativo (botones y secciones).

## Parámetros a confirmar con Gastón antes de empezar el Tour 1

1. **Las imágenes del Tour 1.** Es el único bloqueante real de todo este plan (ver "Dependencia de assets" abajo). Recomendación fuerte: **capturas reales de la app**, no ilustraciones.
2. **Dónde vive "Cómo funciona".** Propuesta: en el Perfil, como fila arriba del bloque de "Cerrar sesión". Ver Bloque F.

---

## Dependencia de assets (leer antes de planificar el orden)

El Tour 1 necesita imágenes y **eso condiciona todo el orden de trabajo**. Recomendación, con su porqué:

- **Que sean capturas reales de la app, no ilustraciones.** Tres razones: (a) Gastón lo pidió así ("con imágenes para que se conozca la app"); (b) se solapan con la **Épica 13.2**, que pide screenshots para las fichas de App Store y Play Store, o sea que el mismo trabajo sirve dos veces; (c) ilustrar una app que ya existe y funciona es tirar trabajo.
- **Para que las capturas no den vergüenza, la app tiene que verse terminada primero.** Una captura del feed con un spinner pelado o de un Perfil sin causas no vende nada. Por eso **los Bloques B (estados vacíos) y C (skeletons) van ANTES de sacar las capturas**, aunque el tour sea lo más importante para Gastón.
- **Las capturas necesitan datos creíbles**: causas con foto, montos, aportes confirmados. Hoy la base tiene datos reales de las pruebas; si están flacos, hay que cargar 3 o 4 causas presentables antes de capturar.

**Orden que sale de esto:** B → C → (Gastón saca las capturas) → D → F → E. Los bloques B y C no dependen de nada y se pueden empezar hoy.

---

## BLOQUE A — Supabase: la deuda pendiente

Casi todo este bloque es **trabajo manual de Gastón en el dashboard**, no código. Está acá para que no se pierda. **Nada del onboarding depende de esto**: los dos tours guardan su estado en AsyncStorage, sin tocar la base (ver Bloque D).

**A1 · Volcar al repo el SQL de los fixes de RLS de la Épica 15. CRÍTICO.**
Los cuatro triggers (15.1 a 15.4) están corridos en la base de Gastón pero **no están en `supabase/schema.sql`**: el archivo tiene una sola función (`handle_new_user`, línea 102) y ningún trigger más. Verificado el 31 jul. Consecuencia real: si hoy se recreara el entorno desde `schema.sql`, saldría **sin los cuatro fixes de seguridad, incluidos los dos críticos** (auto-nombrarse curador y crear donaciones falsas "confirmadas").

**No reescribas ese SQL de memoria: sería inventarlo.** Hay que exportarlo de la base real. Corriendo esto en el SQL Editor de Supabase sale todo lo que falta:

```sql
-- Funciones (traen el cuerpo completo de los triggers de la Épica 15)
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- Triggers colgados de esas funciones
select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by c.relname, t.tgname;

-- Policies actuales (para confirmar que las del repo siguen siendo las vigentes)
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Pegar el resultado al final de `supabase/schema.sql` como migración fechada (misma convención que el resto del archivo: comentario con la fecha y el porqué). Al hacerlo, **comparar las policies devueltas contra las que están escritas en el repo**: si alguna difiere, la del repo está vieja y hay que corregirla.

**A2 · Confirmar en caliente los dos exploits críticos.** Sigue pendiente desde el 30 jul. Con una cuenta común (no curador), intentar:
- `update profiles set is_curator = true where id = auth.uid()` → tiene que fallar o quedar sin efecto.
- Insertar una `contribution` con `status: 'approved'` fuera del flujo de la app → tiene que fallar.

Sin esto, "el fix está corrido" es una suposición, no un hecho. Anotar el resultado en `docs/ciberseguridad.md`, sección 6.

**A3 · Verificar que las migraciones de la sesión 18 estén realmente corridas.** Están escritas al final de `schema.sql` (fechadas 29 jul) pero no hay confirmación de que se hayan ejecutado: `closed_at`/`closing_message`/`closing_photo_url` en `causes`, tabla `cause_thanks`, `confirmed_at` en `contributions`, `avatar_url` en `profiles` y el bucket `avatars`. Chequeo rápido:

```sql
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('causes','closed_at'), ('causes','closing_message'), ('causes','closing_photo_url'),
    ('contributions','confirmed_at'), ('profiles','avatar_url')
  );
select to_regclass('public.cause_thanks') as cause_thanks;
select id from storage.buckets where id = 'avatars';
```

Si algo no aparece, correr esa migración. Nota: la foto de perfil y el cierre de causa **ya se usaron en la app**, así que lo más probable es que estén; confirmarlo igual.

**A4 · Bloqueantes de 10.2 (recuperar contraseña), manuales, de Gastón.** Verificar un dominio propio en Resend y agregar `donar://reset-password` a Redirect URLs en Supabase Auth (Authentication > URL Configuration). El código ya está hecho desde el 29 jul; sin estos dos pasos no se puede probar de punta a punta.

**A5 · Pasar Supabase de free tier a un plan pago antes de anunciar el lanzamiento.** Checklist completo en `docs/ciberseguridad.md`. No es urgente hoy, sí antes de que entre gente real.

---

## BLOQUE B — Estados vacíos unificados

Hoy hay estados vacíos, pero desparejos. Inventario verificado en el código el 31 jul:

| Pantalla | Hoy | Falta |
|---|---|---|
| Feed (`(tabs)/index.tsx:89`) | `BrandMark` + título + sub, con dos variantes según tengas causa propia | Nada. **Es la implementación de referencia, copiá de acá.** |
| `donated.tsx:51` | `BrandMark` + una línea | Falta CTA ("Ver causas") |
| `received.tsx:42` | `BrandMark` + una línea | Falta CTA ("Crear una causa") |
| Ranking (`(tabs)/ranking.tsx:98`) | Solo texto | Falta `BrandMark` |
| Actividad (`(tabs)/activity.tsx:89`) | Solo texto | Falta `BrandMark` |
| **"Mis causas" del Perfil** | **No existe**: la sección entera se esconde con `myCauses.length > 0 &&` | **Falta el estado vacío completo.** Un usuario nuevo entra al Perfil y no ve ninguna señal de que puede crear una causa. |

**Qué hacer:**
1. Componente nuevo `src/components/empty-state.tsx`: props `title`, `subtitle`, `actionLabel?`, `onAction?`, y el `BrandMark` adentro. Copiá el layout y los estilos del feed, que es el que ya está bien resuelto.
2. Reemplazar los 5 estados vacíos existentes por el componente. **Sin cambiar el copy que ya existe**: está escrito en la voz de Gastón y ya pasó por él.
3. Sumar `BrandMark` donde falta (ranking, actividad) y CTA donde hay una acción siguiente obvia (`donated` → feed, `received` → crear causa).
4. **Estado vacío nuevo de "Mis causas"** en `profile.tsx`: sacar el `myCauses.length > 0 &&` y mostrar, cuando está vacío, algo como título "Todavía no creaste ninguna causa" + sub "Si necesitás ayuda, contá tu situación. Un curador la revisa antes de que se publique." + CTA "Crear una causa" que va a `/create`. Ojo: esto refuerza justo el mensaje del Tour 1, así que el copy tiene que decir lo mismo.

**Regla que no se rompe:** el `BrandMark` va en momentos puntuales (loading y estados vacíos), **nunca repetido fila por fila**. Es una decisión de marca cerrada el 30 jul (Épica 13.5); si aparece en cada fila deja de leerse como marca y pasa a leerse como relleno.

**Done cuando:** las 6 pantallas usan el mismo componente, se ven iguales entre sí, y el Perfil de una cuenta nueva invita a crear una causa.

---

## BLOQUE C — Skeletons de carga (Épica 8.6)

Hoy **todo es spinner de pantalla completa**: `profile.tsx`, `ranking.tsx`, `activity.tsx`, `donated.tsx`, `received.tsx`, `cause/[id].tsx`, `transfer/[id].tsx`, `curar-screen.tsx`. El feed es peor: mientras carga no muestra nada, solo los títulos de sección sobre un vacío.

**Qué hacer:**
1. Componente `src/components/skeleton.tsx`: bloque gris con pulso suave. Color base `Colors.line` (#EEF2F6) sobre `Colors.bg`. Props: `width`, `height`, `radius`.
   - **Usá el `Animated` nativo de React Native, NO `react-native-reanimated`.** Está instalado (~4.1.1) pero el proyecto lo descartó a propósito en la Épica 8.2: **no hay `babel.config.js`**, así que no se puede confirmar que el plugin de worklets esté activo. `tab-bar-scroll.tsx` ya sienta el precedente y lo explica en su comentario de cabecera. Un `Animated.loop` sobre la opacidad con `useNativeDriver: true` alcanza y sobra para un pulso.
2. Skeletons por pantalla, **imitando la forma del contenido real**, no un rectángulo genérico:
   - **Feed:** 2 o 3 tarjetas fantasma con la silueta de `CauseCard` (portada, título, barra de progreso, montos). Es la pantalla más vista, arrancá por acá.
   - **Perfil:** avatar redondo + línea de nombre + pill de nivel + las 2 stat cards.
   - **Ranking:** 5 filas con círculo y dos líneas.
   - **Actividad:** 4 filas con círculo y dos líneas.
   - `donated`, `received`, `cause/[id]`: si sobra tiempo; el spinner ahí molesta menos.
3. **No rompas el patrón `hasLoadedOnce`.** `profile.tsx:134` y `ranking.tsx:40` lo usan a propósito: el estado de carga a pantalla completa se muestra **solo la primera vez**, los re-focos refrescan en silencio. Fue el fix de un bug real que Gastón reportó como "se recarga sola, es rarísimo". El skeleton reemplaza al spinner **dentro de esa misma condición**, no la elimina. Si un skeleton empieza a parpadear al volver de otra pantalla, rompiste esto.
4. **No toques** la pantalla de carga inicial de `_layout.tsx:50` (splash azul con el logo). Esa está resuelta y es una decisión de marca.

**Done cuando:** las 4 pestañas muestran la silueta de su contenido en la primera carga, y al volver de otra pantalla no parpadea nada.

---

## BLOQUE D — Tour 1: presentación antes del registro

**El bloque más importante para Gastón.** Es lo primero que ve alguien que abre donAR, y es donde se explica por qué el producto merece confianza antes de pedirle datos.

**Dónde se engancha:** en `src/app/_layout.tsx`, dentro de `AppShell`. El orden de los gates hoy es: `loading` (línea 50) → `passwordRecovery` (66) → `!isAuthenticated` (72) → `isCurator && !viewAsDonor` (76) → Stack. El tour va **entre `passwordRecovery` y `!isAuthenticated`**: después del deep link de recuperar contraseña (que nunca debe quedar tapado por el tour) y antes del login.

```
if (loading) …
if (passwordRecovery) …
if (!seenWelcomeTour) return <WelcomeTourScreen … />   ← acá
if (!isAuthenticated) return <AuthScreen />
```

**Estado persistido:** AsyncStorage (`@react-native-async-storage/async-storage`, ya instalado y ya en uso como storage de la sesión de Supabase en `src/lib/supabase.ts:13`). Clave **versionada**: `donar.tour.welcome.v1`. La versión importa: si algún día se rediseña el tour, subir a `v2` lo vuelve a mostrar a todos sin tener que borrar nada a mano.

**Por qué AsyncStorage y no una columna en `profiles`:** en este punto del flujo **todavía no hay cuenta**, así que no hay dónde guardarlo del lado del servidor. El costo es que alguien que reinstala la app lo ve de nuevo, que para un POC es irrelevante.

**Hook nuevo** `src/hooks/use-onboarding-flag.ts` (o dentro del store si preferís no crear carpeta): lee la clave al arrancar, expone `seen`, `loading` y `markSeen()`. **Cuidado con el flash:** mientras se lee AsyncStorage hay que seguir mostrando la pantalla de carga azul, no cortar a blanco ni mostrar el login por un instante. Lo más simple es integrar esa lectura al `loading` que ya tiene el store.

**Pantalla** `src/screens/welcome-tour-screen.tsx`:
- `ScrollView` horizontal con `pagingEnabled`, un slide por página, más dots de posición y botón "Siguiente" / "Empezar" en el último.
- **"Saltar" arriba a la derecha, siempre visible.** Gastón lo pidió explícitamente.
- Tanto "Saltar" como "Empezar" hacen `markSeen()` y caen en `AuthScreen`.
- Cada slide: imagen arriba, título, subtítulo. Tipografía y colores del theme (`Colors.brand`, `Colors.ink`, `Colors.muted`), nada nuevo.
- **Trampa conocida:** no envuelvas el `ScrollView` horizontal en un `Pressable`. Ya pasó el 27 jul con el carrusel de fotos del feed: el `Pressable` ancestro le compite el gesto al scroll horizontal y el swipe deja de andar. Está documentado en `docs/BACKLOG.md`, sección "Bugs".
- **Sin `BlurView`.** El blur de Android (`experimentalBlurMethod="dimezisBlurView"`) crasheó la app en transiciones y está prohibido fuera de iOS hasta el build nativo. Fondos sólidos.

**Copy de los 4 slides.** Sale del pitch de Gastón, no lo reescribas de cero:

> **1. Ayudar sin intermediarios**
> donAR conecta a quien quiere ayudar con quien lo necesita. Sin fundaciones en el medio, sin comisiones que se coman una parte.
>
> **2. Contá lo que necesitás**
> Publicás tu necesidad con tu historia, cuánto necesitás y para qué. No hace falta ser una ONG ni tener una institución atrás.
>
> **3. Un curador la revisa antes de que salga**
> Ninguna causa se publica sola. Una persona verifica la documentación y la historia, para que del otro lado sepan que lo que leen es real.
>
> **4. Ves a dónde fue cada peso**
> Donás directo a la persona y cada aporte confirmado queda a la vista con su comprobante. La confianza es el producto.

El slide 3 es el que diferencia a donAR de cualquier otra plataforma de donaciones: **no lo acortes ni lo muevas de lugar**.

**Imágenes:** ver "Dependencia de assets". Mientras Gastón las prepara, dejá el layout andando con un placeholder del tamaño final para no bloquearte.

**Done cuando:** una instalación limpia abre en el tour, se puede saltear, swipear y terminar; al terminar cae en el login; y al cerrar y volver a abrir la app ya no aparece.

---

## BLOQUE E — Tour 2: recorrido por la app real

Coach marks que **iluminan una sección a la vez** sobre la app ya funcionando, explicando qué hay en cada lugar. Es el bloque técnicamente más frágil: hacelo último.

**Cuándo aparece:** la primera vez que se entra al feed con sesión iniciada. Flag propio, `donar.tour.app.v1` (separado del Tour 1: son dos cosas distintas y se re-ven por separado).

**Cómo iluminar sin sumar dependencias:** medí el elemento objetivo con `measureInWindow` y dibujá un overlay absoluto con **cuatro rectángulos oscuros alrededor** del rectángulo objetivo (arriba, abajo, izquierda, derecha), dejando el hueco transparente. Es más simple y más portable que una máscara SVG y evita instalar `react-native-svg`. El cartel de texto se posiciona arriba o abajo del hueco según dónde haya lugar. **Nada de blur** (misma razón que el Bloque D).

**Pasos sugeridos (5):**
1. **El feed** — "Acá vas a ver las causas verificadas. Cada una pasó por un curador antes de publicarse."
2. **El botón +** de la tab bar — "Si necesitás ayuda, desde acá contás tu situación y pedís."
3. **Ranking** — "Los que más sostienen causas. Doná y sumá tus primeros puntos."
4. **Actividad** — "Acá te enterás cuando alguien aporta a tu causa o cuando te agradecen."
5. **Perfil** — "Tu nombre, tu foto, y todo lo que donaste y recibiste."

**Cuidado con la tab bar.** Es un componente propio (`src/components/donar-tab-bar.tsx`), flotante, con `BlurView` en iOS y tinte sólido en Android, y el `+` sobresale por arriba de la pill con `marginTop: -30`. Para iluminarlo, medí el elemento real, **no calcules su posición a mano**: `TabBarHeight` (78, en `donar-theme.ts`) más el inset de safe area no te va a dar el rectángulo correcto del `+`, porque sobresale.

**Done cuando:** después de registrarse, el recorrido corre una vez, se puede saltear en cualquier paso, y no vuelve a aparecer.

---

## BLOQUE F — "Cómo funciona": volver a ver los tours

Requisito explícito de Gastón: los dos tours **se pueden omitir y volver a ver**.

- **Dónde:** en el Perfil, como fila arriba del bloque de "Cerrar sesión" (`profile.tsx`, `signOutSection`). Motivo: "Cerrar sesión" es la última acción de la pantalla por decisión ya tomada el 29 jul (patrón Instagram/Uber/Airbnb), así que esto va justo antes, no después.
- **Qué:** fila "Cómo funciona donAR" que abre una pantalla nueva del Stack (`src/app/como-funciona.tsx`, registrada en `_layout.tsx` junto a `donated` y `received`) con dos opciones:
  - "Ver la presentación" → vuelve a correr el Tour 1.
  - "Ver el recorrido por la app" → vuelve a correr el Tour 2.
- **Cómo se re-lanza sin romper los gates:** no borres el flag de AsyncStorage para re-mostrar, porque el gate del Tour 1 vive antes del login y volver a activarlo desde adentro de la app te sacaría de la sesión visualmente. Manejalo con **estado en memoria**: un `replayTour: 'welcome' | 'app' | null` que abre el mismo componente como modal por encima de la app. Los componentes de los dos tours tienen que aceptar un prop tipo `onClose` para servir a los dos casos (primer ingreso y replay).
- Aprovechá para dejar ahí también los links a `docs/terminos-y-condiciones.md` y `docs/privacidad.md` cuando estén publicados en una URL real (hoy no lo están: Épica 15.6/15.7). Dejá el lugar hecho, comentado.

**Done cuando:** desde el Perfil se pueden volver a ver los dos tours cuantas veces se quiera, sin cerrar sesión y sin que se rompa la navegación.

---

## Qué NO hacer en este plan

- **No agregues dependencias nuevas.** Todo lo necesario está instalado: `@react-native-async-storage/async-storage`, `@expo/vector-icons`, `expo-haptics`, y el `Animated` que viene con React Native. Nada de librerías de onboarding, de tooltips, de carruseles ni de skeletons.
- **No uses `react-native-reanimated`** aunque figure en `package.json`: sin `babel.config.js` no hay garantía del plugin de worklets. Decisión de la Épica 8.2, con `tab-bar-scroll.tsx` de precedente.
- **No subas la versión de Expo.** SDK fijado en 54 por compatibilidad con la Expo Go de la App Store (regla dura de `AGENTS.md`).
- **No uses `BlurView` en Android.** Crasheó la app en transiciones; el fix vigente es tinte sólido por `Platform.OS`.
- **No toques `formatARS` ni abrevies montos** en aportes individuales ni en instrucciones de pago. La cifra exacta ahí es trazabilidad y seguridad, que es el eje del producto.
- **No implementes push.** Está bloqueado en Expo Go; los avisos viven in-app en Actividad.
- **No inventes el SQL de la Épica 15** (ver A1): hay que exportarlo de la base real.
- **No reescribas el copy existente** de los estados vacíos. Está en la voz de Gastón y ya pasó por él.

---

## Resumen del orden

| # | Bloque | Depende de | Bloqueado por |
|---|---|---|---|
| 1 | **B** — Estados vacíos | Nada | Nada. Empezá acá. |
| 2 | **C** — Skeletons | Nada | Nada. En paralelo con B. |
| 3 | — | Capturas de la app | Gastón. Necesita B y C listos. |
| 4 | **D** — Tour 1 (pre-registro) | Las capturas | Las imágenes |
| 5 | **F** — "Cómo funciona" | D | — |
| 6 | **E** — Tour 2 (coach marks) | F | — |
| — | **A** — Supabase | Nada | Es trabajo manual de Gastón, corre en paralelo |
