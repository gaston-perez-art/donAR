# memory.md — Proyecto DonAR

Archivo vivo. Se lee al inicio de cada sesión y se actualiza al cerrar. Registra estado, decisiones tomadas, supuestos abiertos y próximos pasos. Complementa (no reemplaza) el "Paper fundacional" y el "Contexto del proyecto y como trabajo".

Última actualización: 24 de julio de 2026 (sesión: flujo de verificación).

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

---

## 3. Estado general del proyecto

- **Etapa actual:** construcción del POC móvil en marcha (NO es solo definición de producto: ya hay código funcionando).
- **Repo:** carpeta local `~/Documents/donAR`, git en rama `main`, remoto `origin` = https://github.com/gaston-perez-art/donAR.git. Local sincronizado con `origin/main` (commit c39ca02 al 24 jul 2026). CONFIRMADO por Gastón: commitear directo a `main` es intencional para el POC (no hace falta rama+PR). CONFIRMADO: Expo SDK 54 es el correcto (ignorar la mención a v57 en AGENTS.md).
- **Documentos base:** Paper fundacional v0.2 y manual de trabajo. Copias también dentro del repo en `docs/` (CONTEXTO.md, paper-fundacional-donar.md, prototipo-donar.html).
- **Ficha del proyecto:** definida. Stack decidido (ver sección 4).

### Avance de rebanadas (código real, no solo README)
- [x] Base Expo corriendo + navegación por tabs con botón + centrado.
- [x] Feed de causas verificadas (arrancó con mock; hay `src/data/causes.ts`).
- [x] Detalle de causa + donación con registro en Supabase (pantallas `cause/[id]`, `donate/[id]`).
- [x] Crear causa e2e + store local (`create.tsx`, `src/store/causes-store.tsx`).
- [~] Cobro (`cobro.tsx`) y pantalla de gracias (`gracias.tsx`) y review (`review.tsx`) presentes; revisar estado real.
- [x] Perfil único (donado + recibido), medallas y nivel con datos reales de Supabase (24 jul). Falta commitear (ver nota abajo).
- [ ] Ranking mensual + lógica de puntos (placeholder).
- [ ] Causa finalizada (happy / unhappy).

### Estructura del repo (resumen)
`src/app/` rutas Expo Router (index=feed, cause/[id], donate/[id], create, cobro, gracias, review, activity, ranking, profile, explore). `src/components/` (cause-card, tab bar, ui). `src/constants/` (donar-theme, theme). `src/lib/supabase.ts`. `src/store/causes-store.tsx`. `supabase/schema.sql`.

### Versión de Expo (resuelto)
Usar Expo SDK 54, confirmado por Gastón. La mención a v57 en AGENTS.md se ignora.

---

## 4. Decisiones tomadas (con su porqué)

| Decisión | Qué se decidió | Por qué / qué se resigna |
|---|---|---|
| Flujo del dinero | Híbrido por etapas. MVP: la app conecta, no custodia (transferencia con comprobante o gateway que liquida directo al beneficiado). Etapa 2: custodia con retención automática del fee | MVP liviano en lo legal, valida demanda sin ser fintech regulada. Se resigna control sobre el dinero; se compensa con verificación y trazabilidad |
| Modelo de negocio | Fee = porcentaje sobre el total recaudado por causa que cierra. % exacto por definir, techo de percepción tolerable ~5% (referencia Maratea) | Alinea negocio con éxito de la causa: la app cobra solo cuando el dinero llega. Se resigna: rinde poco hasta tener escala |
| Gamificación | MVP por reconocimiento no monetario (niveles, medallas, rachas, historial). Beneficios materiales de sponsors = fase 2 | Sin incentivo perverso; permite medir si vuelven por la causa o por el premio |
| Antifraude MVP | Curaduría manual: un curador humano aprueba/rechaza cada causa antes de publicar | A baja escala, ser el cuello de botella es fortaleza. Se resigna escalabilidad (se sistematiza en fase 2) |
| Plataforma | App móvil (Android + iOS) + landing web | El público vive en el celular; la landing da credibilidad y permite compartir. Supuesto: si el volumen inicial se sostiene con web responsive, se posterga lo nativo |
| Verificación: identidad | DNI (frente/dorso) + selfie con DNI, revisión manual del curador | Suficiente y barato a baja escala. Servicio externo (Renaper/biometría) = fase 2. Deuda: comparar a ojo no frena un documento falso bien hecho |
| Verificación: SLA | 24 hs hábiles para revisar una causa | Buena experiencia para necesidades urgentes. Costo: exige disponibilidad casi diaria del curador; primer número que presiona al escalar |
| Verificación: destino del dinero | Al CBU/alias del beneficiado, a nombre del mismo DNI. Destino declarado queda registrado y visible. Pago directo al proveedor opcional para salud de monto alto | Simple y encaja con "conectar sin custodiar". Se resigna garantía de uso; se mitiga con identidad expuesta + trazabilidad pública |
| Verificación: estados de causa | Borrador → En revisión → (Necesita info) → Publicada / Rechazada → Cerrada | "Necesita info" evita rechazar causas legítimas por un papel faltante |
| Verificación: qué juzga el curador | Solo verdad (identidad real, necesidad respaldada por doc de tercero, destino verificable). NO juzga si la causa "merece" | Evita el riesgo ético de jerarquizar dolores |
| Stack | Expo SDK 54 + React Native + Expo Router + TypeScript. StyleSheet con theme central (`src/constants/donar-theme.ts`), sin librería de estilos extra. Backend: Supabase. Pagos: Mercado Pago | Un solo código iOS/Android, reutiliza React/JS, se prueba en celular con Expo Go sin cuenta Apple. SDK fijado en 54 por compatibilidad con Expo Go de la App Store. Menos dependencias = menos mantenimiento |

