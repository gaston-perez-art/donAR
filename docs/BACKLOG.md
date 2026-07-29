# DonAR — Backlog

Backlog vivo del producto. Ordena lo que hay que hacer por épicas y dependencia. No es el estado del código (eso vive en `memory.md`); acá vive el "qué falta y en qué orden".

Última actualización: 29 de julio de 2026.

**Estados:** ✅ hecho · 🔨 en curso · ⬜ pendiente · 🐞 bug · 🅿️ parqueado (fuera del MVP por ahora) · ❓ decisión abierta

---

## Épica 1 — Panel de "mi causa" (vista del creador)
*Base de casi todo lo demás: es donde el creador vive su causa y donde después confirma transferencias y ve el cierre.*

- ✅ **1.1** Ver mi causa: el detalle de una causa propia ya publicada muestra recaudado/meta, días restantes y aportes recibidos, con botón "Compartir mi causa" en vez de "Donar" (ya no te ofrece donar a vos mismo). En `cause/[id].tsx`, branch `isOwner`.
- ✅ **1.2** Estado del trámite visible desde el Perfil: sección "Mis causas" con pill de estado (En revisión / Publicada / Rechazada / Cumplida).
- ✅ **1.3** "Mis causas" accesible desde el Perfil: cada fila lleva al detalle/panel de esa causa.
- ✅ **1.4** Stat cards "Donaste"/"Recibiste" del Perfil, tapeables (29 jul, pedido de Gastón). Dos pantallas nuevas en el Stack: `/donated` (reusa `getMyActivity().contributions`, sacado del bloque "Historial de impacto" que antes vivía siempre visible en el Perfil) y `/received` (nueva función de store `getReceivedContributions`, aportes confirmados en TODAS mis causas, no solo una).

## Épica 2 — Métodos de pago del donante
> **DECISIÓN MVP (27 jul):** solo **transferencia directa** + **aporte voluntario** a donAR (modelo GoFundMe). Cero custodia, cero comisión obligatoria = el modelo más limpio legalmente (ver paper 11.c). **Mercado Pago apagado con flag** (`MP_ENABLED = false`), no borrado; se prende con split de pagos + OK legal.

- ✅ **2.1** Mercado Pago (checkout sandbox) — **PARQUEADO tras flag.** Código intacto. Era demo custodial (cobra a una cuenta); on-axis solo con split de pagos.
- ✅ **2.4** Aporte voluntario a la plataforma ("Bancá el proyecto", opcional) en la pantalla post-transferencia. Muestra el alias de donAR (`gastonmartinp`, copiable) + auto-reporte "ya aporté" (tabla `platform_support`, para medir willingness-to-pay).
- ✅ **2.2** Bifurcación en la pantalla de donar: "Pagar con Mercado Pago" o "Transferir yo mismo".
- ✅ **2.3** Flujo de transferencia (`transfer/[id].tsx`): muestra el alias del beneficiado (copiable), el donante sube el comprobante, el aporte entra `pending` (no cuenta para la meta hasta confirmarse). Bucket privado `transfer-receipts`. En la lista de aportes se tagea "por confirmar".
- ✅ **2.5** Loader al donar (29 jul, pedido de Gastón). Revisado: `review.tsx` (publicar causa) ya tenía spinner completo. `transfer/[id].tsx` (el único camino de donar vivo hoy, MP está apagado) solo cambiaba el texto del botón a "Enviando..."; sumado `ActivityIndicator` + "Subiendo comprobante...", mismo patrón que `review.tsx`.

## Épica 3 — Confirmación del aporte por transferencia
*El eslabón de confianza del modelo sin custodia. Ver el modelo completo en el paper, sección "Confianza del dinero sin custodia".*

