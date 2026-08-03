# Assets de la página

LinkedIn pide dos imágenes obligatorias y una tercera que conviene tener para los posts. Ninguna existe hoy en la medida correcta: hay que exportarlas desde las fuentes del repo.

## Lo que pide LinkedIn

| Asset | Medida | Formato | Estado |
|---|---|---|---|
| Logo | 300 x 300 px | PNG, fondo transparente o sólido | Falta exportar |
| Portada | 1128 x 191 px | PNG o JPG | Falta diseñar |
| Imagen de post | 1200 x 627 px | PNG o JPG | Falta plantilla |

La portada es una franja muy baja: 1128 de ancho por 191 de alto. Cualquier composición con más de una línea de texto se ve apretada. Diseñar para una sola frase.

## De dónde salen

**Logo.** La fuente es `assets/images/icon.png` (el ícono de la app, símbolo blanco sobre gradiente celeste `#5AB9F2 → #1E88E5`). Reescalar a 300x300. El proceso completo del logo y sus decisiones están en `docs/proceso-logo.md`.

Detalle a chequear: LinkedIn recorta el logo en círculo en varios lugares del feed. El símbolo tiene que quedar centrado y con aire suficiente en los bordes para que el recorte circular no le coma nada.

**Portada.** No existe. Propuesta: fondo con el gradiente de marca y el tagline en blanco, centrado, una sola línea.

```
Colectas solidarias verificadas
```

Sin ilustración ni fotos. A 191 px de alto, una imagen compite con el texto y pierden las dos.

**Paleta de marca:** `brand #1E88E5`, `brandDark #1565C0`, `sky #5AB9F2`.

## Fotos de personas: la regla

Ninguna causa real se usa en comunicación sin consentimiento explícito y escrito del beneficiado. Vale para la portada, para los posts y para las capturas de la app.

Consecuencia práctica: hasta tener ese consentimiento, las capturas de producto van con datos de prueba, no con causas reales. Es más trabajo y es la única forma defendible.

## Capturas de la app

Los posts que muestren producto necesitan capturas limpias. Las de las stores ya trabajadas viven en `assets/images/store/`. Revisar si sirven tal cual o si hay que recortarlas al formato de LinkedIn.
