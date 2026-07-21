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

## Flujo de trabajo

Rama por cambio, commits chicos, PR con descripción. Nunca commitear directo a `main`. Secretos siempre en variables de entorno, nunca en el código.
