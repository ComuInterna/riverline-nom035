// =====================================================================
// supabase/functions/send-reminder/index.ts
// ---------------------------------------------------------------------
// Envía un correo de recordatorio a un colaborador pendiente. Solo toca
// el esquema `seguimiento` (nombre, email, contador de recordatorios).
// Nunca lee ni referencia el esquema `encuestas`.
//
// Variables de entorno esperadas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// =====================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  let body: { colaborador_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido' }), { status: 400 });
  }

  if (!body.colaborador_id) {
    return new Response(JSON.stringify({ error: 'Falta colaborador_id' }), { status: 400 });
  }

  try {
    const { data: colaborador, error } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .select('id, nombre, email, status, recordatorios_enviados')
      .eq('id', body.colaborador_id)
      .maybeSingle();
    if (error) throw error;
    if (!colaborador) {
      return new Response(JSON.stringify({ error: 'Colaborador no encontrado' }), { status: 404 });
    }
    if (colaborador.status === 'contesto') {
      return new Response(JSON.stringify({ error: 'Este colaborador ya contestó' }), { status: 409 });
    }
    if (!colaborador.email) {
      return new Response(JSON.stringify({ error: 'El colaborador no tiene email registrado' }), { status: 422 });
    }

    // Envío del correo vía Resend (o el proveedor que prefieras).
    const respuestaCorreo = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Desarrollo Humano Riverline <notificaciones@riverline.mx>',
        to: colaborador.email,
        subject: 'Recordatorio: encuesta NOM-035 pendiente',
        html: `<p>Hola ${colaborador.nombre},</p>
               <p>Tienes pendiente contestar la encuesta de identificación de riesgo psicosocial (NOM-035).
               Es anónima y toma entre 10 y 15 minutos.</p>
               <p>Gracias por tu participación.</p>
               <p>Desarrollo Humano · Riverline</p>`,
      }),
    });
    if (!respuestaCorreo.ok) {
      throw new Error(`Error del proveedor de correo: ${respuestaCorreo.status}`);
    }

    const { error: errUpdate } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .update({ recordatorios_enviados: (colaborador.recordatorios_enviados || 0) + 1 })
      .eq('id', body.colaborador_id);
    if (errUpdate) throw errUpdate;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-reminder error:', e);
    return new Response(JSON.stringify({ error: 'No se pudo enviar el recordatorio' }), { status: 500 });
  }
});
