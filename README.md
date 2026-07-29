# DonAR

App P2P de colectas solidarias con curaduría de causas, gamificación por reconocimiento y trazabilidad del dinero como eje de confianza. Este repo es el POC móvil (iPhone y Android) para salir a validar.

Documento fundacional, contexto y prototipo de diseño en `docs/` (`paper-fundacional-donar.md`, `CONTEXTO.md`, `prototipo-donar.html`). Backlog vivo en `docs/BACKLOG.md`.

## Stack

- **Expo (SDK 54) + React Native**: un solo código para iOS y Android. Elegido porque reutiliza conocimiento de web (JS/React) y permite probar en el celular vía Expo Go sin cuenta de Apple. Fijado en SDK 54 para que sea compatible con la versión de Expo Go disponible hoy en la App Store.
- **Expo Router**: ruteo por archivos (estándar actual de Expo).
- **TypeScript**: chequeo de tipos, más seguro de mantener.
- **StyleSheet + theme central** (`src/constants/donar-theme.ts`): sin librerías de estilo extra, menos dependencias.

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
- [x] **Curaduría real**: la causa nace en `review`, un curador humano aprueba / rechaza / pide info tras revisar la evidencia (DNI + selfie + documento) subida a Storage privado
- [x] Identidad cross-device: vincular la sesión anónima a un mail (código de 6 dígitos) para recuperar el historial desde otro dispositivo
- [x] **Panel de "mi causa"** (vista del creador): recaudado / meta, aportes recibidos, compartir
- [x] **Dos métodos de pago**: transferencia con comprobante (canónico del MVP) + Mercado Pago (apagado con flag, ver Encuadre legal)
- [x] **Confirmación de la transferencia por el beneficiado**: sube comprobante → entra `pending` → el beneficiado confirma "me llegó" → recién ahí suma a la meta y a los puntos
- [x] **Aporte voluntario a donAR** (modelo GoFundMe) en la pantalla post-transferencia
- [x] Perfil único (donado + recibido), medallas y nivel
- [x] Ranking mensual + lógica de puntos (fórmula del paper)
- [ ] Cierre de causa (cumplida / cerrada sin llegar) + mini-reporte + agradecimiento
- [ ] Monto mínimo para pedir

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
      ranking.tsx      ranking mensual + puntos
      profile.tsx      perfil, medallas, "mis causas", vincular mail
      activity.tsx     placeholder (TBD, post-MVP)
    cause/[id].tsx     detalle de causa (con branch "mi causa" para el dueño)
    donate/[id].tsx    elegir método de pago (MP con flag / transferir)
    transfer/[id].tsx  flujo de transferencia + subir comprobante
    gracias.tsx        post-transferencia + aporte voluntario a donAR
    create / cobro / review    flujo de crear causa + evidencia (pantallas
                       del Stack, no tabs: se empujan encima con navegación
                       nativa)
  screens/
    curar-screen.tsx   panel del curador (no es una ruta: es el modo completo
                       de la app cuando la identidad es curador)
  components/          cause-card, donar-tab-bar, placeholder, ui/
  constants/           donar-theme (paleta, spacing, formato de pesos)
  lib/                 supabase (auth + storage), mercadopago
  store/               causes-store (data layer: causas, donaciones, curaduría)
supabase/
  schema.sql           esquema completo + migraciones al final, fecha por fecha
scripts/
  seed-demo-cause.mjs  siembra una causa ajena para probar donar
```

## Encuadre legal (clave)

El modelo es "conectar sin custodiar": la plata va **directa** del donante al beneficiado, donAR **nunca la tiene**. Esto importa porque en Argentina el régimen de Proveedores de Servicios de Pago (PSPCP) del BCRA se dispara por **tener/administrar fondos de terceros en cuentas de pago** — no por conectar. Si donAR no guarda saldo de nadie, la lectura más fuerte es que queda **fuera** de ese régimen.

- **Cómo se cobra sin custodiar (a futuro):** con **split de pagos** de Mercado Pago, la pasarela le manda al beneficiado su parte y a donAR **solo su comisión** (ingreso propio, no fondos de terceros), en el mismo pago. No hay custodia.
- **MVP actual:** solo **transferencia directa** + **aporte voluntario** a la plataforma (modelo GoFundMe). Cero custodia, cero comisión obligatoria = el modelo más limpio legalmente. Mercado Pago está **apagado con un flag** (`MP_ENABLED = false` en `src/app/donate/[id].tsx`), no borrado, listo para cuando exista el split + OK legal.
- **Riesgo subestimado:** lavado de activos (UIF). La identidad verificada + trazabilidad son la defensa.
- **Todo esto es investigación, no asesoramiento legal.** Detalle completo y pregunta afinada para el abogado en el paper fundacional (sección 11.c). El encuadre regulatorio es el supuesto más caro del proyecto y hay que confirmarlo con un abogado fintech/BCRA antes de escalar.

## Flujo de trabajo

Commits chicos con mensaje claro. En esta etapa de POC se commitea directo a `main` a propósito (una sola persona, iteración rápida); cuando el proyecto pase a build nativo / tenga más manos, se pasa a rama + PR. Secretos siempre en variables de entorno, nunca en el código.
