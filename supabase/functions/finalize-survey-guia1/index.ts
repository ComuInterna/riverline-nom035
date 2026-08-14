// =====================================================================
// supabase/functions/finalize-survey-guia1/index.ts
// ---------------------------------------------------------------------
// Cierre del cuestionario Guía de Referencia I (acontecimientos
// traumáticos severos). A DIFERENCIA de finalize-survey.ts (Guía III)
// y finalize-survey-guia2.ts (Guía II), esta función escribe un
// resultado IDENTIFICADO -- la norma (numeral 5.5) exige poder
// canalizar a la persona a atención clínica, así que aquí NO aplica
// el principio de anonimato estructural del resto de la plataforma.
//
// Variables de entorno esperadas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------
// Motor de calificación (idéntico en lógica a scoring-engine-guia1.js,
// ya probado con 25 casos, incluidos los umbrales exactos).
// ---------------------------------------------------------------------
const IDS_SECCION_1 = ['GR1_1'];
const IDS_SECCION_2 = ['GR1_2', 'GR1_3'];
const IDS_SECCION_3 = ['GR1_4', 'GR1_5', 'GR1_6', 'GR1_7', 'GR1_8', 'GR1_9', 'GR1_10'];
const IDS_SECCION_4 = ['GR1_11', 'GR1_12', 'GR1_13', 'GR1_14', 'GR1_15'];
const UMBRAL_SECCION_3 = 3;
const UMBRAL_SECCION_4 = 2;

function contarSiesRequeridos(respuestas: Record<string, boolean>, ids: string[]): number {
  let conteo = 0;
  const faltantes: string[] = [];
  for (const id of ids) {
    if (!(id in respuestas)) { faltantes.push(id); continue; }
    if (respuestas[id] === true) conteo++;
  }
  if (faltantes.length > 0) throw new Error(`Faltan respuestas: ${faltantes.join(', ')}`);
  return conteo;
}

function verificarSinRespuestasSobrantes(respuestas: Record<string, boolean>, idsPermitidos: string[]) {
  const permitidos = new Set(idsPermitidos);
  const sobrantes = Object.keys(respuestas).filter((id) => !permitidos.has(id));
  if (sobrantes.length > 0) throw new Error(`Respuestas para reactivos que no aplican: ${sobrantes.join(', ')}`);
}

function calificarGuia1(respuestas: Record<string, boolean>) {
  const conteoSeccion1 = contarSiesRequeridos(respuestas, IDS_SECCION_1);
  const seccion1EventoTraumatico = conteoSeccion1 > 0;

  if (!seccion1EventoTraumatico) {
    verificarSinRespuestasSobrantes(respuestas, IDS_SECCION_1);
    return {
      seccion1EventoTraumatico: false,
      seccion2AlgunSi: null,
      seccion3ConteoSi: null,
      seccion4ConteoSi: null,
      requiereAtencionClinica: false,
      criteriosDisparados: [] as string[],
    };
  }

  verificarSinRespuestasSobrantes(respuestas, [...IDS_SECCION_1, ...IDS_SECCION_2, ...IDS_SECCION_3, ...IDS_SECCION_4]);

  const conteoSeccion2 = contarSiesRequeridos(respuestas, IDS_SECCION_2);
  const conteoSeccion3 = contarSiesRequeridos(respuestas, IDS_SECCION_3);
  const conteoSeccion4 = contarSiesRequeridos(respuestas, IDS_SECCION_4);
  const seccion2AlgunSi = conteoSeccion2 >= 1;

  const criterios: string[] = [];
  if (seccion2AlgunSi) criterios.push('seccion_2_algun_si');
  if (conteoSeccion3 >= UMBRAL_SECCION_3) criterios.push('seccion_3_tres_o_mas_si');
  if (conteoSeccion4 >= UMBRAL_SECCION_4) criterios.push('seccion_4_dos_o_mas_si');

  return {
    seccion1EventoTraumatico: true,
    seccion2AlgunSi,
    seccion3ConteoSi: conteoSeccion3,
    seccion4ConteoSi: conteoSeccion4,
    requiereAtencionClinica: criterios.length > 0,
    criteriosDisparados: criterios,
  };
}

// ---------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------
interface CuerpoSolicitud {
  colaborador_id: string;
  respuestas: Record<string, boolean>; // { "GR1_1": true, "GR1_2": false, ... }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body: CuerpoSolicitud;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { colaborador_id, respuestas } = body;
  if (!colaborador_id || !respuestas || typeof respuestas !== 'object') {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // 1) Validar que el colaborador exista, que Guía I aplique a su
    //    centro (status_guia1 no es NULL) y que no la haya contestado ya.
    const { data: colaborador, error: errColab } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .select('id, status_guia1')
      .eq('id', colaborador_id)
      .maybeSingle();
    if (errColab) throw errColab;
    if (!colaborador) {
      return new Response(JSON.stringify({ error: 'Colaborador no encontrado' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (colaborador.status_guia1 === null) {
      return new Response(JSON.stringify({ error: 'La Guía I no aplica al centro de trabajo de este colaborador' }), {
        status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (colaborador.status_guia1 === 'contesto') {
      return new Response(JSON.stringify({ error: 'Este colaborador ya contestó la Guía I' }), {
        status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2) Calificar (lógica de compuertas oficial de GR.I).
    const resultado = calificarGuia1(respuestas);

    // 3) ESCRITURA IDENTIFICADA -- a propósito. Este es el único
    //    resultado de toda la plataforma que se guarda junto al
    //    colaborador, porque la norma requiere poder canalizarlo.
    const { error: errInsert } = await supabaseAdmin
      .schema('seguimiento')
      .from('guia1_resultados')
      .insert({
        colaborador_id,
        respuestas,
        seccion1_evento_traumatico: resultado.seccion1EventoTraumatico,
        seccion2_algun_si: resultado.seccion2AlgunSi,
        seccion3_conteo_si: resultado.seccion3ConteoSi,
        seccion4_conteo_si: resultado.seccion4ConteoSi,
        requiere_atencion_clinica: resultado.requiereAtencionClinica,
        criterios_disparados: resultado.criteriosDisparados,
      });
    if (errInsert) throw errInsert;

    // 4) Actualizar el status específico de Guía I (nunca toca
    //    status/fecha_encuesta, que son de Guía III).
    const { error: errStatus } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .update({ status_guia1: 'contesto', fecha_encuesta_guia1: new Date().toISOString() })
      .eq('id', colaborador_id);
    if (errStatus) throw errStatus;

    // La respuesta al navegador NUNCA incluye si "requiere atención
    // clínica" -- eso solo se consulta desde el panel de administrador
    // con el RPC correspondiente (ver Edge Functions/módulo siguiente),
    // nunca se revela al propio colaborador en el momento de contestar.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('finalize-survey-guia1 error:', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
