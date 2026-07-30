# DonAR

App P2P de colectas solidarias con curaduría de causas, gamificación por reconocimiento y trazabilidad del dinero como eje de confianza. Este repo es el POC móvil (iPhone y Android) para salir a validar.

Documento fundacional, contexto y prototipo de diseño en `docs/` (`paper-fundacional-donar.md`, `CONTEXTO.md`, `prototipo-donar.html`). Backlog vivo en `docs/BACKLOG.md`.

## Stack

- **Expo (SDK 54) + React Native**: un solo código para iOS y Android. Elegido porque reutiliza conocimiento de web (JS/React) y permite probar en el celular vía Expo Go sin cuenta de Apple. Fijado en SDK 54 para que sea compatible con la versión de Expo Go disponible hoy en la App Store.
- **Expo Router**: ruteo por archivos (estándar actual de Expo).
- **TypeScript**: chequeo de tipos, más seguro de mantener.
- **StyleSheet + theme central** (`src/constants/donar-theme.ts`): sin librerías de estilo extra, menos dependencias.
- **UI premium de la tab bar**: pill flotante de vidrio (`expo-blur`) con íconos vectoriales (`@expo/vector-icons`, ya incluido en Expo) y "shrink on scroll" con el `Animated` nativo de React Native. El blur real corre en iOS; en Android se usa un vidrio translúcido sólido (el método de blur en runtime crashea en las transiciones). El Liquid Glass nativo de iOS 26 queda para el build nativo.

Decisiones y trade-offs completos: ver el paper fundacional.

## Cómo correr

Requisitos: Node 20+ y la app **Expo Go** en tu celular (gratis, desde App Store o Play Store).

```bash
npm install
npx expo start
```

Si el teléfono y la compu están en la **misma red WiFi**, escaneá el QR con la cámara (iOS) o desde adentro de Expo Go ("Scan QR code", en Android). Si están en **redes distintas** (por ejemplo, para probar con otra persona), levantá el server con túnel:

```bash
npx expo start --tunnel
```

Backend (Supabase, Storage, Mercado Pago) se configura fuera del repo, en sus dashboards. Los secretos van en variables de entorno, nunca en el código.

## Estado actual (rebanadas verticales)

POC funcionando de punta a punta, con datos reales de Supabase (no mock).

- [x] Feed de causas verificadas (datos reales de Supabase)
- [x] Detalle de causa + trazabilidad visible (lista de aportes)
- [x] Crear causa e2e + fotos de portada opcionales (carrusel)
- [x] **Login obligatorio** (mail + contraseña): todo (donar, crear, recibir) queda atado a una cuenta que persiste. No hay sesiones anónimas
- [x] **Curaduría real**: la causa nace en `review`, un curador humano aprueba / rechaza / pide info tras revisar la evidencia (DNI + selfie + documento) subida a Storage privado
- [x] **Panel de "mi causa"** (vista del creador): recaudado / meta, aportes recibidos, compartir
- [x] **Dos métodos de pago**: transferencia con comprobante (canónico del MVP) + Mercado Pago (apagado con flag, ver Encuadre legal)
- [x] **Confirmación de la transferencia por el beneficiado**: sube comprobante → entra `pending` → el beneficiado confirma "me llegó" → recién ahí suma a la meta y a los puntos
- [x] **Aporte voluntario a donAR** (modelo GoFundMe) en la pantalla post-transferencia
- [x] Perfil único (donado + recibido, tapeables con historial completo), medallas y nivel
- [x] Ranking mensual + lógica de puntos (fórmula del paper)
- [x] **Actividad**: feed real (transferencias por confirmar, aportes recibidos, aportes que hice, agradecimientos). Notificaciones push quedan para cuando el proyecto tenga build nativo (no funcionan en Expo Go desde el SDK 53)
- [x] **Cierre de causa**: llega a la meta → `completed` (corta donaciones nuevas), vence el plazo sin llegar → `closed`. Se evalúa client-side (Expo Go no tiene cron), sin servidor
- [x] **Mini-reporte + agradecimiento al cerrar**: cuánto se juntó / cuántas personas / en cuánto tiempo; mensaje de cierre del beneficiado (texto + foto) y agradecimiento puntual por aporte, visibles en el detalle de la causa y en Actividad
- [x] **Auto-confirmación de transferencias a las 48hs**: si el beneficiado no confirma ni rechaza, se confirma sola (mismo patrón sin servidor), con countdown visible en ambos lados
- [x] **Monto mínimo para pedir** ($5.000 ARS) al crear una causa
- [x] **Foto de perfil + nombre real**: Nombre y Apellido como campos separados en el registro → iniciales reales (ej. "GP") en vez de "GP"/"VOS" hardcodeado; foto de perfil propia (bucket `avatars`)
- [x] **Ranking con foto de perfil + mini-perfil al tocar** a un donante (estilo Airbnb): nivel, medallas, causas apoyadas, monto donado
- [x] **Lista de transferencias/aportes escalable**: filas compactas en vez de tarjetas con imagen precargada; el comprobante se ve recién al tocar
- [x] **Tu propia causa ya no aparece en el feed general** ("regla Instagram": el feed es para descubrir causas de otros; la tuya vive en "Mis causas" del Perfil)
- [ ] **Recuperar contraseña**: código completo (mail con link de reset → pantalla de contraseña nueva), pero bloqueado para probar de punta a punta hasta configurar el dominio propio en Resend y la redirect URL en Supabase Auth
- [ ] **El curador puede dar de baja una causa ya publicada** (hoy solo puede actuar sobre causas pendientes de revisión)
- [ ] **Subir video** en la portada/historia de una causa

