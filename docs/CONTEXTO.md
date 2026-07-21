# DonAR: estado del proyecto

Documento para retomar. Resume qué es, qué se decidió y por qué, qué está construido, qué falta y cómo se corre. Actualizado al 21/07/2026.

## Qué es

App P2P de colectas solidarias con curaduría de causas, gamificación por reconocimiento y trazabilidad del dinero como eje de confianza. POC móvil (iPhone y Android) para salir a validar.

- **Misión:** hacer del mundo un lugar mejor.
- **Visión:** convertirnos en la plataforma que mayor felicidad haya dado a las personas en la historia conocida.
- **Valores:** transparencia radical, dignidad de quien pide, confianza verificada, solidaridad que suma a todos.
- **Propuesta de valor:** infraestructura de confianza para la solidaridad entre personas. La diferencia frente al modelo Maratea no es el alcance, es el método: verificación de la causa y trazabilidad del aporte en el centro.

## Decisiones tomadas (con su porqué)

| Tema | Decisión | Por qué |
|---|---|---|
| Nombre | DonAR | Juega con "donar" y "AR" de Argentina |
| Paleta y estilo | Celeste y azul argentino, estilo Airbnb (redondeado, con aire) | Azul comunica confianza (fintech/salud) y es la asociación argentina inmediata |
| Modelo | P2P persona a persona con curaduría manual | Es el hueco de mercado; la curaduría es el antifraude del MVP |
| Pago (MVP) | Mercado Pago Checkout, sin comprobante | El comprobante es fricción y rompe la trazabilidad. MP procesa y liquida; DonAR no custodia |
| Comisión | 0% en el MVP, con propina opcional del donante; arquitectura lista para activar fee por split de MP | Máximo volumen y cero objeción en validación. Se cobra por confianza y audiencia, no por mover plata |
| Custodia | Híbrido por etapas: el MVP no custodia | Convertirse en fintech regulada (BCRA/PSP) es la decisión más cara; no se toca sin evidencia |
| Si no llega a la meta | El beneficiario se queda con lo recaudado (financiación flexible, tipo GoFundMe) | Una ayuda parcial también ayuda. Más humano |
| Puntos | Balanceado con tope: +50 por apoyar, +1 cada $1.000 con tope 150/causa, racha x1,2, +100 por completar, +200 verificar identidad | Premia ayudar seguido, no tener más plata |
| Ranking | De donantes, no de causas | Premia la generosidad, no pone a competir el sufrimiento |
| Identidad | Verificación estilo Uber/Tinder, check azul en el perfil | Patrón conocido que suma confianza |
| Stack | Expo SDK 54 + Expo Router + TypeScript + StyleSheet | Un solo código iOS/Android, reusa web, prueba en Expo Go. Fijado en SDK 54 por compatibilidad con el Expo Go de la App Store |

## Riesgo clave a resolver

El más caro y el que puede cambiar todo: confirmar con un abogado si el modelo "conectar sin custodiar" configura o no intermediación financiera regulada en Argentina. Es un supuesto, no una certeza.

Otros abiertos: no exponer nunca el alias/CBU público en la causa (candado contra la disintermediación); el fee exacto a testear con usuarios; el split y payout de MP necesitan un backend (Supabase Edge Functions) más adelante.

## Estado del código

Repo en GitHub (gaston-perez-art/donAR), corre en Expo Go (SDK 54).

Hecho:
- Base Expo que levanta en el celular.
- Navegación de 5 tabs con el + centrado (Inicio, Ranking, +, Actividad, Perfil).
- Feed con causas verificadas (tarjetas estilo Airbnb), leyendo del store.
- Crear causa end to end: formulario, cobro (MP/CBU + alias), revisión, y la causa publicada aparece en el feed con el distintivo "Tu causa".
- Capa de datos única (`src/store/causes-store.tsx`), hoy en memoria, lista para enchufar Supabase cambiando solo ese archivo.

Placeholder (pendientes de rebanada): Ranking, Actividad, Perfil, detalle de causa, donación.

Limitación actual: el store es en memoria, si se reinicia la app la causa creada se pierde. Se resuelve con Supabase.

## Cómo se corre

```bash
cd ~/Documents/donAR
npm install
npx expo start -c
```

Escaneás el QR con la cámara (iOS) o desde Expo Go (Android), misma red WiFi. Para recargar sin reiniciar: tecla `r` en la Terminal.

## Estructura

```
src/
  app/         rutas (Expo Router)
    _layout.tsx      Tabs + provider del store
    index.tsx        Feed
    create / cobro / review   flujo de crear causa
    ranking / activity / profile   placeholders
  components/   CauseCard, DonarTabBar, Placeholder
  constants/    donar-theme (paleta, spacing, formato de pesos)
  data/         causes (semilla mock)
  store/        causes-store (capa de datos, futura Supabase)
docs/
  CONTEXTO.md               este archivo
  paper-fundacional-donar.md    documento fundacional
  prototipo-donar.html          prototipo de alta fidelidad (22 pantallas)
```

## Próximos pasos (orden sugerido)

1. **Supabase:** crear el proyecto (gratis), pasar Project URL y anon key. Armar esquema (causas, aportes, usuarios), storage para evidencia y fotos, conectar al store. Da persistencia real.
2. **Detalle de causa + donación** con el checkout de Mercado Pago (el AHA moment).
3. **Perfil único** (donado + recibido, medallas, nivel) y **Actividad** (notificaciones de dinero recibido).
4. **Ranking mensual** + lógica de puntos visible.
5. **Causa finalizada:** happy (video y fotos de agradecimiento) y unhappy (se queda con lo juntado).
6. **Verificación de identidad** real (DNI + selfie).

Todo se construye por rebanadas verticales: una funcionalidad end to end, funcionando y probada, antes de pasar a la siguiente.
