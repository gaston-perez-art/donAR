# memory.md — Proyecto DonAR

Archivo vivo. Se lee al inicio de cada sesión y se actualiza al cerrar. Registra estado, decisiones tomadas, supuestos abiertos y próximos pasos. Complementa (no reemplaza) el "Paper fundacional" y el "Contexto del proyecto y como trabajo".

Última actualización: 26 de julio de 2026 (sesión: pulido a fondo del flujo de crear causa por feedback de Gastón; arranque de ranking mensual).

---

## 1. Qué es el proyecto (resumen de una línea)

DonAR: app móvil (Android/iOS) + landing web de colectas persona a persona, con verificación de la causa antes de publicarla, trazabilidad visible del dinero, y gamificación por reconocimiento. Foco inicial Argentina, idioma español.

---

## 2. Cómo trabajar con Gastón (recordatorio permanente)

- Al hueso: directo, sin relleno ni preámbulo.
- Nunca inventar: toda afirmación con sustento (fuente, archivo, doc, razonamiento). Los supuestos se marcan como supuestos.
- Trato profesional y medido (terapeuta con paciente).
- Preguntar antes de asumir si la decisión cambia el resultado; si es detalle menor con default obvio, tomarlo y avisar en una línea.
- Decisiones técnicas siempre con justificación y trade-offs (qué se resigna).
- Prohibido el guion largo (—) en cualquier texto.
- Se arranca por el problema y el usuario, no por la tecnología. Validar antes de invertir.
- Antes de codear: ficha del proyecto cerrada + stack propuesto con OK de Gastón.
- Cuando una tarea tiene varias piezas grandes (schema + storage + UI + pantalla nueva), armar y mostrar una lista de tareas para no perder el hilo, e ir marcando el avance real.

---

## 3. Estado general del proyecto

- **Etapa actual:** POC móvil con flujo de donación y curaduría real de punta a punta funcionando (feed → detalle → donar, y crear causa → evidencia → revisión de un curador → publicada). Falta integración real de pago (Mercado Pago) y verificación automática de identidad; ambas conscientemente fuera del MVP.
- **Repo:** carpeta local `~/Documents/donAR`, git en rama `main`, remoto `origin` = https://github.com/gaston-perez-art/donAR.git. Commitear directo a `main` es intencional para el POC (confirmado por Gastón, no hace falta rama+PR).
- **Documentos base:** Paper fundacional v0.2, manual de trabajo, y `Flujo de verificacion de causas.md` (v0.1, define qué verifica el curador y la máquina de estados). Copias también en `docs/` (CONTEXTO.md, paper-fundacional-donar.md, prototipo-donar.html).
- **Ficha del proyecto:** definida. Stack decidido (ver sección 4).

