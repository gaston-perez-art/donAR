# Proceso del logo de DonAR — registro AI-first

Cómo se fue generando el ícono/logo de la app, iteración por iteración, con los prompts exactos usados. Documento vivo: se actualiza a medida que el logo evoluciona. Sirve como registro del método (cómo se usó IA para crear el asset) y para no perder los prompts que funcionaron.

**Regla de oro que salió de este proceso:** la IA de imagen (ChatGPT / DALL·E) genera 1-2 imágenes *master*; los ~8 archivos finales (tamaños de iOS/Android, capas adaptive, splash, favicon) NO se le piden a la IA, se derivan localmente con `sharp`. Ver "División de trabajo" al final.

---

## Punto de partida

El ícono de la app era el **default del scaffold de Expo** (nunca se había hecho uno real de DonAR). Objetivo: un ícono propio para publicar en App Store y Play Store, con la paleta de marca (`brand #1E88E5`, `brandDark #1565C0`, `sky #5AB9F2`).

Pregunta inicial de Gastón: *¿dónde conviene hacerlo — Claude, Gemini, ChatGPT?* La respuesta fue emergiendo del proceso: **depende del asset**. Un símbolo geométrico/tipográfico → SVG hecho por Claude (preciso, control total de la paleta). Una ilustración con volumen (manos) → IA de imagen. Lo aprendimos a los golpes (ver iteración 3).

---

## Iteraciones

### 1. Corazón simple (SVG por Claude) — DESCARTADO
Primera propuesta: un corazón sólido en el celeste de marca, presentado en un artifact con vista previa en tamaños reales (iOS, Android adaptable, splash).

**Feedback de Gastón:** "me gusta pero no sé si cierra por el lado del corazón, como que sobra algo". 
**Diagnóstico:** el corazón es el **símbolo genérico de toda la categoría** (GoFundMe, cualquier ONG). No distingue a DonAR de nadie. Gastón lo intuyó sin poder nombrarlo.
**Aprendizaje:** el logo tiene que salir de lo único imposible de copiar — el naming `don·AR` (donar + Argentina) — o del gesto propio, no del ícono default del rubro.

### 2. Dos caminos: monograma "AR" vs. gesto de dar (SVG por Claude)
Gastón pidió "ponerse creativos", con referencias claras: *Facebook tiene una F, LinkedIn un "in", X la X* → tomar lo más propio de la marca y volverlo símbolo. Idea suya: mezclar DonAR + Argentina + solidaridad, quizá los colores. Y separar usos, como Facebook: **wordmark "donAR" dentro de la app + símbolo para el ícono**.

Se exploraron en artifact dos caminos, con variantes de cada uno:
- **Camino A — el nombre (AR):** `aR` degradé, `AR` blanco sobre celeste, `AR` con banda tipo bandera.
- **Camino B — el gesto de dar:** la `A` de DonAR con un corazón adentro / como abrazo / sosteniendo un aporte.

**Feedback:** le gustó mucho **`aR · degradé`**, pero le disparó una idea nueva (iteración 3).

### 3. "Estilo Mercado Libre, pero una mano dando a otra" — SVG FALLÓ
Idea de Gastón: el encuadre de ML (gesto dentro de una burbuja, señal de confianza que el argentino ya tiene), pero en vez del apretón, **una mano que entrega y otra que recibe**.

Claude intentó dibujarlo en SVG a mano → **quedó mal** (manos como rectángulos redondeados, "de robot"). Gastón se rió y mandó el logo real de ML como vara.

**Aprendizaje clave (responde la pregunta inicial):** las **manos ilustradas con volumen NO son para SVG hecho a mano** — es lo que peor sale, y Claude no ve lo que renderiza, así que corrige a ciegas. Para eso → **IA de imagen**. Claude se queda con lo geométrico/tipográfico y con derivar los tamaños finales.

### 4. Primer prompt de imagen (ChatGPT) — salió lindo pero "MUY Mercado Pago"
Se pasó a ChatGPT. Prompt usado:

```
Design a mobile app icon for "DonAR", a peer-to-peer charity and donations
app from Argentina. Flat vector illustration, clean and modern, in the
visual language of the Mercado Libre logo: a smooth horizontal oval badge.
But instead of a handshake, show ONE open hand gently GIVING a small heart
into ANOTHER open receiving hand — the gesture of giving, not shaking.
Hands are solid white with soft rounded fingers and a thin darker-blue
outline. Oval badge filled with the brand light-blue gradient (#5AB9F2 to
#1E88E5), thin dark-blue outline (#1565C0). Centered, symmetrical, no text,
no letters, solid background, high contrast, 1024x1024, square.
```

**Resultado:** hermoso, pero **calcado de Mercado Pago** (no Libre): óvalo celeste + manos blancas + contorno azul marino. Peor aún porque MP es fintech de pagos y DonAR también toca plata → riesgo real de confusión.

### 5. Ajuste anti-MP (color + forma)
**Diagnóstico:** lo que lo delata como MP no es el color, es la **forma** — el óvalo horizontal con doble contorno marino grueso es la firma de MP. Prompt de ajuste:

```
Keep the same composition — one hand giving a heart into another receiving
hand — but redesign the CONTAINER and COLORS so it does NOT look like the
Mercado Pago logo: remove the horizontal oval with the thick dark-navy
outline, use a ROUNDED SQUARE (squircle) or no frame with the background
edge to edge; remove the heavy outline; background = soft sky-blue gradient
#5AB9F2 to #1E88E5; hands and heart clean white; feeling = friendly, human,
solidarity, NOT fintech. Square 1024x1024.
```

