# Plan: la app va lenta en Android (feed que se traba al scrollear)

Estado: Fase 1c aplicada (expo-image). Fase 1a (backfill) lista para correr,
pendiente de que Gastón la ejecute con la service_role key. Fase 0, 1b y 2 sin
empezar.
Fecha: 4 ago 2026. Detectado por Gastón en la primera prueba real sobre Android.

## Síntoma

En Android el feed tarda en cargar y se traba al scrollear. En iOS no se notaba.

## Diagnóstico

### Causa 1 (la gorda): fotos a resolución de cámara

Medición real contra el bucket `cause-covers` (22 causas, 25 imágenes):

- Total: **34 MB**.
- Dimensiones típicas: **4032 × 3024** y **3024 × 4032**. Ninguna bajo 2160 px.
- Peso por archivo: entre 375 KB y 3.4 MB.

Se suben con `ImagePicker.launchImageLibraryAsync({ quality: 0.6 })` en
`src/app/create.tsx:72`, `src/app/edit-cause/[id].tsx:82` y otros tres puntos.
`quality` comprime el JPEG pero **no reescala**: la foto sale del picker con las
dimensiones originales de la cámara.

Esas fotos se pintan en una portada de **180 dp de alto** (`COVER_HEIGHT` en
`src/components/cause-card.tsx:22`), o sea unos 1080 × 540 px reales en un
teléfono 3x. Android baja del server 1 a 3 MB por foto y decodifica un bitmap de
4032 × 3024, que en ARGB_8888 son **~49 MB de RAM por imagen**. Ese es el
"tarda en cargar" y buena parte del "se traba".

**Hallazgo al armar el script de backfill (más grave de lo que parecía):** de
las 24 imágenes en el bucket, **16 no son JPEG de verdad**. Son HEIC
multi-imagen de iPhone (retrato/profundidad: hasta 48 imágenes auxiliares
embebidas en un solo archivo) subidas tal cual, pero con extensión y
content-type de `.jpg`. sharp ni siquiera pudo decodificarlas (límite de
seguridad de libheif) hasta pasarlas por `sips` primero.

Causa: `mimeType: asset.mimeType || 'image/jpeg'` en
`src/app/create.tsx:79` y `src/app/edit-cause/[id].tsx:90`. Cuando el picker de
iOS no informa `mimeType` (pasa según versión de SDK/OS), el fallback asume
JPEG sin verificarlo, y `uploadCoverPhoto` (`src/lib/supabase.ts:291`) sube el
`arrayBuffer` tal cual, sin reencodear. El archivo real es HEIC, el nombre y el
content-type dicen JPEG.

Esto pega más fuerte en Android que en iOS: iOS decodifica HEIC con Core Image
optimizado a nivel de sistema operativo; Android tiene que parsear el
contenedor HEIF completo (con sus decenas de imágenes auxiliares) para mostrar
lo que debería ser una miniatura simple. Es la explicación más probable de por
qué el lag "no se notaba" en iOS.

### Causa 2: el feed monta todas las tarjetas de una

`src/app/(tabs)/index.tsx:90` es un `ScrollView` con `.map()`. No hay ni un solo
`FlatList` en toda la app (verificado sobre `src/app` y `src/screens`). Con 22
causas, al abrir el feed arrancan **las 25 descargas y decodificaciones a la
vez**, y ninguna vista se recicla al scrollear.

Peor: cada `CauseCard` con más de una foto monta además un `ScrollView`
horizontal anidado (`cause-card.tsx:66`). Son ~20 ScrollViews vivos al mismo
tiempo.

### Causa 3: se usa el `Image` de React Native, no `expo-image`

`expo-image` ya está instalado desde el scaffold inicial (commit `7e0275c`) y
**no se usa en ningún lado**. El `Image` de RN no tiene caché en disco
configurable ni control de tamaño de decodificación. `expo-image` sí:
`cachePolicy="memory-disk"`, `recyclingKey`, `contentFit`, `transition`.

Como ya está en `package.json`, el cambio **no necesita build nueva de EAS**.

