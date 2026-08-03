// Edge Function: avisa por push al beneficiado cuando le llega una
// transferencia pendiente de confirmar (Épica 9.2). Pedido de Gastón (2 ago):
// "es el momento cúspide del beneficiado, no puede pasar desapercibido".
//
// Se dispara con un Database Webhook (Database > Webhooks en el dashboard de
// Supabase): tabla `contributions`, evento INSERT, apuntando a esta función.
// El payload que manda un Database Webhook trae la fila nueva en `record`.
//
// Deploy: dashboard de Supabase (Edge Functions) > New function >
// notify-pending-transfer > borrar TODO lo que venga en el editor por
// defecto > pegar esto > Deploy. No necesita secretos propios: SUPABASE_URL
// y SUPABASE_SERVICE_ROLE_KEY ya vienen inyectados por Supabase en toda Edge
// Function. La API de push de Expo (https://exp.host) tampoco pide API key.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function restGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

Deno.serve(async (req) => {
  // Devolver siempre 200: un error acá no debería hacer que el Database
  // Webhook reintente en bucle. Los problemas quedan en los logs de la
  // función (dashboard > Edge Functions > Logs).
  try {
    const payload = await req.json();
    const record = payload?.record;

    // Solo importa una transferencia recién entrada como pendiente. Un aporte
    // por Mercado Pago (method 'mp') ya nace 'approved', no hace falta avisar
    // "confirmá esto": no hay nada que confirmar.
    if (!record || record.status !== 'pending' || record.method !== 'transfer') {
      return new Response('ignored', { status: 200 });
    }

    const [cause] = await restGet(`causes?id=eq.${record.cause_id}&select=owner_id,title`);
    if (!cause?.owner_id) return new Response('no cause', { status: 200 });

    let donorName = 'Alguien de la comunidad';
    if (!record.anonymous && record.donor_id) {
      const [donor] = await restGet(`profiles?id=eq.${record.donor_id}&select=display_name`);
      if (donor?.display_name) donorName = donor.display_name;
    }

    const tokens = await restGet(`push_tokens?user_id=eq.${cause.owner_id}&select=token`);
    if (tokens.length === 0) return new Response('no tokens', { status: 200 });

    const amount = Number(record.amount) || 0;
    const amountText = `$${amount.toLocaleString('es-AR')}`;

    const messages = tokens.map((t) => ({
      to: t.token,
      title: 'Te llegó una donación 💙',
      body: `${donorName} te transfirió ${amountText} para "${cause.title}". Confirmala cuando te llegue.`,
      data: { causeId: record.cause_id },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('notify-pending-transfer error:', e);
    return new Response('error', { status: 200 });
  }
});
