// Edge Function: la página a la que cae el link cuando alguien comparte una
// causa (botón "Compartir" en cause/[id].tsx). Pedido de Gastón (2 ago):
// "compartir es fundamental, es el efecto multiplicador" — hasta acá
// Share.share() mandaba solo texto, sin ningún link tocable.
//
// Por qué esto y no un donar://cause/[id] pelado en el mensaje: un link con
// scheme custom (donar://...) casi ningún cliente de chat (WhatsApp incluido)
// lo detecta como tocable, queda como texto muerto. Esta página vive en un
// dominio https real (el propio proyecto de Supabase, sin depender de
// comprar donar.ar todavía, Épica 14.2 sigue sin resolver) así que SIEMPRE
// es tocable, muestra una preview linda (OG tags: título/imagen/monto) y, si
// quien la abre ya tiene la app instalada, intenta abrirla directo ahí.
//
// Límite conocido, no es un bug: el intento de abrir la app (donar://...)
// solo funciona en el dev build de EAS (Épica 9.2), no en Expo Go — Expo Go
// no registra el scheme propio de la app. Mientras tanto, cualquiera que
// toque el link ve igual el resumen de la causa en esta página.
//
// Deploy: dashboard de Supabase (Edge Functions) > New function >
// share-cause > borrar TODO lo que venga en el editor por defecto > pegar
// esto > Deploy. IMPORTANTE, distinto a las otras funciones del repo: hay
// que APAGAR "Verify JWT" al crearla (o en su configuración después). Las
// otras dos funciones las invoca la app con su propio header de auth; a
// esta la toca cualquiera desde afuera (WhatsApp, un navegador), sin ningún
// header — con "Verify JWT" prendido, Supabase la rechaza antes de que
// corra el código, y el link muestra un error en vez de la causa.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BRAND = '#1E88E5';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function page(opts: { title: string; description: string; image: string | null; deepLink: string | null }): string {
  const { title, description, image, deepLink } = opts;
  const ogImage = image ? `<meta property="og:image" content="${escapeHtml(image)}">` : '';
  const redirectScript = deepLink
    ? `<script>window.location.href = ${JSON.stringify(deepLink)};</script>`
    : '';
  const openButton = deepLink
    ? `<a class="btn" href="${escapeHtml(deepLink)}">Abrir en donAR</a>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · donAR</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
${ogImage}
<style>
  body { margin:0; font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif; background:#F4F9FD; color:#10302B; }
  .card { max-width:480px; margin:40px auto; padding:28px; }
  .cover { width:100%; height:200px; object-fit:cover; border-radius:16px; background:${BRAND}22; }
  h1 { font-size:20px; margin:20px 0 8px; }
  p { font-size:14.5px; line-height:1.5; color:#5A6B68; }
  .btn { display:block; text-align:center; margin-top:24px; padding:15px; border-radius:12px; background:${BRAND}; color:#fff; text-decoration:none; font-weight:700; }
  .foot { font-size:12px; color:#9AA6A4; margin-top:24px; text-align:center; }
</style>
</head>
<body>
  <div class="card">
    ${image ? `<img class="cover" src="${escapeHtml(image)}">` : ''}
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    ${openButton}
    <div class="foot">donAR — conectá sin intermediarios. La confianza es el producto.</div>
  </div>
  ${redirectScript}
</body>
</html>`;
}

Deno.serve(async (req) => {
  const html = (body: string, status = 200) =>
    new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  try {
    const url = new URL(req.url);
    const causeId = url.searchParams.get('id');
    if (!causeId) {
      return html(page({ title: 'donAR', description: 'Conectá sin intermediarios.', image: null, deepLink: null }));
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/causes_public?id=eq.${causeId}&select=title,story,image_urls,goal_amount,raised_amount,status`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = res.ok ? await res.json() : [];
    const cause = rows[0];

    if (!cause) {
      return html(page({ title: 'Causa no encontrada', description: 'Puede que ya se haya cerrado.', image: null, deepLink: null }), 404);
    }

    const raised = Number(cause.raised_amount) || 0;
    const goal = Number(cause.goal_amount) || 0;
    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    const description = cause.story
      ? String(cause.story).slice(0, 160)
      : `Lleva ${pct}% de la meta en donAR. Cada aporte queda verificado y a la vista.`;

    return html(
      page({
        title: cause.title,
        description,
        image: cause.image_urls?.[0] ?? null,
        deepLink: `donar://cause/${causeId}`,
      }),
    );
  } catch (e) {
    console.error('share-cause error:', e);
    return html(page({ title: 'donAR', description: 'Conectá sin intermediarios.', image: null, deepLink: null }), 500);
  }
});
