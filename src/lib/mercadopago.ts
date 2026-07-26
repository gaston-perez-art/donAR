import { supabase } from './supabase';

/**
 * Pide a la Edge Function que cree una preferencia de pago en Mercado Pago y
 * devuelve el link del checkout (sandbox). La app lo abre en el navegador.
 */
export async function createMpCheckout(params: {
  causeId: string;
  title: string;
  amount: number;
  returnUrl: string;
}): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('mp-create-preference', {
    body: params,
  });
  if (error) return { url: null, error: error.message };
  if (data?.error) return { url: null, error: data.error };

  // Con token de prueba se usa el sandbox; init_point como respaldo.
  const url: string | null = data?.sandbox_init_point ?? data?.init_point ?? null;
  if (!url) return { url: null, error: 'No se recibió el link de pago' };
  return { url, error: null };
}
