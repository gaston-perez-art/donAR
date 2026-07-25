# DonAR: guía para agentes (Claude Code / Cowork)

Leé esto al iniciar. Es el punto de entrada del proyecto.

## Primero que nada: leé el estado

Antes de tocar nada, leé **`memory.md`** en la raíz. Ahí está el estado real del proyecto: decisiones tomadas (con su porqué), supuestos abiertos, log de sesiones y próximos pasos. Es la fuente de verdad viva. Al terminar una sesión, actualizalo.

Contexto de fondo en `docs/`: `paper-fundacional-donar.md` (qué es y por qué), `CONTEXTO.md` (manual de trabajo) y `prototipo-donar.html`.

## Stack (no re-decidir)

Expo **SDK 54** + React Native + Expo Router + TypeScript. Estilos con StyleSheet y theme central en `src/constants/donar-theme.ts` (sin librerías de estilo extra). Backend: Supabase (`src/lib/supabase.ts`). Pagos: Mercado Pago.

SDK fijado en 54 por compatibilidad con la versión de Expo Go de la App Store. **No subir de versión sin acordarlo.**

## Cómo trabaja Gastón (reglas duras)

- Al hueso: directo, sin relleno ni preámbulo.
- Nunca inventar: toda afirmación con sustento (archivo, doc oficial, razonamiento). Los supuestos se marcan como supuestos.
- Trato profesional y medido.
- Preguntar antes de asumir si la decisión cambia el resultado; si es detalle menor con default obvio, tomarlo y avisar en una línea.
- Decisiones técnicas con justificación y trade-offs (qué se resigna).
- Prohibido el guion largo en cualquier texto.
- Español para todo. Comentarios y nombres de variables en inglés; texto de UI en español.
- Para redactar cualquier texto en nombre de Gastón, usar la skill de estilo en `.claude/skills/estilo-gaston/`.

## Git

Rama `main`, remoto `origin` = https://github.com/gaston-perez-art/donAR.git. Commitear **directo a `main` está OK** para este POC (decisión de Gastón, no hace falta rama + PR). Commits chicos y descriptivos. Nunca subir secretos: la key de Supabase en `src/lib/supabase.ts` es la publishable (pública, segura en cliente); la service/secret key NUNCA va al repo.

## Verificar antes de decir "listo"

Correr `npx tsc --noEmit` para el código nuevo. Nota: el repo arrastra errores TS preexistentes del template de Expo (animated-icon, app-tabs, collapsible, use-theme, mock `data/causes.ts` sin `story`) que no frenan a Metro; enfocarse en que los archivos tocados queden limpios.