- ✅ **3.1** El beneficiado ve, en el panel de su causa, las transferencias pendientes con el comprobante (URL firmada; RLS de dueño).
- ✅ **3.2** Confirma ("Me llegó") o rechaza ("No me llegó") cada una. Al confirmar, el aporte pasa a `approved` → suma a la meta y cuenta para los puntos automáticamente (todo se calcula de los `approved`). Rechazar → `rejected`, no cuenta.
- ❓ **3.3** Qué pasa si el beneficiado no confirma nunca (¿timeout? ¿el donante puede reclamar?). SIGUE ABIERTA.
- ⬜ **3.4** Kudos/aviso al donante cuando le confirman el aporte. La tab Actividad (29 jul) ya muestra los aportes del donante, pero no distingue "recién te lo confirmaron" de un aporte viejo (no hay timestamp de confirmación en `contributions`, solo `created_at` del aporte original). Falta esa columna + el aviso puntual.

## Épica 4 — Cierre de causa + agradecimiento
*Se dispara por tiempo (venció el plazo) o por monto (llegó a la meta).*

- ⬜ **4.1** El creador ve el estado de cierre: "cumplida" (happy) o "cerrada sin llegar" (unhappy).
- ⬜ **4.2** Mini-reporte de cierre: cuánto se juntó, cuántas personas, en cuánto tiempo.
- ⬜ **4.3** Flujo de agradecimiento: el beneficiado deja un mensaje de cierre y puede agradecer a los donantes (o a alguien puntual).
- ❓ **4.4** Destino del excedente si superó la meta (pendiente + legal).

## Épica 5 — Puntos / ranking coherentes con la regla
- ⬜ **5.1** Puntos y meta cuentan **solo aportes confirmados** (MP = instantáneo; transferencia = al confirmar). Hoy cuenta todo lo `approved`.
- 🅿️ **5.2** Racha semanal (x1,2) en la fórmula de puntos.
- 🅿️ **5.3** +200 por verificar identidad (no aplica a donantes en el flujo actual).

## Épica 6 — Reglas de creación de causa
- ⬜ **6.1** Monto mínimo para pedir (que no se pueda crear una causa pidiendo $1). Define un piso razonable para el MVP.
- ⬜ **6.2** Revisar máximos / coherencia monto vs. evidencia (ya lo mira el curador, ver si sumar validación blanda).

## Épica 8 — Estética "liquid glass" (UI premium)
*Idea de Gastón, 29 jul: menú/tab bar estilo Liquid Glass como Instagram/iOS 26.*
> **Dos niveles (ver decisión en el paper/memory):** (a) frosted glass con `expo-blur` = paritario iOS/Android, corre en Expo Go, ~80% del efecto; (b) Liquid Glass nativo real (`expo-glass-effect`, iOS 26, refracción + brillos) = iOS-only + necesita build nativo. Estrategia: (a) ahora, (b) cuando haya build nativo, con (a) de fallback en Android.

- 🔨 **8.1** Tab bar tipo **pill flotante de vidrio** (`expo-blur`) redondeada y despegada del borde, íconos vectoriales finos (Ionicons outline/filled según activo, activo con fondo sutil), el `+` de crear **alineado horizontal** con los íconos (círculo brand inline de 42px, destacado por color, ya NO sobresale; cambio pedido por Gastón el 29 jul tras verlo "flotando"). Emojis viejos descartados ("parecían de mala calidad"). IMPLEMENTADO, **pendiente de OK visual de Gastón** antes de pushear. Knobs: intensidad del blur (30), opacidad del tinte (0.58), radio (30), altura (62), tamaño del `+` (42).
  - 🐞→✅ **Crash en Android por el blur experimental.** El hermano de Gastón (Android, por túnel) veía la pantalla de estado de su causa EN BLANCO TOTAL al abrirla desde el feed. Causa: `experimentalBlurMethod="dimezisBlurView"` de `expo-blur` crashea en Android durante las transiciones de pantalla (la app moría a blanco al pushear cause/[id]); en iOS no pasa (blur nativo). Fix: en Android NO se usa BlurView, se usa un tinte sólido translúcido (`rgba(248,251,253,0.94)`), estable; iOS mantiene el blur real. El blur real de Android se retoma con vía estable en el build nativo. (El error `adb ENOENT` / Android SDK que apareció en la terminal era un red herring del entorno de Gastón, no el bug.)
  - 🐞 **Barra plana/pegada al borde en el Android del hermano de Gastón (29 jul).** Captura mostró la pill vieja (sin radio, sin margen, full-width) después de que el código ya tenía la pill nueva. Hipótesis: bundle viejo en caché sobre el túnel entre dispositivos, no reprodujo el código actual (a confirmar recargando la app entera, no solo Fast Refresh). Insurance aparte, aplicada igual: el `elevation` del contenedor exterior (`pill`) no tenía su propio `borderRadius` (solo lo tenía la capa `glass` de adentro); en Android la sombra de `elevation` puede salir cuadrada si la vista que la dibuja no tiene su propio radio. Agregado `borderRadius: RADIUS` también en `pill`. **Sigue sin confirmar si esto solo era bundle viejo o si había algo real; pendiente de que el hermano recargue del todo y vuelva a probar.**
