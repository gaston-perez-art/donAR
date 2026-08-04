/**
 * Backfill (Fase 1a, docs/plan-performance-android.md): las fotos de causas
 * ya subidas están a resolución de cámara (hasta 4032x3024, ~34 MB en total
 * para 22 causas) porque `ImagePicker` con `quality: 0.6` comprime el JPEG
 * pero no reescala. Se pintan en una portada de 180 dp: eso es RAM y datos
 * tirados en Android, que además no tiene tanto margen como iOS.
 *
 * Qué hace: para cada causa en `causes_public`, baja cada imagen de
 * `image_urls`, la reescala a 1600 px de lado largo (JPEG calidad 80) y la
 * re-sube al MISMO path en el bucket `cause-covers` (mismo id de causa, mismo
 * public URL). Antes de subir, guarda el original sin tocar en
 * `scripts/.backfill-originals-covers/` por si hace falta volver atrás.
 *
 * Bonus fix que este script hace de paso: buena parte de las fotos NO son
 * JPEG de verdad. Son HEIC multi-imagen de iPhone (retrato/profundidad, hasta
 * 48 imágenes auxiliares embebidas) subidas tal cual pero con extensión y
 * content-type de `.jpg` (bug en `create.tsx`/`edit-cause/[id].tsx`: cuando
 * `asset.mimeType` viene undefined del picker, el fallback asume JPEG sin
 * verificarlo). sharp no logra decodificar esos HEIC pesados (límite de
 * seguridad de libheif), así que se los normaliza primero con `sips` (viene
 * con macOS) a un JPEG real. Después de este backfill quedan JPEGs de verdad
 * en todos lados, no solo más chicos: eso solo ya saca a Android de tener que
 * parsear contenedores HEIF gigantes para pintar una miniatura.
 *
 * Necesita la service_role key (bypassea RLS: el bucket tiene policy de
 * insert/select por dueño, no de update, y acá hay que pisar fotos de
 * decenas de dueños distintos). NUNCA va al repo ni se pasa por acá:
 * se toma de una variable de entorno.
 *
 * Cómo correrlo (sharp no es dep del proyecto, se instala aparte):
 *   npm install sharp --no-save
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/resize-cause-covers.mjs
 *   (agregar DRY_RUN=1 adelante para solo listar qué haría, sin subir nada)
 *
 * La service_role key se copia una vez desde Supabase > Project Settings >
 * API > service_role. No hace falta guardarla en ningún lado: se descarta
 * al cerrar la terminal.
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';

const SUPABASE_URL = 'https://fyaxvofpqqlvtudmnmxi.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const MAX_SIDE = 1600;
const JPEG_QUALITY = 80;
const BUCKET = 'cause-covers';
const BACKUP_DIR = path.join(process.cwd(), 'scripts', '.backfill-originals-covers');

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno. Ver el comentario del script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** De una public URL del bucket saca el path interno (sin querystring). */
function pathFromPublicUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split('?')[0];
}

/**
 * Si sharp no puede leer el buffer (típico: HEIC multi-imagen mislabeled
 * como .jpg, ver comentario de arriba), lo pasa por `sips` para obtener un
 * JPEG real y decodificable. Devuelve { buffer, wasHeic }.
 */
async function ensureDecodable(buffer, tmpName) {
  try {
    await sharp(buffer).metadata();
    return { buffer, wasHeic: false };
  } catch {
    const tmpIn = path.join(os.tmpdir(), `${tmpName}-in`);
    const tmpOut = path.join(os.tmpdir(), `${tmpName}-out.jpg`);
    fs.writeFileSync(tmpIn, buffer);
    try {
      execFileSync('sips', ['-s', 'format', 'jpeg', tmpIn, '--out', tmpOut], { stdio: 'pipe' });
      const converted = fs.readFileSync(tmpOut);
      return { buffer: converted, wasHeic: true };
    } finally {
      fs.rmSync(tmpIn, { force: true });
      fs.rmSync(tmpOut, { force: true });
    }
  }
}

async function main() {
  const { data: rows, error } = await supabase
    .from('causes_public')
    .select('id, image_urls');
  if (error) throw new Error(`No se pudo leer causes_public: ${error.message}`);

  if (!DRY_RUN) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    for (const url of row.image_urls ?? []) {
      const objectPath = pathFromPublicUrl(url);
      if (!objectPath) {
        console.warn(`  ! URL fuera del bucket ${BUCKET}, se ignora: ${url}`);
        continue;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const original = Buffer.from(await res.arrayBuffer());
        const { buffer: decodable, wasHeic } = await ensureDecodable(
          original,
          objectPath.replace(/\//g, '_'),
        );
        const meta = await sharp(decodable).metadata();
        const longSide = Math.max(meta.width ?? 0, meta.height ?? 0);

        if (longSide <= MAX_SIDE && !wasHeic) {
          console.log(`  = ya está chica (${meta.width}x${meta.height}), se salta: ${objectPath}`);
          skipped++;
          continue;
        }

        const resized = await sharp(decodable)
          .rotate() // auto-orienta según EXIF antes de perder los metadatos
          .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: JPEG_QUALITY })
          .toBuffer();

        totalBefore += original.length;
        totalAfter += resized.length;

        console.log(
          `  ${objectPath}: ${wasHeic ? '[HEIC->JPEG] ' : ''}${meta.width}x${meta.height} ` +
            `${(original.length / 1024).toFixed(0)} KB -> ${(resized.length / 1024).toFixed(0)} KB`,
        );

        if (DRY_RUN) {
          processed++;
          continue;
        }

        const backupPath = path.join(BACKUP_DIR, objectPath.replace(/\//g, '__'));
        fs.writeFileSync(backupPath, original);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(objectPath, resized, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        processed++;
      } catch (err) {
        console.error(`  x falló ${objectPath}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n--- resumen ---');
  console.log(`procesadas: ${processed}, saltadas (ya chicas): ${skipped}, con error: ${failed}`);
  if (totalBefore > 0) {
    console.log(
      `peso: ${(totalBefore / 1024 / 1024).toFixed(1)} MB -> ${(totalAfter / 1024 / 1024).toFixed(1)} MB`,
    );
  }
  if (!DRY_RUN && processed > 0) {
    console.log(`originales guardados en ${BACKUP_DIR}`);
  }
  if (DRY_RUN) console.log('DRY_RUN=1: no se subió ni se guardó nada.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