---

## 5. Supuestos abiertos (a validar, NO confirmados)

- **Regulatorio (el más caro):** que "conectar sin custodiar" no configure intermediación financiera regulada en Argentina (BCRA / registro PSP). A confirmar con abogado. Es el supuesto que puede cambiar todo.
- **Fee:** el porcentaje inicial y su percepción con usuarios reales. Sin testear.
- **Nomenclatura:** "beneficiado" / "benefactor" son provisorios; testear nombres que no estigmaticen a quien pide antes de la UI.
- **Lista de causas vetadas:** propuesta (políticas/partidarias, deudas/juego, emprendimientos con fin de lucro, salud sin respaldo médico). Falta OK final de Gastón.
- **Umbral "monto alto" en salud** que dispara pago directo al proveedor: sin definir.
- **Detección de duplicados:** hoy a ojo del curador; falta criterio concreto.
- **CBU de terceros:** su encuadre legal entra en la consulta con abogado sobre "conectar sin custodiar".
- **Destino del excedente:** qué pasa con la plata que supera la meta de una causa. Sin definir. Trazabilidad + legal (abogado). Hoy se permite donar de más con aviso neutro.
- **Nativo vs. web:** si el volumen inicial se sostiene con web responsive, se posterga el desarrollo nativo.

---

## 6. Hipótesis del MVP y cómo se miden

- **H1 (demanda del que pide):** causas creadas y % que completa la verificación en las primeras semanas.
- **H2 (demanda del que da):** conversión de visitante a donante, y % de causas que alcanzan la meta antes del cierre.
- **H3 (gamificación retiene por la causa):** % de donantes que vuelven a aportar a una segunda causa (sin premios materiales en MVP).

---

## 7. Alcance del MVP (recordatorio)

Dentro: (1) publicar causa, (2) verificación por curaduría manual, (3) donar y registrar aporte, (4) trazabilidad visible, (5) gamificación por reconocimiento.

Fuera por ahora: custodia de fondos y regulación asociada, beneficios materiales/sponsors, verificación automática a escala, ranking público competitivo, retiros/wallets/saldo interno.

---

## 8. Próximos pasos (del paper, sección 13)

1. Confirmar con abogado el encuadre regulatorio de "conectar sin custodiar".
2. Definir el fee inicial y testear su percepción.
3. Diseñar el flujo de verificación de causas con criterios concretos. ← HECHO (v0.1, doc "Flujo de verificacion de causas.md"). Falta OK final de la lista de vetos.
4. Prototipar el recorrido de una causa punta a punta. ← EN CÓDIGO: feed → detalle → donación con Supabase ya andan; crear causa e2e también.
5. Elegir stack y construir por rebanadas verticales. ← STACK ELEGIDO (Expo/Supabase/MP). Construcción por rebanadas en curso.

### Rebanadas siguientes (código)
- Conectar el flujo de verificación diseñado (v0.1) con las pantallas `create` → `review` → publicación.
- Perfil único (donado + recibido) y Actividad.
- Ranking mensual + lógica de puntos de gamificación.
- Causa finalizada (happy / unhappy).
- Resolver inconsistencia Expo SDK 54 vs. AGENTS.md (v57).

---

## 9. Registro de sesiones (log)

### 24 jul 2026 (sesión 5)
- Corregido `AGENTS.md`: ahora es el punto de entrada para Claude Code / Cowork. Apunta a memory.md como fuente de verdad, fija SDK 54, reglas de trabajo de Gastón, git directo a main OK, y nota de los errores TS preexistentes. Reemplazó la nota vieja y errónea de Expo v57.
- Creada skill de estilo en el repo: `.claude/skills/estilo-gaston/SKILL.md` (con frontmatter name+description). Así Claude Code la levanta sola al abrir el proyecto. Es la versión viva y compartida entre Cowork y Claude Code.
- Aclaración honesta a Gastón: una skill no se autoactualiza sola; se edita en el lugar cuando corrige un borrador o dice "no suena a mí". La sección "Mantenimiento" de la skill lo deja escrito.
- Continuidad Cowork -> Claude Code: el chat en sí no se transfiere, pero todo lo importante vive en el repo (memory.md, docs/, AGENTS.md, skill de estilo). Abrir Claude Code en ~/Documents/donAR y pedir "leé memory.md y AGENTS.md".