### Causa 4 (menor): el handler de scroll cruza a JS en cada frame

`src/app/(tabs)/index.tsx:55` pasa `onScroll={scroll?.onScroll}` con
`scrollEventThrottle={16}`, o sea un evento a JS por frame para decidir si
achicar la tab bar. La animación en sí ya corre en el hilo nativo
(`tab-bar-scroll.tsx:41`, `useNativeDriver: true`), así que esto suma pero no
explica el problema. Se toca al final, no antes.

### Causa 5 (a descartar primero): puede estar corriendo en modo dev

El APK instalado es el perfil `development` de `eas.json` (`developmentClient:
true`), conectado a Metro. En modo dev el bundle va sin minificar y con todos
los chequeos de desarrollo prendidos. Eso solo ya hace que **toda** la app se
sienta lenta, no solo el feed. Hay que separarlo antes de tocar código.

## Plan de ataque

### Fase 0: medir, no adivinar (15 min, cero código)

1. Levantar Metro en modo producción contra la misma build ya instalada:
   `npx expo start --dev-client --no-dev --minify`.
   Si el feed mejora mucho, parte del problema era el modo dev y hay que medir
   todo lo demás sobre esta base, no sobre la dev.
2. Abrir el menú de desarrollador en el teléfono y prender el **Perf Monitor**.
   Anotar los dos números mientras se scrollea:
   - cae **JS fps** → el cuello está en JavaScript (renders, handler de scroll).
   - cae **UI fps** con JS estable → el cuello es nativo (imágenes, layout).
   La hipótesis es que cae UI fps, consistente con la causa 1.
3. Anotar modelo de teléfono y versión de Android. Un gama media viejo cambia
   qué tan agresivo hay que ser.

Salida de esta fase: una línea de base escrita, para poder decir después si
cada fix sirvió.

### Fase 1: bajar las imágenes de peso (el 80% del resultado)

**1a. Backfill de las 24 imágenes que ya están subidas. LISTO, falta correrlo.**
`scripts/resize-cause-covers.mjs`: baja cada URL de `causes_public.image_urls`,
normaliza los HEIC mal etiquetados con `sips`, reescala al lado largo 1600 px
(JPEG calidad 80) y re-sube al mismo path con `upsert: true`. Guarda cada
original sin tocar en `scripts/.backfill-originals-covers/` (gitignored) antes
de pisarlo.

Validado con `DRY_RUN=1` contra los datos reales: **34.2 MB → 6.5 MB**, 24
procesadas, 0 errores.

Para correrlo (Gastón, con la service_role key, nunca por el chat ni al repo):

```
npm install sharp --no-save
SUPABASE_SERVICE_ROLE_KEY=<la key de Project Settings > API > service_role> \
  node scripts/resize-cause-covers.mjs
```

Se puede probar antes con `DRY_RUN=1` adelante (no sube ni pisa nada, solo
imprime qué haría). La service_role key se toma de Supabase, se usa una vez y
se descarta; no hace falta guardarla en ningún lado.

- No toca la app ni requiere build nueva. Es el fix que más se nota y el más
  barato.
- Correrlo una sola vez. Guarda copia de los originales en
  `scripts/.backfill-originals-covers/` (mover a otro lado si se quiere
  conservar más allá de esta sesión de trabajo).

**1b. Reescalar al subir, para que no vuelva a pasar.** Agregar
`expo-image-manipulator` y pasar cada foto elegida por un resize a 1600 px antes
del upload, en los cinco puntos que hoy llaman a `launchImageLibraryAsync`:
`create.tsx`, `edit-cause/[id].tsx`, `cause/[id].tsx`, `transfer/[id].tsx`,
`profile.tsx` (el avatar puede ir a 512 px). Conviene centralizar en un helper
único en `src/lib/`, no repetir el llamado cinco veces.

De paso, este helper tiene que resolver el bug real: `expo-image-manipulator`
siempre reencodea a JPEG de verdad (no importa qué haya adentro, HEIC
incluido), así que sacarle el `mimeType: asset.mimeType || 'image/jpeg'` al
picker y pasar todo por el manipulator antes de subir mata el problema de raíz,
no solo lo achica.