### Avance de rebanadas (código real, no solo README)
- [x] Base Expo corriendo + navegación por tabs con botón + centrado.
- [x] Feed de causas verificadas, con datos reales de Supabase (`causes_public`).
- [x] Detalle de causa + donación con registro en Supabase (pantallas `cause/[id]`, `donate/[id]`), con trazabilidad visible (lista de aportes).
- [x] Crear causa e2e con store local (`create.tsx`, `src/store/causes-store.tsx`).
- [x] **Curaduría real** (26 jul): la causa nace en estado `review`, no se auto-aprueba más. Se pide evidencia (DNI frente/dorso, selfie, documento de respaldo) subida a un bucket privado de Storage. Un curador (por ahora Gastón, marcado a mano con `profiles.is_curator`) la revisa en `/curar` y aprueba, rechaza o pide info. El creador ve el estado de su causa en el feed ("Tus causas") y en el detalle, con motivo si corresponde y botón para reenviar tras un "pedido de info".
- [x] Perfil único (donado + recibido), medallas y nivel con datos reales de Supabase.
- [x] **Identidad cross-device** (26 jul): vincular la sesión anónima a un mail real (código de 6 dígitos, no magic link, para no depender de deep linking en Expo Go). Permite recuperar el historial desde otro dispositivo. Requirió SMTP propio (Resend) porque Supabase no deja editar las plantillas de mail sin uno.
- [x] **Fotos de portada opcionales** (hasta 2, columna `image_urls text[]`, bucket público `cause-covers`): carrusel horizontal con puntitos en `cause-card` y `cause/[id]`; fallback al emoji + color si no hay ninguna. Reemplazó la `image_url` (una sola) del 25 jul.
- [x] **Pulido del flujo de crear causa** (26 jul, feedback de Gastón): fecha de cierre solo por calendario (iOS `display="inline"`, Android diálogo nativo; el spinner en Modal renderizaba vacío con la nueva arquitectura de RN) lo que elimina fechas inválidas; `minimumDate` fijo al montar (antes se recalculaba en cada render); monto y cierre en filas separadas con chips de monto sugerido editables; cobro con un solo campo "Alias o CBU" (método inferido: 22 dígitos = cbu); "volver" en cobro/review apunta al paso anterior del flujo (antes caía al tab activo).
- [x] Limpieza: eliminado todo el scaffold muerto del template de Expo (`app-tabs`, `themed-text/view`, `collapsible`, `animated-icon`, `use-theme`, `use-color-scheme`, `constants/theme.ts`) que nunca se conectó a la app real. `npx tsc --noEmit` corre sin errores.
- [x] **Curador y donante ya no comparten navegación** (26 jul): si la cuenta es curador, la app entera es el panel de curaduría (`src/screens/curar-screen.tsx`, ya no vive en `src/app/`, se decide en `_layout.tsx` antes de montar cualquier tab). "Cerrar sesión" (nuevo, `signOut` en el store) vuelve a una sesión anónima limpia para probar como donante. Perfil también tiene "Cerrar sesión" junto al mail vinculado.
- [x] **Modal de confirmación al enviar una causa a revisión** (26 jul): felicitación, frase, SLA (24 hs hábiles) y botón directo al estado de la causa. Antes navegaba al feed en silencio, sensación de "no pasó nada".
- [~] Ranking mensual + lógica de puntos: EN CURSO (arrancó 26 jul). Antes era placeholder "Próximamente".
- [ ] Actividad (placeholder, dice "Próximamente"). Decisión de Gastón: se deja TBD, valor post-MVP.
- [ ] Causa finalizada (happy / unhappy).
- [ ] Integración real de pago (Mercado Pago). Hoy `donate()` es un insert directo en Supabase, sin pasarela real (consistente con la decisión "MVP conecta, no custodia").
- [ ] Reenvío con edición real tras "pedido de info": hoy el botón "Reenviar a revisión" solo cambia el estado, no permite editar los datos de la causa antes de reenviar. Simplificación consciente, documentada como deuda.

### Estructura del repo (resumen)
`src/app/` rutas Expo Router: `index` (feed), `cause/[id]`, `donate/[id]`, `create`, `cobro`, `review`, `gracias`, `activity`/`ranking` (placeholders), `profile`. `_layout.tsx` decide antes de montar nada si la cuenta es curador; si lo es, renderiza `src/screens/curar-screen.tsx` directo (no es una ruta, es el modo completo de la app para esa identidad, sin tabs). `src/components/` (cause-card, donar-tab-bar, placeholder, ui/). `src/constants/donar-theme.ts` (única fuente de theme; `constants/theme.ts` viejo del scaffold, eliminado). `src/lib/supabase.ts` (cliente + auth: sesión anónima, vincular/loguear con mail y código, `signOut`, evidencia a Storage). `src/store/causes-store.tsx` (toda la data layer: causas, donaciones, actividad, curaduría, `isCurator`/`signOut`). `supabase/schema.sql` (esquema completo + migraciones al final, fecha por fecha). `scripts/seed-demo-cause.mjs` (siembra una causa que no es de quien lo corre, útil para probar donación sin que cuente como "recibido" propio).

### Infraestructura externa (fuera del repo, config manual en dashboards)
- **Supabase**: proyecto `fyaxvofpqqlvtudmnmxi`. Auth con sesiones anónimas por default, ascendidas a cuenta real por mail. Storage: bucket privado `cause-evidence` (RLS: solo dueño de la causa y curador leen). SQL Editor es la única vía de migración (no hay CLI linkeado ni service role key en el repo).
- **Resend**: SMTP custom para que Supabase pueda mandar mails con plantilla editada (código de 6 dígitos en vez de magic link). Sender de prueba `onboarding@resend.dev`, sin dominio propio verificado todavía: probablemente solo entrega al mail con el que Gastón se registró en Resend. Verificar dominio propio es un paso futuro si se necesita mandar a donantes reales.

### Versión de Expo (resuelto)
Usar Expo SDK 54, confirmado por Gastón.

---

