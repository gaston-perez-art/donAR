// Edge Function: crea una preferencia de pago en Mercado Pago (sandbox).
//
// La app la invoca con supabase.functions.invoke('mp-create-preference', ...).
// El token de MP vive acá como secreto (MP_ACCESS_TOKEN), nunca en la app.
//
// Deploy: desde el dashboard de Supabase (Edge Functions > Deploy new function)
// o con la CLI. Setear el secreto:  MP_ACCESS_TOKEN = tu Access Token de PRUEBA
// (empieza con "TEST-").
//
// Sandbox: con un token de prueba, la app usa `sandbox_init_point` y se paga
// con las tarjetas de test de Mercado Pago. No se mueve plata real.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const token = Deno.env.get('MP_ACCESS_TOKEN');
    if (!token) return json({ error: 'MP_ACCESS_TOKEN no configurado en la función' }, 500);

    const { title, amount, causeId, returnUrl } = await req.json();
    const unitPrice = Number(amount);
    if (!unitPrice || unitPrice <= 0) return json({ error: 'Monto inválido' }, 400);

    const preference = {
      items: [
        {
          title: title ?? 'Aporte a una causa',
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'ARS',
        },
      ],
      back_urls: {
        success: returnUrl,
        failure: returnUrl,
        pending: returnUrl,
      },
      auto_return: 'approved',
      external_reference: causeId ?? '',
    };

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    });
    const data = await res.json();

    if (!res.ok) {
      return json({ error: data.message ?? 'Error creando el pago en Mercado Pago', detail: data }, 500);
    }

    return json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
