# DonAR

App P2P de colectas solidarias con curaduría de causas, gamificación por reconocimiento y trazabilidad del dinero como eje de confianza. Este repo es el POC móvil (iPhone y Android) para salir a validar.

Documento fundacional y prototipo de diseño: ver la carpeta de trabajo del proyecto (paper y prototipo HTML).

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

Escaneá el QR con la cámara (iOS) o desde Expo Go (Android). El teléfono y la compu tienen que estar en la misma red WiFi.

## Estado actual (rebanadas verticales)

- [x] Base que corre + navegación de 5 tabs con botón + centrado
- [x] **Feed**: causas verificadas con tarjetas (datos mock)
- [ ] Detalle de causa + donación (Mercado Pago)
- [ ] Crear causa + verificación + cobro (alias/CBU)
- [ ] Perfil único (donado + recibido) y Actividad
- [ ] Ranking mensual + lógica de puntos
- [ ] Causa finalizada (happy / unhappy)

Las tabs Ranking, Actividad, Perfil y Crear son placeholders hasta su rebanada.

## Estructura

```
src/
  app/                 rutas (Expo Router)
    _layout.tsx        Tabs con tab bar propio
    index.tsx          Feed
    ranking / activity / profile / create   placeholders
  components/          CauseCard, DonarTabBar, Placeholder
  constants/           donar-theme (paleta, spacing, formato de pesos)
  data/                causes (datos mock)
```

## Encuadre legal (clave)

El modelo es "conectar sin custodiar": la plata va **directa** del donante al beneficiado, donAR **nunca la tiene**. Esto importa porque en Argentina el régimen de Proveedores de Servicios de Pago (PSPCP) del BCRA se dispara por **tener/administrar fondos de terceros en cuentas de pago** — no por conectar. Si donAR no guarda saldo de nadie, la lectura más fuerte es que queda **fuera** de ese régimen.

- **Cómo se cobra sin custodiar (a futuro):** con **split de pagos** de Mercado Pago, la pasarela le manda al beneficiado su parte y a donAR **solo su comisión** (ingreso propio, no fondos de terceros), en el mismo pago. No hay custodia.
- **MVP actual:** solo **transferencia directa** + **aporte voluntario** a la plataforma (modelo GoFundMe). Cero custodia, cero comisión obligatoria = el modelo más limpio legalmente. Mercado Pago está **apagado con un flag** (`MP_ENABLED = false` en `src/app/donate/[id].tsx`), no borrado, listo para cuando exista el split + OK legal.
- **Riesgo subestimado:** lavado de activos (UIF). La identidad verificada + trazabilidad son la defensa.
- **Todo esto es investigación, no asesoramiento legal.** Detalle completo y pregunta afinada para el abogado en el paper fundacional (sección 11.c). El encuadre regulatorio es el supuesto más caro del proyecto y hay que confirmarlo con un abogado fintech/BCRA antes de escalar.

## Flujo de trabajo

Rama por cambio, commits chicos, PR con descripción. Nunca commitear directo a `main`. Secretos siempre en variables de entorno, nunca en el código.