## 4. Decisiones tomadas (con su porqué)

| Decisión | Qué se decidió | Por qué / qué se resigna |
|---|---|---|
| Flujo del dinero | Híbrido por etapas. MVP: la app conecta, no custodia (transferencia con comprobante o gateway que liquida directo al beneficiado). Etapa 2: custodia con retención automática del fee | MVP liviano en lo legal, valida demanda sin ser fintech regulada. Se resigna control sobre el dinero; se compensa con verificación y trazabilidad |
| Modelo de negocio | Fee = porcentaje sobre el total recaudado por causa que cierra. % exacto por definir, techo de percepción tolerable ~5% (referencia Maratea) | Alinea negocio con éxito de la causa. Se resigna: rinde poco hasta tener escala |
| Gamificación | MVP por reconocimiento no monetario (niveles, medallas, rachas, historial). Beneficios materiales de sponsors = fase 2 | Sin incentivo perverso; permite medir si vuelven por la causa o por el premio |
| Antifraude MVP | Curaduría manual: un curador humano aprueba/rechaza cada causa antes de publicar. Implementado en código el 26 jul: máquina de estados `review` → `needs_info`/`rejected`/`active`, con evidencia (DNI+selfie+documento) en Storage privado | A baja escala, ser el cuello de botella es fortaleza. Un solo curador marcado a mano (`profiles.is_curator`), sin sistema de roles: alcanza para uno |
| Identidad del donante | Sesión anónima por default (Supabase Auth), ascendible a cuenta real vinculando un mail. Código de 6 dígitos, no magic link | Un magic link no vuelve limpio a la app en Expo Go sin dev client; el código evita depender de deep linking. Se resigna un tap menos de fricción a cambio de que funcione hoy |
| Plataforma | App móvil (Android + iOS) + landing web | El público vive en el celular; la landing da credibilidad y permite compartir |
| Verificación: identidad | DNI (frente/dorso) + selfie con DNI, revisión manual del curador, archivos en Storage privado | Suficiente y barato a baja escala. Servicio externo (Renaper/biometría) = fase 2. Deuda: comparar a ojo no frena un documento falso bien hecho |
| Verificación: SLA | 24 hs hábiles para revisar una causa | Buena experiencia para necesidades urgentes. Primer número que presiona al escalar |
| Verificación: destino del dinero | Al CBU/alias del beneficiado. Curador ve el alias/método en `/curar` para verificarlo | Simple y encaja con "conectar sin custodiar" |
| Verificación: estados de causa | Borrador → En revisión → (Necesita info) → Publicada / Rechazada → Cerrada | "Necesita info" evita rechazar causas legítimas por un papel faltante |
| Verificación: qué juzga el curador | Solo verdad (identidad real, necesidad respaldada por doc de tercero, destino verificable). NO juzga si la causa "merece" | Evita el riesgo ético de jerarquizar dolores |
| Stack | Expo SDK 54 + React Native + Expo Router + TypeScript. StyleSheet con theme central (`src/constants/donar-theme.ts`). Backend: Supabase (DB + Auth + Storage). SMTP: Resend. Pagos: Mercado Pago (no integrado aún) | Un solo código iOS/Android, se prueba en celular con Expo Go sin cuenta Apple ni build nativo. Menos dependencias = menos mantenimiento |
| Google Sign-In | Evaluado y descartado por ahora | Requiere build nativo (EAS dev client) con credenciales OAuth, incompatible con correr todo por Expo Go. Se retoma cuando el proyecto pase a build nativo (va a pasar antes de subir a las stores) |
| Curador vs. donante | Identidades mutuamente excluyentes en la misma sesión. Si `is_curator`, la app entera es el panel de curaduría, nada de feed/crear/perfil de donante. `signOut` para volver a una sesión anónima y probar el otro lado | Son dos trabajos distintos, mezclarlos en una sola navegación confunde al testear. Se resigna que la misma persona no pueda ser curador y donante al mismo tiempo sin cerrar sesión, aceptable con un solo curador |
| Subida de evidencia a Storage | `fetch(uri).arrayBuffer()` en vez de `expo-file-system` (API `File`, nueva en SDK 54) | La API nueva fallaba en silencio y dejaba "Enviar a revisión" sin reaccionar. `fetch` + `arrayBuffer` es el patrón más probado para RN + Supabase Storage |

---

## 5. Supuestos abiertos (a validar, NO confirmados)