Detalle vivo del avance en `memory.md`; lo que falta y en qué orden en `docs/BACKLOG.md`.

## Estructura

```
src/
  app/                 rutas (Expo Router)
    _layout.tsx        decide curador vs. donante; Stack raíz (swipe-back
                       nativo en iOS, botón/gesto de retroceso en Android)
    (tabs)/            grupo de rutas de los tabs (transparente en la URL)
      _layout.tsx      Tabs con tab bar propio
      index.tsx        feed
      ranking.tsx      ranking mensual + puntos + mini-perfil de un donante
      profile.tsx      perfil, medallas, "mis causas", cuenta / cerrar sesión
                       (al final de la pantalla)
      activity.tsx     feed de actividad (transferencias por confirmar,
                       recibidos, donados, agradecimientos)
    cause/[id].tsx     detalle de causa (con branch "mi causa" para el dueño;
                       cierre + mini-reporte + agradecimiento si ya cerró)
    donate/[id].tsx    elegir método de pago (MP con flag / transferir);
                       bloqueada si la causa ya cerró
    transfer/[id].tsx  flujo de transferencia + subir comprobante
    gracias.tsx        post-transferencia + aporte voluntario a donAR
    donated.tsx        historial de lo donado (desde el perfil)
    received.tsx       historial de lo recibido (desde el perfil)
    create / cobro / review    flujo de crear causa + evidencia (pantallas
                       del Stack, no tabs: se empujan encima con navegación
                       nativa)
  screens/
    auth-screen.tsx    login / registro (mail + contraseña + nombre/apellido).
                       La app entera exige cuenta: sin sesión, esto es lo
                       único que se ve. También "olvidé mi contraseña"
    reset-password-screen.tsx   elegir contraseña nueva (llega por deep link
                       del mail de recuperación)
    curar-screen.tsx   panel del curador (no es una ruta: es el modo completo
                       de la app cuando la identidad es curador)
  components/          cause-card, donar-tab-bar (pill de vidrio),
                       tab-bar-scroll (canal scroll↔barra), placeholder, ui/
  constants/           donar-theme (paleta, spacing, formato de pesos,
                       iniciales para avatar)
  lib/                 supabase (auth + storage), mercadopago, gamification
                       (niveles/medallas, compartido entre Perfil y ranking)
  store/               causes-store (data layer: causas, donaciones, curaduría,
                       cierre de causa, auto-confirmación, mini-perfiles)
supabase/
  schema.sql           esquema completo + migraciones al final, fecha por fecha
scripts/
  seed-demo-cause.mjs  siembra una causa ajena para probar donar
  generate-icons.mjs   genera los 8 assets del ícono desde una imagen fuente
                       (ver docs/proceso-logo.md)
docs/
  proceso-logo.md      registro AI-first de cómo se hizo el ícono/logo
  logo-preview.html    vista previa de los assets del ícono (registro visual)
```

## Encuadre legal (clave)

El modelo es "conectar sin custodiar": la plata va **directa** del donante al beneficiado, donAR **nunca la tiene**. Esto importa porque en Argentina el régimen de Proveedores de Servicios de Pago (PSPCP) del BCRA se dispara por **tener/administrar fondos de terceros en cuentas de pago** — no por conectar. Si donAR no guarda saldo de nadie, la lectura más fuerte es que queda **fuera** de ese régimen.

- **Cómo se cobra sin custodiar (a futuro):** con **split de pagos** de Mercado Pago, la pasarela le manda al beneficiado su parte y a donAR **solo su comisión** (ingreso propio, no fondos de terceros), en el mismo pago. No hay custodia.
- **MVP actual:** solo **transferencia directa** + **aporte voluntario** a la plataforma (modelo GoFundMe). Cero custodia, cero comisión obligatoria = el modelo más limpio legalmente. Mercado Pago está **apagado con un flag** (`MP_ENABLED = false` en `src/app/donate/[id].tsx`), no borrado, listo para cuando exista el split + OK legal.
- **Riesgo subestimado:** lavado de activos (UIF). La identidad verificada + trazabilidad son la defensa.
- **Todo esto es investigación, no asesoramiento legal.** Detalle completo y pregunta afinada para el abogado en el paper fundacional (sección 11.c). El encuadre regulatorio es el supuesto más caro del proyecto y hay que confirmarlo con un abogado fintech/BCRA antes de escalar.

## Flujo de trabajo

Commits chicos con mensaje claro. En esta etapa de POC se commitea directo a `main` a propósito (una sola persona, iteración rápida); cuando el proyecto pase a build nativo / tenga más manos, se pasa a rama + PR. Secretos siempre en variables de entorno, nunca en el código.
