/**
 * Genera el feature graphic 1024×500 de la ficha de Play Store, por
 * composición (sin IA): degradé de marca + el símbolo extraído de
 * `fuente-icono.png` + el wordmark "donAR" y el tagline vectorizados desde
 * SF Rounded. Ver `docs/proceso-logo.md`.
 *
 * Correr igual que generate-icons.mjs (necesita sharp + opentype.js
 * instalados aparte y la fuente SFNSRounded.ttf del sistema en macOS):
 *   cd /tmp/donar-icons && node /ruta/al/repo/scripts/generate-feature-graphic.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import opentype from 'opentype.js';

const SRC = '/Users/gastonperez/Documents/donAR/assets/images/fuente-icono.png';
const OUT = '/Users/gastonperez/Documents/donAR/assets/images/store/play-feature-graphic-1024x500.png';
const BRAND = '#1E88E5', SKY = '#5AB9F2';
const W = 1024, H = 500;
const TAGLINE = 'Colectas solidarias verificadas';

// ---- extraer símbolo blanco del ícono fuente (mismo umbral que generate-icons) ----
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: SW, height: SH } = info;
const Tlo = 140, Thi = 210;
const rgba = Buffer.alloc(SW * SH * 4);
for (let i = 0; i < SW * SH; i++) {
  const mn = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  let a = (mn - Tlo) / (Thi - Tlo); a = a < 0 ? 0 : a > 1 ? 1 : a;
  rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = Math.round(a * 255);
}
const symbolFull = await sharp(rgba, { raw: { width: SW, height: SH, channels: 4 } }).png().toBuffer();
const symbol = await sharp(symbolFull).trim().png().toBuffer();

// ---- texto vectorizado desde SF Rounded ----
const font = opentype.parse(fs.readFileSync('/System/Library/Fonts/SFNSRounded.ttf').buffer);
function textPng(text, fontSize, stroke) {
  const p = font.getPath(text, 0, 0, fontSize);
  const b = p.getBoundingBox();
  const pad = 8;
  const w = Math.ceil(b.x2 - b.x1) + pad * 2, h = Math.ceil(b.y2 - b.y1) + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <g transform="translate(${pad - b.x1},${pad - b.y1})">
      <path d="${p.toPathData(2)}" fill="#fff"${stroke ? ` stroke="#fff" stroke-width="${stroke}" stroke-linejoin="round"` : ''}/>
    </g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ---- fondo: degradé diagonal de marca, con un par de círculos sutiles ----
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${SKY}"/><stop offset="1" stop-color="${BRAND}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="${W - 120}" cy="${H - 80}" r="220" fill="#ffffff" opacity="0.06"/>
  <circle cx="90" cy="70" r="150" fill="#ffffff" opacity="0.05"/>
</svg>`;
const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();

// ---- piezas escaladas ----
const symH = 240;
const sym = await sharp(symbol).resize({ height: symH }).toBuffer();
const symMeta = await sharp(sym).metadata();
const wm = await sharp(await textPng('donAR', 320, 8)).resize({ width: 400 }).toBuffer();
const wmMeta = await sharp(wm).metadata();
const tag = await sharp(await textPng(TAGLINE, 120, 0)).resize({ width: 430 }).toBuffer();
const tagMeta = await sharp(tag).metadata();

// ---- layout: símbolo a la izquierda, [wordmark / tagline] a la derecha, todo centrado ----
const gapX = 56;              // entre símbolo y bloque de texto
const gapY = 22;              // entre wordmark y tagline
const textW = Math.max(wmMeta.width, tagMeta.width);
const lockW = symMeta.width + gapX + textW;
const x0 = Math.round((W - lockW) / 2);
const symX = x0, symY = Math.round((H - symMeta.height) / 2);
const textX = x0 + symMeta.width + gapX;
const textBlockH = wmMeta.height + gapY + tagMeta.height;
const textY = Math.round((H - textBlockH) / 2);

await sharp(bg).composite([
  { input: sym, left: symX, top: symY },
  { input: wm, left: textX, top: textY },
  { input: tag, left: textX, top: textY + wmMeta.height + gapY },
]).png().toFile(OUT);

console.log(`feature graphic ${W}x${H} -> símbolo ${symMeta.width}x${symMeta.height}, donAR ${wmMeta.width}x${wmMeta.height}, tagline ${tagMeta.width}x${tagMeta.height}`);
console.log('OK', OUT);