**Resultado (versión squircle):** mejor, se despegó de MP. Pero apareció el problema de fondo (iteración 6).

### 6. Feedback crudo (Gastón + su pareja): sobra, se pierde, cargado
Probado en la home real del iPhone, en contraste con los otros íconos. Feedback textual: *"muy blanco las manos, se pierde"*, *"muy cargado con el corazón"*, *"es como mucho dibujo adentro del cuadradito"*, *"sin delineado queda raro"*.

**Diagnóstico de diseño** (usando la propia home como vara — los íconos que funcionan ahí, Banco Galicia/PedidosYa/FaceTime, son *un símbolo simple con mucho aire*):
1. **Falta aire** — llena el 100% del cuadro; un buen ícono ocupa ~60%.
2. **Sin jerarquía** — dos manos + corazón, todo del mismo blanco y peso → masa blanca sin foco. El corazón tiene que ser el héroe.
3. **Demasiado detalle** — los pliegues/nudillos de las manos.
4. **Blanco plano sin separación** — por eso "sin delineado queda raro": las formas blancas se funden. Se resuelve con sombra suave, no con contorno duro (que traería de vuelta el look MP).

### 7. Prompt desde cero (una mano + corazón héroe)
```
Design a modern, minimal mobile app icon for "DonAR", a peer-to-peer
donations app. Theme: giving and solidarity.
COMPOSITION — simple and airy (top priority): one open hand (palm up, side
view) offering a single heart that floats just above the palm; the HEART is
the hero; lots of negative space, artwork occupies ~60% of the canvas,
centered, generous margins; simplify the hand to a clean flat silhouette,
no knuckle/finger lines.
STYLE: flat vector, rounded, warm; squircle icon; background soft sky-blue
gradient #5AB9F2 to #1E88E5; heart solid bright white (most prominent); hand
lighter/translucent white so it recedes (clear hierarchy); very soft drop
shadow to separate shapes; NO thick outline, NO oval frame.
RULES: no text, no letters, high contrast, must read clearly at small sizes.
Square 1024x1024. Give me 4 variations.
```

### 8. Prompt de variaciones con la referencia adjunta (ACTUAL)
Gastón adjunta el logo de la iteración 6 como referencia y pide 4 variaciones distintas que arreglen los problemas manteniendo el concepto. Prompt vigente:

```
I'm attaching my current app icon for "DonAR", a peer-to-peer donations app
(theme: giving and solidarity). I like the concept — hands giving a heart —
but the execution has problems. Use the attached image as reference for the
concept and color world, then generate 4 DISTINCT variations that fix these
issues:
PROBLEMS TO FIX: too crowded (add negative space, ~60% of canvas, centered);
no hierarchy (hands + heart all same flat white -> make the HEART the hero);
too much detail in the hands (simplify to flat silhouettes, no inner detail);
looks too much like Mercado Pago (no oval frame, no thick dark-navy outline).
KEEP: the giving gesture and the heart; the sky-blue world (gradient #5AB9F2
to #1E88E5), squircle shape.
THE 4 VARIATIONS: (1) single open hand offering the heart, lots of air, heart
as hero; (2) two very simplified hands give->receive, small and centered;
(3) color hierarchy: white heart hero, hands in lighter translucent blue;
(4) heart-forward: large central heart, hand(s) minimal and secondary.
RULES: no text, no letters, soft shadow to separate shapes (no hard outline),
high contrast, read clearly at small sizes. Square 1024x1024.
```

**Estado:** esperando las variaciones de ChatGPT para elegir la definitiva.

---

## Principios de diseño que salieron del proceso
Sirven para cualquier iteración futura del logo o de otros assets:
- **Salir del genérico de la categoría.** El corazón solo no alcanza; la marca está en `don·AR` y en el gesto propio.
- **Diferenciarse de Mercado Pago sí o sí** (misma zona de "plata + confianza"): sin óvalo horizontal, sin doble contorno marino.
- **Aire y jerarquía por sobre todo.** ~60% del cuadro, un solo héroe (el corazón), el resto secundario. Probar siempre en la home real, chico.
- **Separar formas con sombra suave, no con contorno duro.**
- **Herramienta según el asset:** símbolo tipográfico/geométrico → SVG (Claude); ilustración con volumen → IA de imagen.

---

## División de trabajo (IA de imagen ↔ Claude/`sharp`)
**ChatGPT/DALL·E entrega 1-2 masters:** (1) el ícono final cuadrado 1024×1024, fondo pleno; (2) opcional, solo las manos+corazón con aire, para la capa foreground de Android (fondo transparente o verde liso recortable).

**Claude deriva localmente con `sharp` los 8 archivos finales:**

| Archivo | Para qué |
|---|---|
| `assets/images/icon.png` 1024² | ícono principal iOS + App Store |
| ícono 512² | ficha de Play Store |
| `assets/images/android-icon-foreground.png` | capa de manos (Android adaptable) |
| `assets/images/android-icon-background.png` | fondo celeste (Android) |
| `assets/images/android-icon-monochrome.png` | ícono monocromo temado (Android 13+) |
| `assets/images/splash-icon.png` | pantalla de carga |
| `assets/images/favicon.png` | web |
| feature graphic 1024×500 | banner de la ficha de Play (se arma aparte: logo + wordmark) |

Todos se enganchan en `app.json` (`icon`, `android.adaptiveIcon.*`, `web.favicon`, `expo-splash-screen`).