- **Esto sí necesita una build nueva de EAS** porque es un módulo nativo. Si hay
  otros cambios nativos pendientes, juntarlos en la misma build.

**1c. Reemplazar `Image` por `expo-image`. HECHO (4 ago).** Aplicado en
`cause-card.tsx` (portadas del feed), `cause/[id].tsx` (hero, foto de cierre,
avatares de comentarios, comprobante de transferencia) y el avatar de
`(tabs)/index.tsx`, con `cachePolicy="memory-disk"`, `contentFit="cover"`,
`recyclingKey={uri}` donde hay listas, y `transition={150}` en las portadas.
Sin build nueva (ya estaba en `package.json` desde el scaffold, sin usar).
`npx tsc --noEmit` limpio. Falta probar en dispositivo (no se pudo esta
sesión). Quedan sin tocar, más baratos y menos urgentes: avatares en
`profile.tsx`, `ranking.tsx`, `activity.tsx`, `received.tsx`,
`donor-profile-modal.tsx`, y las miniaturas de evidencia en `create.tsx`,
`edit-cause/[id].tsx`, `curar-screen.tsx` (flujos de curador/donante, no el
feed principal).

### Fase 2: que el feed deje de montar todo junto

Pasar el feed de `ScrollView` + `.map()` a `FlatList`:

- `data={active}`, `renderItem` con `CauseCard`, `keyExtractor` por `id`.
- `ListHeaderComponent` para "Tus causas" y el título de sección.
- `ListFooterComponent` para "Lo lograron".
- `windowSize`, `initialNumToRender={4}`, `removeClippedSubviews` en Android.
- `CauseCard` envuelto en `React.memo`.

Ojo con dos cosas al hacerlo:

- El `ScrollView` horizontal anidado de las fotos convive mal con la
  virtualización. Evaluar montar el carrusel solo cuando la tarjeta es visible,
  o mostrar una sola foto en el feed y dejar el carrusel para el detalle.
- `reactCompiler: true` está prendido en `app.json`. Si algo se comporta raro
  con `React.memo`, es el primer sospechoso.

Medir con el Perf Monitor después de la fase 1 antes de arrancar esta: puede que
con las imágenes livianas 22 tarjetas ya scrolleen bien y la `FlatList` sea
trabajo que rinde poco hoy y mucho cuando haya 200 causas.

### Fase 3: pulido (solo si después de medir sigue faltando)

- Subir `scrollEventThrottle` a 32 o 64 en el feed, o mover la detección de
  dirección a `Animated.event` con `useNativeDriver`.
- `src/store/causes-store.tsx:1340`: el `useMemo` del context recalcula
  `causes.filter((c) => c.mine)` y `pendingCauses` y devuelve arrays nuevos cada
  vez, y ese context tiene ~50 campos, así que cualquier cambio re-renderiza
  todo consumidor. Partirlo en dos contexts (datos y acciones) o memoizar los
  filtros aparte.
- `fetchCauses` hace `select('*')` sin `limit` sobre `causes_public`. Con 22
  filas no molesta, pero es paginado pendiente.

## Orden recomendado

1. Fase 0 completa (medir, con la app en `--no-dev --minify`).
2. Fase 1a (backfill) y 1c (`expo-image`). Sin build nueva, resultado inmediato.
3. Volver a medir. Escribir el antes y después.
4. Fase 1b (resize al subir) junto a la próxima build de EAS.
5. Fase 2 solo si la medición del punto 3 lo justifica.
6. Fase 3 al final.

## Lo que se resigna

- Reescalar a 1600 px pierde detalle si alguna vez se quiere hacer zoom sobre la
  foto de una causa. Para el POC no aplica: las fotos se ven en una portada de
  180 dp y en un hero de detalle.
- Las transformaciones de imagen del lado de Supabase (`?width=800`) resolverían
  esto sin tocar la app, pero requieren plan Pro. Por eso se hace en cliente.