- **Regulatorio (el más caro):** que "conectar sin custodiar" no configure intermediación financiera regulada en Argentina (BCRA / registro PSP). A confirmar con abogado.
- **Fee:** el porcentaje inicial y su percepción con usuarios reales. Sin testear.
- **Nomenclatura:** "beneficiado" / "benefactor" son provisorios; testear nombres que no estigmaticen a quien pide antes de la UI.
- **Lista de causas vetadas:** propuesta (políticas/partidarias, deudas/juego, emprendimientos con fin de lucro, salud sin respaldo médico). Falta OK final de Gastón.
- **Umbral "monto alto" en salud** que dispara pago directo al proveedor: sin definir.
- **Detección de duplicados:** hoy a ojo del curador; falta criterio concreto.
- **Destino del excedente:** qué pasa con la plata que supera la meta de una causa. Sin definir. Hoy se permite donar de más con aviso neutro.
- **Nativo vs. web:** si el volumen inicial se sostiene con web responsive, se posterga el desarrollo nativo.
- **Reenvío tras "pedido de info" sin edición real:** el creador no puede editar los datos de la causa antes de reenviar, solo confirma que ya resolvió lo que se le pidió (por fuera de la app). Deuda a resolver si se prueba con gente real y se vuelve un problema.
- **Resend sin dominio propio:** el sender de prueba (`onboarding@resend.dev`) probablemente solo entrega al mail de la cuenta de Resend. No probado con un donante real todavía.

---

## 6. Hipótesis del MVP y cómo se miden

- **H1 (demanda del que pide):** causas creadas y % que completa la verificación en las primeras semanas.
- **H2 (demanda del que da):** conversión de visitante a donante, y % de causas que alcanzan la meta antes del cierre.
- **H3 (gamificación retiene por la causa):** % de donantes que vuelven a aportar a una segunda causa (sin premios materiales en MVP).

---

## 7. Alcance del MVP (recordatorio)

Dentro: (1) publicar causa, (2) verificación por curaduría manual, (3) donar y registrar aporte, (4) trazabilidad visible, (5) gamificación por reconocimiento.

Fuera por ahora: custodia de fondos y regulación asociada, beneficios materiales/sponsors, verificación automática a escala, ranking público competitivo, retiros/wallets/saldo interno, integración real de pago (Mercado Pago), edición de causa al reenviar tras pedido de info.

---

## 8. Próximos pasos

1. Confirmar con abogado el encuadre regulatorio de "conectar sin custodiar". (Sigue pendiente, es el supuesto que más puede cambiar el modelo.)
2. Definir el fee inicial y testear su percepción.
3. OK final de Gastón sobre la lista de causas vetadas.
4. Probar el flujo de curaduría real con una causa ajena de punta a punta (crear con otra sesión, revisar como curador, aprobar/rechazar/pedir info) y confirmar que la experiencia se siente sólida.
5. Ranking mensual + lógica de puntos. ← EN CURSO.
6. Causa finalizada (happy / unhappy).
7. Pulir la historia con IA al crear una causa. DECISIÓN 26 jul: pospuesto. Costo por uso es casi nulo (Haiku 4.5, fracción de centavo por historia); lo caro es la infraestructura: NO se puede llamar a la API de Anthropic directo desde la app (expondría la clave), hay que interponer una Supabase Edge Function que guarde la API key como secreto, y Gastón necesita cuenta propia en Anthropic con facturación. Se retoma cuando él lo decida.
8. Evaluar si conviene edición real en el reenvío tras "pedido de info", o si alcanza con el flujo actual (reenviar tal cual) para esta etapa de pruebas.
9. Verificar un dominio propio en Resend si se necesita mandar mails a donantes reales (no solo a Gastón).
10. Integración real de pago (Mercado Pago) cuando el flujo esté validado con gente real.

---

## 9. Registro de sesiones (log)

