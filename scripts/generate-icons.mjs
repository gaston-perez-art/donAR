/**
 * Genera los 8 assets del ícono de DonAR a partir de UNA imagen fuente
 * (`assets/images/fuente-icono.png`, el ícono full-bleed generado con IA).
 * Ver el proceso completo en `docs/proceso-logo.md`.
 *
 * Qué hace: del ícono full-bleed saca iOS/Play/favicon; extrae el símbolo
 * blanco (separación nítida sobre el celeste) para las capas de Android, el
 * monocromo y el splash; genera el fondo degradé; y arma el splash con el
 * wordmark "donAR" vectorizado desde SF Rounded.
 *
 * Cómo correrlo (sharp y opentype.js NO son deps del proyecto, se instalan
 * aparte para no engordar la app):
 *   mkdir -p /tmp/donar-icons && cd /tmp/donar-icons
 *   npm init -y && npm install sharp opentype.js
 *   node /ruta/al/repo/scripts/generate-icons.mjs
 * (ajustá las rutas absolutas SRC/OUT de abajo si el repo no está en la
 * ubicación por defecto). Requiere la fuente SFNSRounded.ttf del sistema (macOS).
 */
import sharp from 'sharp';
import fs from 'fs';
import opentype from 'opentype.js';

const SRC = '/Users/gastonperez/Documents/donAR/assets/images/fuente-icono.png';
const OUT = '/Users/gastonperez/Documents/donAR/assets/images';
const STORE = OUT + '/store';
fs.mkdirSync(STORE, { recursive: true });

const BRAND = '#1E88E5';
const SKY = '#5AB9F2';

// ---------- 1. Ícono principal (iOS + App Store), 1024, sin alpha ----------
await sharp(SRC).resize(1024, 1024, { fit: 'cover' }).flatten({ background: BRAND }).png().toFile(`${OUT}/icon.png`);

// ---------- 2. Ícono Play Store, 512 ----------
await sharp(SRC).resize(512, 512, { fit: 'cover' }).flatten({ background: BRAND }).png().toFile(`${STORE}/play-icon-512.png`);

// ---------- 3. favicon web, 48 ----------
await sharp(SRC).resize(48, 48, { fit: 'cover' }).flatten({ background: BRAND }).png().toFile(`${OUT}/favicon.png`);

// ---------- Extracción del símbolo blanco sobre transparente ----------
// El fondo celeste tiene min(R,G,B) <= ~79; el símbolo blanco ~253. Umbral holgado.
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const Tlo = 140, Thi = 210;
const rgba = Buffer.alloc(W * H * 4);
let symPixels = 0, minX = W, minY = H, maxX = 0, maxY = 0;
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const mn = Math.min(r, g, b);
  let a = (mn - Tlo) / (Thi - Tlo);
  a = a < 0 ? 0 : a > 1 ? 1 : a;
  const alpha = Math.round(a * 255);
  rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = alpha;
  if (alpha > 128) {
    symPixels++;
    const x = i % W, y = (i / W) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
console.log(`símbolo: ${symPixels} px (${((symPixels / (W * H)) * 100).toFixed(1)}% del cuadro)`);
console.log(`bbox símbolo: x ${minX}-${maxX}, y ${minY}-${maxY}`);

// símbolo blanco/transparente a resolución fuente, recortado a su bounding box
const symbolFull = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
const symbol = await sharp(symbolFull).trim().png().toBuffer();
const sm = await sharp(symbol).metadata();
console.log(`símbolo recortado: ${sm.width}x${sm.height}`);

// helper: símbolo centrado en un lienzo cuadrado transparente, ocupando `frac` del lado
async function centerSymbol(size, frac, file) {
  const box = Math.round(size * frac);
  const inner = await sharp(symbol).resize(box, box, { fit: 'inside' }).toBuffer();
  const im = await sharp(inner).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: inner, left: Math.round((size - im.width) / 2), top: Math.round((size - im.height) / 2) }])
    .png().toFile(file);
}

// ---------- 4. Android adaptive foreground (símbolo en safe zone ~62%) ----------
await centerSymbol(1024, 0.62, `${OUT}/android-icon-foreground.png`);

// ---------- 5. Android monochrome (misma silueta blanca; el sistema la tiñe) ----------
await centerSymbol(1024, 0.62, `${OUT}/android-icon-monochrome.png`);

// ---------- 6. Android background: degradé celeste ----------
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${SKY}"/><stop offset="1" stop-color="${BRAND}"/>
  </linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/></svg>`;
await sharp(Buffer.from(bgSvg)).png().toFile(`${OUT}/android-icon-background.png`);

// ---------- 7. Splash: símbolo + wordmark "donAR" en blanco (fondo celeste por app.json) ----------
// El wordmark se vectoriza desde SF Rounded (la misma redondeada que usa la app),
// en blanco y engordado con stroke para simular el peso extrabold del logotipo.
const font = opentype.parse(fs.readFileSync('/System/Library/Fonts/SFNSRounded.ttf').buffer);
const FS = 320;
const wmPath = font.getPath('donAR', 0, 0, FS);
const bb = wmPath.getBoundingBox();
const pad = 24;
const wmW = Math.ceil(bb.x2 - bb.x1) + pad * 2, wmH = Math.ceil(bb.y2 - bb.y1) + pad * 2;
const wmSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wmW}" height="${wmH}">
  <g transform="translate(${pad - bb.x1},${pad - bb.y1})">
    <path d="${wmPath.toPathData(2)}" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
  </g></svg>`;
const wm = await sharp(Buffer.from(wmSvg)).png().toBuffer();

const SP = 1024;
const symInner = await sharp(symbol).resize({ width: 520 }).toBuffer();
const sMeta = await sharp(symInner).metadata();
const wmInner = await sharp(wm).resize({ width: 360 }).toBuffer();
const wMeta = await sharp(wmInner).metadata();
const gap = 60;
const totalH = sMeta.height + gap + wMeta.height;
const top0 = Math.round((SP - totalH) / 2);
await sharp({ create: { width: SP, height: SP, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: symInner, left: Math.round((SP - sMeta.width) / 2), top: top0 },
    { input: wmInner, left: Math.round((SP - wMeta.width) / 2), top: top0 + sMeta.height + gap },
  ])
  .png().toFile(`${OUT}/splash-icon.png`);
console.log(`wordmark: ${wmW}x${wmH} -> splash símbolo ${sMeta.width}x${sMeta.height} + texto ${wMeta.width}x${wMeta.height}`);

console.log('OK — todos los assets generados');