- 🔨 **8.2** **Shrink on scroll** (pill se achica al deslizar abajo, vuelve al subir/llegar arriba). IMPLEMENTADO con el **`Animated` nativo de RN** (no reanimated: el proyecto no tiene `babel.config.js`, no se puede confirmar el plugin de worklets; el Animated nativo no lo necesita y con `useNativeDriver` va igual de fluido). `src/components/tab-bar-scroll.tsx` (`TabBarScrollProvider` + hook `useTabBarScroll`) es el canal entre el scroll de cada pantalla (feed/ranking/perfil/actividad) y la barra. **Pendiente de OK visual de Gastón.** Knobs: umbral 6px, scale 0.86, translateY 20, duración 200ms.
- ⬜ **8.3** Llevar el mismo lenguaje de vidrio al header de las pantallas.
- ⬜ **8.5** **Theme claro/oscuro según el sistema.** Hoy la app es siempre clara; el vidrio de la pill "sigue el fondo" pero el fondo es fijo. Que la app respete el modo claro/oscuro del sistema (y la pill con él). Pedido de Gastón, 29 jul.
- 🅿️ **8.4** Liquid Glass nativo real (`expo-glass-effect`) para iOS 26, cuando el proyecto pase a build nativo. El blur (8.1) queda de fallback para Android e iOS viejo.