### 24 jul 2026 (sesión 4)
- DECISIÓN de producto: la meta de una causa es un OBJETIVO, no un techo. Se puede donar aunque la causa ya llegó o supere la meta, siempre CON AVISO al donante (Gastón lo eligió). Causas SIN monto = descartadas para el MVP (la meta es lo que ancla la verificación, la UX y evita la colecta abierta tipo Maratea).
- NUEVO PENDIENTE (importante): definir el DESTINO DEL EXCEDENTE cuando una causa supera su meta. Es pregunta de trazabilidad + legal; entra en la consulta con el abogado. Hasta definirlo, el aviso al donante es neutro (el aporte suma y queda registrado) y NO promete ningún mecanismo de excedente.
- Implementado en `donate/[id].tsx`: aviso inline cuando el monto supera la meta + Alert de confirmación ("Donar igual" / "Cambiar monto"), permitiendo siempre. Validación de monto > 0 ya estaba.
- Bug reportado por Gastón que originó esto: se podía donar más que la meta sin ningún aviso.

### 24 jul 2026 (sesión 3)
- Perfil: medallas ahora tapeables, abren un modal lindo con la medalla (estado desbloqueada/bloqueada) y una frase de altruismo al azar (array `ALTRUISM_PHRASES` en `profile.tsx`).
- Donar: agregado monto personalizado (input numérico "Otro monto" que deselecciona los chips y valida > 0).
- BUG RESUELTO "no se podía volver a donar": raíz = la pantalla vive dentro de un `Tabs` (no se desmonta), y tras confirmar quedaba `submitting=true` para siempre, dejando el botón disabled. Fix: `useFocusEffect` resetea el estado al tomar foco + `setSubmitting(false)` antes de navegar. Aprendizaje general: en este proyecto las pantallas de Tabs conservan estado entre visitas; resetear en focus si hace falta.
- Archivos tocados: `src/app/profile.tsx`, `src/app/donate/[id].tsx`. Typecheck limpio en los míos.

### 24 jul 2026 (sesión 2, tarde)
- Construida pantalla de Perfil (`src/app/profile.tsx`): donado + recibido, medallas (primer aporte, 3 causas, 10 causas, meta cumplida) y nivel (Solidario/Comprometido/Referente), todo derivado de datos reales de Supabase.
- Agregado al store `getMyActivity()` y tipos `MyContribution` / `MyActivity` (`src/store/causes-store.tsx`).
- Typecheck: mis archivos limpios. El repo tiene errores TS preexistentes (animated-icon, app-tabs, collapsible, use-theme, mock data/causes.ts sin `story`) que NO frenan a Metro. No los toqué (fuera de alcance).
- PENDIENTE COMMIT: no se pudo commitear desde la sesión (`.git/index.lock` bloqueado por permisos del mount). Gastón lo hace: `rm -f .git/index.lock && git add src/app/profile.tsx src/store/causes-store.tsx && git commit -m "..."`.
- Confirmado: SDK 54 correcto, commit directo a main correcto. Local sincronizado con origin/main.

### 24 jul 2026 (sesión 1)
- Retomamos el proyecto. Revisados paper fundacional y manual de trabajo.
- Creado este memory.md.
- Diseñado el flujo de verificación de causas (paso 3), v0.1. Documento: "Flujo de verificacion de causas.md".
- Decisiones cerradas: identidad DNI+selfie manual, SLA 24 hs hábiles, dinero al CBU del beneficiado verificado, máquina de estados con "Necesita info", el curador verifica verdad y no mérito.
- Pendiente: OK final de Gastón sobre la lista de causas vetadas.
- Conectada carpeta local `~/Documents/donAR` con escritura: el memory vive y se actualiza ahí solo.
- CORRECCIÓN: descubierto que el repo ya tiene POC avanzado (Expo + Supabase, 4 commits). Actualizadas secciones 3, 4 y 8 con el estado real.
- Próxima sesión sugerida: conectar el flujo de verificación (v0.1) con las pantallas create/review, o seguir con perfil/actividad/ranking.

---

## 10. Persistencia (cómo se guarda esto)

Este archivo vive en la carpeta local `~/Documents/donAR`, conectada a las sesiones con permiso de escritura. Claude lo lee al arrancar y lo actualiza al cerrar cada sesión, sin intervención de Gastón. La copia importada de solo lectura del proyecto "App solidaria" en Claude.ai sirve de contexto de fondo, pero la versión viva es esta.

## 11. Pendientes / dudas para Gastón

- OK final sobre la lista de causas vetadas (sección 5 de este memory).