### 26 jul 2026 (sesión 8, noche)
- **Pulido a fondo del flujo de crear causa**, todo por feedback de Gastón probando en su iPhone:
  - Datepicker roto (renderizaba una barra gris vacía): causa = `display="spinner"` dentro de un `Modal` con la nueva arquitectura de RN. Fix: la fecha se elige SOLO tocando el campo (se sacó el input de texto libre), iOS usa `display="inline"` (calendario), Android su diálogo nativo. Bonus: `minimumDate` estaba inline (`new Date()`) y se recalculaba en cada render corriendo el mínimo mientras se giraba la rueda; ahora fijo al montar con `useState(() => startOfToday())`.
  - Validación de fecha: al ser solo-picker con mínimo=hoy es imposible ingresar una inválida (22/22 o pasada). El gate de abajo lista "Falta: una fecha de cierre válida".
  - Montos pre-seteados se mezclaban con la fecha: separados en filas independientes (Monto+chips / Fecha), a sugerencia de Gastón. Chips de monto ($100k/$500k/$1M/$3M) que rellenan pero dejan editar.
  - Cobro: sacado el selector Mercado Pago/CBU (era redundante, mismo campo de texto). Ahora un solo input "Alias o CBU"; el método se infiere (regex 22 dígitos = cbu, si no = mp) para que curador/review sigan mostrando la etiqueta correcta.
  - "Crash" al volver atrás en la confirmación: NO era crash, `router.back()` caía al tab activo (create/cobro/review son pantallas hermanas del mismo Tab, no una pila). Fix: cada "volver" apunta al paso anterior explícito (`router.replace('/create')` etc). Como todo cuelga del mismo `draft`, editar ya funcionó sin más.
  - Fotos de portada (feedback: "estaría bueno subir 1-2 y verlas como carrusel"): implementado. Hasta 2, opcionales, bucket público `cause-covers`, columna `image_urls text[]` (reemplazó `image_url`). Carrusel horizontal con `ScrollView pagingEnabled` + puntitos en `cause-card` y `cause/[id]`; fallback emoji+color. Subida con `uploadCoverPhoto` (fetch+arrayBuffer, mismo patrón que la evidencia). Seed actualizado. `expo-file-system`/`base64-arraybuffer` ya se habían sacado en la sesión anterior.
  - Historia con IA: Gastón preguntó por pulir la historia con IA. Se le explicó (con la skill claude-api cargada para no inventar números): costo por uso casi nulo, pero necesita Edge Function + su cuenta Anthropic. DECIDIÓ posponerlo (ver Próximos pasos #7).
- **Aprendizaje de infra Supabase (Resend, del feedback previo):** Supabase ya no deja editar plantillas de mail sin un SMTP propio configurado. Por eso hubo que dar de alta Resend (gratis, sin tarjeta) para que el código de 6 dígitos (`{{ .Token }}`) funcione. El sender de prueba `onboarding@resend.dev` probablemente solo entrega al mail de la cuenta de Resend.
- **Patrón de migraciones idempotentes:** una migración con `drop column ... / update ... array[col_vieja]` falla si ya se corrió antes (la columna vieja ya no existe). Aprendizaje: al pasarle una migración a Gastón para re-correr, hacerla idempotente (`add if not exists`, `drop if exists`, `drop policy if exists` antes de `create policy`, `on conflict do nothing` en buckets). Pasó con `cause-covers`.

### 26 jul 2026 (sesión 7, mañana/tarde)
- Priorización con matriz esfuerzo/impacto de los pendientes del backlog; Gastón eligió avanzar con identidad cross-device (#3), limpieza de código muerto (#5) y curaduría real (#6), en ese orden.
- **#5 limpieza:** eliminado todo el scaffold del template de Expo sin uso real (`app-tabs`, `app-tabs.web`, `themed-text/view`, `hint-row`, `web-badge`, `ui/collapsible`, `animated-icon` + variantes, `hooks/use-theme`, `hooks/use-color-scheme` + variantes, `constants/theme.ts`), confirmado que nada en `src/app/` los importaba. `data/causes.ts` (mock) reemplazado por solo el tipo `Cause`, ya no se usa como datos. `npx tsc --noEmit` pasó de ~15 errores a limpio.
- **#3 identidad cross-device:** implementado vincular/recuperar cuenta por mail con código de 6 dígitos (no magic link, por la limitación de deep linking en Expo Go). Nuevas funciones en `src/lib/supabase.ts`: `linkEmail`, `confirmLinkEmail`, `loginWithEmail`, `confirmLogin`. UI en `profile.tsx` (componente `AccountLink`). Requirió configurar SMTP custom (Resend, gratis) porque Supabase no deja editar plantillas de mail (para exponer `{{ .Token }}`) sin uno propio. Gastón vinculó su mail real y quedó operativo.
- **#6 curaduría real:** la causa ya no se auto-aprueba. Nuevo esquema: `profiles.is_curator`, `causes.review_note`/`reviewed_at`, estados `needs_info`/`rejected` sumados al enum, tabla `cause_evidence` (DNI frente/dorso, selfie, documento de respaldo) y bucket privado de Storage `cause-evidence`, todo con RLS (dueño + curador). `create.tsx` pide las 4 fotos con `expo-image-picker`. Nueva pantalla de curador: cola de causas pendientes, ve la evidencia con URLs firmadas, botones Aprobar/Rechazar/Pedir info. El creador ve el estado en el feed ("Tus causas") y en el detalle de su causa, con el motivo si corresponde y botón "Reenviar a revisión" para `needs_info` (reenvía tal cual, sin edición, deuda documentada). Gastón se marcó a sí mismo como curador vía SQL puntual después de vincular su mail.
- **Seed de prueba:** creado `scripts/seed-demo-cause.mjs`, siembra una causa a nombre de una sesión anónima nueva (no la de quien lo corre), para poder donar sin que cuente como "recibido" propio. Corrido una vez en la base real.
- **QA de Gastón sobre lo construido**, todo resuelto en la misma sesión:
  - Header del modal de evidencia en `/curar` tapado por el Dynamic Island del iPhone 14 Pro → `SafeAreaView` no calcula bien el inset dentro de un `Modal` de React Native; arreglado con `useSafeAreaInsets()` explícito en el header del modal.
  - Subida de evidencia muy lenta → las 4 fotos subían secuencialmente; cambiado a `Promise.all` (paralelo). Sumado spinner real ("Subiendo evidencia...") en vez de solo texto.
  - Botón de "Enviar a revisión" se quedaba tildado en un segundo intento → mismo bug de clase que ya había pasado con el botón de donar (pantallas de Tab no se desmontan, `submitting` quedaba en `true` después de un envío exitoso). Arreglado con `useFocusEffect` reseteando el estado al enfocar. **Patrón a recordar:** cualquier estado local de "submitting/loading" en una pantalla que vive en un Tab necesita resetearse en focus, no solo en el catch de error.
  - Pantalla de cobro (`cobro.tsx`) prometía "Vincular Mercado Pago" pero era el mismo campo de texto libre que CBU, sin conexión real → renombrado a "Alias de Mercado Pago" / "CBU o alias bancario", copy honesto sobre lo que realmente pasa (no se construyó integración real, fuera de alcance).
  - Confirmado (sin cambios, ya andaba bien): una causa `en revisión` nunca llega al feed de otros usuarios, ni siquiera a nivel de los permisos de la base (RLS); solo la ve quien la creó, en su propia sección "Tus causas".
- **Separar curador y donante** (a pedido de Gastón, misma sesión): mezclar ambos roles en la misma navegación "quedaba una ensalada" para probar. Rediseño de `_layout.tsx`: decide una sola vez, antes de montar nada, si la cuenta es curador (`isCurator` del store) y en ese caso renderiza directo el panel de curaduría, sin tabs. El panel se movió de `src/app/curar.tsx` a `src/screens/curar-screen.tsx` (ya no es una ruta navegable, es un modo completo de la app; por eso también perdió su dependencia de `useRouter`/`useFocusEffect`, que rompía al no vivir dentro de un navigator). `signOut` nuevo en el store cierra sesión y arranca una anónima limpia, para poder alternar "probar como curador" / "probar como donante" en el mismo celular. Sacado el botón "Panel de curador" de Perfil (dead code, un curador nunca llega ahí); agregado "Cerrar sesión" junto al mail vinculado.
- **Bug: "Enviar a revisión" no hacía nada.** Causa raíz: la subida de evidencia usaba la API `File` de `expo-file-system` (nueva en el SDK 54), que podía fallar sin ningún error visible; si fallaba dentro del `Promise.all`, `publishDraft` quedaba sin resolver de forma clara y el botón parecía muerto. Arreglado reescribiendo `uploadEvidence` con `fetch(uri).arrayBuffer()` (patrón mucho más probado para RN + Supabase Storage), envuelto en try/catch, y sacadas las dependencias `expo-file-system`/`base64-arraybuffer`. De paso: `review.tsx` con try/catch/finally + `Alert` si falla (antes fallaba en silencio); `create.tsx` ahora lista qué falta ("Falta: DNI dorso, Selfie...") en vez de solo deshabilitar el botón sin explicar, y avisa si el permiso de fotos está denegado.
- **Modal de confirmación al enviar una causa**, a pedido de Gastón ("si no queda una sensación vacía"): en vez de navegar en silencio al feed tras publicar, `review.tsx` muestra un modal con felicitación, una frase al azar, el SLA (24 hs hábiles) y un botón que lleva directo al detalle de la causa recién creada (que ya muestra el estado "en revisión"). De paso, corregida una inconsistencia: el texto de la pantalla decía "menos de 48 hs", el SLA documentado es 24 hs hábiles.

### 25 jul 2026 (sesión 6)
- Primera charla de validación del proyecto: no es una pavada, hay demanda real (precedente Maratea), pero el supuesto regulatorio sigue siendo el que más puede cambiar el modelo.
- Backlog priorizado con matriz esfuerzo (tokens estimados) x impacto (valor para el objetivo de hoy: flujo de donación + visualización de un donante).
- Bug de QA de Gastón: todas las causas eran propias, entonces donar quedaba igual a recibido, imposible de testear la distinción. Resuelto: sumado soporte de imagen ilustrativa (`image_url`, con fallback a emoji+color) y creado `scripts/seed-demo-cause.mjs` para sembrar una causa ajena.
- Confirmado que el detalle de causa ya mostraba trazabilidad (aportes recientes) correctamente, sin cambios necesarios.
- Placeholder de Ranking/Actividad: texto cambiado de "Próxima rebanada" a "Próximamente" (a pedido de Gastón). Actividad se deja TBD, valor post-MVP.
- `supabase/schema.sql` reorganizado con una sección de migraciones al final, fecha por fecha, para no tener que repegar el archivo entero cada vez (patrón que se repitió en la sesión siguiente).

### 24 jul 2026 (sesión 5)
- Corregido `AGENTS.md`: punto de entrada para Claude Code / Cowork, apunta a memory.md, fija SDK 54, reglas de trabajo de Gastón, git directo a main OK.
- Creada skill de estilo en el repo: `.claude/skills/estilo-gaston/SKILL.md`.
- Continuidad Cowork -> Claude Code: el chat no se transfiere, pero todo lo importante vive en el repo (memory.md, docs/, AGENTS.md, skill de estilo).

### 24 jul 2026 (sesión 4)
- DECISIÓN de producto: la meta de una causa es un OBJETIVO, no un techo. Se puede donar aunque la causa ya llegó o supere la meta, con aviso al donante. Causas SIN monto = descartadas para el MVP.
- Implementado en `donate/[id].tsx`: aviso inline + confirmación al superar la meta.
- PENDIENTE (legal + trazabilidad): destino del excedente cuando una causa supera su meta. Hasta definirlo, el aviso es neutro.

### 24 jul 2026 (sesión 3)
- Perfil: medallas tapeables con modal (estado + frase de altruismo al azar).
- Donar: agregado monto personalizado.
- BUG RESUELTO "no se podía volver a donar": pantallas de Tabs no se desmontan, `submitting=true` quedaba para siempre. Fix con `useFocusEffect`. Este mismo patrón de bug volvió a aparecer el 26 jul en `review.tsx`; queda como algo a revisar por default en cualquier pantalla nueva con estado de envío.

### 24 jul 2026 (sesión 2, tarde)
- Construida pantalla de Perfil: donado + recibido, medallas y nivel, derivado de datos reales de Supabase.
- Agregado `getMyActivity()` al store.

### 24 jul 2026 (sesión 1)
- Retomado el proyecto. Revisados paper fundacional y manual de trabajo.
- Creado este memory.md.
- Diseñado el flujo de verificación de causas v0.1 (documento aparte), implementado en código recién el 26 jul.
- Descubierto que el repo ya tenía POC avanzado (Expo + Supabase) antes de esta ronda de sesiones.

---

## 10. Persistencia (cómo se guarda esto)

Este archivo vive en la carpeta local `~/Documents/donAR`. Claude lo lee al arrancar y lo actualiza al cerrar cada sesión, sin intervención de Gastón.

## 11. Pendientes / dudas para Gastón

- OK final sobre la lista de causas vetadas (sección 5).
- Definir si vale la pena construir edición real en el reenvío tras "pedido de info", o si el flujo actual alcanza por ahora.
- Decidir cuándo verificar un dominio propio en Resend (necesario para mandar mails a donantes reales, no solo a Gastón).