## Épica 9 — Actividad y notificaciones
*Pedido de Gastón, 29 jul: "necesito notificaciones push y en Actividad claves del flujo (recibiste una transferencia, chequeala; o donaste)".*
> **Hallazgo clave (investigado, 29 jul): las notificaciones push remotas NO funcionan en Expo Go desde el SDK 53** (ni iOS ni Android; se sacaron por abuso de cuota de FCM en el cliente compartido de Expo Go). Este proyecto está en SDK 54 y TODO el testing (Gastón y su hermano) es por Expo Go/túnel. Un push real recién se puede probar con un **dev build (EAS)**, que ya estaba parqueado para "antes de subir a las stores". Fuente: [Expo SDK 53 changelog](https://expo.dev/changelog/sdk-53), [Push notifications FAQ](https://docs.expo.dev/push-notifications/faq/).

- ✅ **9.1** Tab **Actividad con contenido real** (ya no placeholder "Próximamente"). Tres secciones: "Para revisar" (transferencias pendientes en mis causas, con link directo a confirmar), "Te llegaron" (aportes confirmados recibidos), "Tus aportes" (lo que doné). Nuevas funciones en el store: `getPendingTransfersForMyCauses`, `getReceivedContributions`. Esto es la base de datos/contenido para cuando haya push real: cualquier futuro push se puede armar sobre las mismas queries.
- ❓ **9.2** **Notificaciones push reales.** Bloqueadas en Expo Go (ver hallazgo arriba). Decisión pendiente: ¿se adelanta el pase a dev build (EAS) solo para esto, o se espera al build nativo ya planeado para las stores? Si se adelanta, además del dev build hace falta: registrar push tokens por usuario (tabla nueva), y un disparador server-side (Supabase Edge Function o trigger de DB) que mande la notificación cuando entra una transferencia pendiente o se confirma un aporte.

## Épica 7 — Descubrimiento por cercanía (post-MVP)
*Insight: la cercanía es un multiplicador de confianza y relevancia. A una causa del barrio se le dona más fácil. "Cada barrio tiene a su gente más interesada". Idea de Gastón, 27 jul.*
> **Dependencias/tensiones:** necesita ubicación en la causa (barrio/zona, al crear) y del donante (permiso). **Privacidad: granularidad a nivel barrio/zona, nunca la dirección exacta del beneficiado.** Recién rinde con volumen de causas (con pocas, el filtro por km no muestra nada) → post-MVP.

- ⬜ **7.1** Ubicación de la causa: capturar barrio/zona (y opcionalmente coords aproximadas) al crear.
- ⬜ **7.2** Ubicación del donante (permiso de geolocalización).
- ⬜ **7.3** Filtros en el feed (categoría, estado, monto, cercanía).
- ⬜ **7.4** Búsqueda por texto / por zona.
- ⬜ **7.5** "Donar cerca tuyo": causas dentro de X km.
- ⬜ **7.6** Modo descubrimiento tipo swipe ("Tinder de donar"): deslizás causas cercanas una por una.

---

## Bugs / known issues
- ✅ **La foto de portada no se ve.** Resuelto: el view `causes_public` con `select c.*` no exponía columnas agregadas después; se recreó el view.
- ✅ **El swipe nativo de iOS para volver atrás no funciona.** Reportado 27 jul, resuelto 28 jul. Causa: las pantallas del flujo (create/cobro/review/donate/transfer/cause) eran `Tabs.Screen` con `href:null`, no un stack real, así que no había navegación nativa en NINGUNA plataforma (ni swipe-back en iOS ni botón/gesto de retroceso correcto en Android). Fix (aplica parejo a las dos plataformas, no un parche de iOS): los tabs (`index`, `ranking`, `profile`, `activity`) se movieron a un grupo de rutas `(tabs)/` con su propio `Tabs`; el `_layout.tsx` raíz pasó a ser un `Stack`, con `(tabs)` como una pantalla más y el resto del flujo (`create`, `cobro`, `review`, `cause/[id]`, `donate/[id]`, `transfer/[id]`, `gracias`) como pantallas del Stack que se empujan encima. De paso, sacado el chequeo manual `HIDDEN_ON` de `donar-tab-bar.tsx` (quedó redundante: esas pantallas ya no son parte del navegador de tabs, la estructura lo garantiza).
- ✅ **El carrusel de fotos no se puede swipear desde el feed.** Reportado 27 jul (visto por Gastón en su iPhone), resuelto 28 jul. La sospecha original del backlog era correcta: el `Pressable` que envuelve toda la tarjeta (`cause-card.tsx`) competía por el gesto con el `ScrollView` horizontal de abajo, en iOS y Android por igual (confirmado: el carrusel de `cause/[id].tsx`, que NO tiene un `Pressable` ancestro, nunca tuvo este problema). Fix estructural: con fotos, la portada pasa a ser un `View` simple (no `Pressable`); el tap para abrir el detalle se movió a cada foto individual (`Pressable` hijo del `ScrollView`, que sí convive bien con el scroll, es el patrón estándar de listas/carruseles tocables) y al bloque de texto de abajo. Sin fotos (fallback emoji) la portada entera sigue siendo un solo `Pressable`, sin conflicto porque ahí no hay `ScrollView`.
- ✅ **En Android el CTA fijo de abajo lo tapa la barra de navegación del sistema.** Reportado y resuelto 28 jul. Causa: el `SafeAreaView` de cada pantalla usa `edges={['top']}`, así que el CTA fijo al pie nunca descontaba el inset inferior (en iPhone 14 Pro no se notaba, la gesture bar es más angosta). Fix: `paddingBottom: Math.max(insets.bottom, Spacing.lg)` (mismo patrón que ya usaba `donar-tab-bar.tsx`) en los footers fijos de `cause/[id].tsx`, `donate/[id].tsx`, `transfer/[id].tsx`, `create.tsx`, `cobro.tsx`, `review.tsx`, `gracias.tsx` y `curar-screen.tsx`.
- ✅ **El curador no ve las causas en revisión hasta reabrir la app.** Reportado 28 jul, resuelto 28 jul. Causa raíz real (RLS ya andaba bien, era 100% client-side): `causes` se cargaba una sola vez al montar el store y nunca se releía. Cubría dos escenarios: (a) te volvés curador con la app ya abierta (SQL corrido en caliente) → fix: `causes-store.tsx` refetchea automáticamente cuando `isCurator` pasa a `true`; (b) alguien manda una causa nueva mientras el panel del curador ya está abierto (el caso más probable de la sesión de testing) → fix: pull-to-refresh en `curar-screen.tsx`. **Recordatorio de producto (sigue vigente):** vincular mail ≠ ser curador (el flag `is_curator` se prende con SQL puntual).
- ⚠️ **Fricción (no bug): rate limit del código de login.** Resend/Supabase limitan el envío de OTP (~60s entre mails + tope por hora). Reintentar rápido da "No pudimos enviar el código". Es esperado del setup OTP+SMTP. A futuro, mejorar el mensaje de error para que diga "esperá un minuto" en vez de genérico.

---

## Decisiones abiertas (producto, no código)
- ❓ **Riesgo de identidad huérfana (29 jul, descubierto en testing real, CONFIRMADO con SQL).** El hermano de Gastón donó por transferencia a "Me muero de hambre" (causa de Gastón); a Gastón no le aparecía nada para confirmar. Query confirmó: `owner_id` de esa causa es una cuenta `is_anonymous = true`, `email = null` — nunca se vinculó a nada. Confirmada la hipótesis: se creó bajo una sesión anónima que después se cerró (`signOut`, la función para alternar curador/donante) sin vincular mail a ESA sesión puntual. Fix de datos entregado a Gastón (dos SQL: encontrar su cuenta real + reasignar `owner_id`), **pendiente de que lo corra y confirme**. Riesgo real de producto, no solo de testing: cualquier donante/beneficiado real que cree una causa sin vincular mail y pierda la sesión (reinstala, borra datos) pierde el control de su causa para siempre — el login (`loginWithEmail`/`confirmLogin`) YA EXISTE para recuperar identidad entre dispositivos, pero no sirve si nunca se vinculó antes de perder la sesión. Gastón remarcó que pidió login "desde el principio"; aclarado que existe pero no cubre este caso puntual. Sin resolver: ¿bloqueamos crear una causa sin mail vinculado? ¿avisamos antes de cerrar sesión si hay causas propias sin vincular?
- ❓ **Modelo de confianza de la transferencia.** Recomendado: el beneficiado confirma, comprobante público, solo lo confirmado suma. Falta OK final. (Analizado en el paper.)
- ❓ **Qué hacemos con Mercado Pago:** ¿queda como "demo / próximamente" hasta tener split de pagos, o se muestra igual sabiendo que es custodial?
- ❓ **Timeout de confirmación** de transferencia (Épica 3.3).
- ❓ **Destino del excedente** cuando una causa supera la meta (Épica 4.4).
- ❓ **Lista de causas vetadas** (viene del flujo de verificación, falta OK final).

---

## Parqueado (fuera del MVP por ahora)
- 🅿️ **Split de pagos / marketplace de Mercado Pago** (OAuth, cada beneficiado conecta su MP, la plata va directo, donAR cobra su fee). Es el "conectar sin custodiar + comisión" real. Grande + depende del OK legal.
- 🅿️ **Pulir la historia con IA** al crear una causa. Necesita Edge Function + cuenta Anthropic con facturación. Costo por uso casi nulo.
- 🅿️ **Verificar dominio propio en Resend** para mandar mails a donantes reales (hoy el sender de prueba solo entrega al mail de la cuenta de Resend).
- ✅ **Actividad** (tab, 29 jul): ya no es placeholder. Feed real con 3 secciones: "Para revisar" (transferencias pendientes en mis causas), "Te llegaron" (aportes confirmados que recibí), "Tus aportes" (lo que doné). Ver Épica 9.
- 🅿️ **Consulta legal** sobre "conectar sin custodiar" (el supuesto más caro; fuera del código pero bloquea la etapa 2).
