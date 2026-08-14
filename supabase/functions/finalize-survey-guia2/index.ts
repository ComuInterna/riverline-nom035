// =====================================================================
// supabase/functions/finalize-survey-guia2/index.ts
// ---------------------------------------------------------------------
// Cierre de la encuesta Guía de Referencia II (16-50 trabajadores).
// Misma lógica y mismo principio de anonimato estructural que
// finalize-survey.ts (Guía III): dos escrituras independientes, sin
// vínculo entre ellas. Se diferencia de esa función solo en:
//   - Lee el catálogo de catalogo.guia2_* (no catalogo.reactivos/etc.)
//   - Marca guia='guia_2' en encuestas.aplicaciones/calificaciones
//   - Registra centro_trabajo (leído del propio colaborador, nunca
//     confiado del cuerpo de la solicitud, para que no se pueda
//     falsificar)
//   - Actualiza status_guia2 (no status, que es de Guía III)
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

interface RespuestaEntrante {
  reactivo_id: string; // "G2_R1".."G2_R46"
  indice: number;      // 0-4
}
interface CuerpoSolicitud {
  colaborador_id: string;
  respuestas: RespuestaEntrante[];
  atiendeClientes: boolean;
  esJefe: boolean;
  duracion_segundos: number;
}

// ---------------------------------------------------------------------
// Motor de calificación (idéntico en lógica a scoring-engine.js del
// Módulo 3 -- Guía II y Guía III comparten el mismo algoritmo genérico,
// solo cambia el catálogo).
// ---------------------------------------------------------------------
function calificarReactivo(indice: number, esInvertido: boolean): number {
  if (!Number.isInteger(indice) || indice < 0 || indice > 4) {
    throw new Error(`Índice de respuesta inválido: ${indice}`);
  }
  return esInvertido ? indice : 4 - indice;
}

function determinarNivelRiesgo(valor: number, rangos: any[]): string {
  const orden = ['nulo', 'bajo', 'medio', 'alto', 'muy_alto'];
  const rangosOrdenados = orden.map((n) => rangos.find((r) => r.nivel === n)).filter(Boolean);
  for (const rango of rangosOrdenados) {
    const sup = rango.limite_superior === null ? Infinity : rango.limite_superior;
    if (valor < sup) return rango.nivel;
  }
  return 'muy_alto';
}

async function calificarEncuesta(
  entrada: { respuestas: RespuestaEntrante[]; atiendeClientes: boolean; esJefe: boolean }
) {
  const [
    { data: reactivos, error: e1 },
    { data: dimensiones, error: e2 },
    { data: dominios, error: e3 },
    { data: rangosCategoria, error: e4 },
    { data: rangosDominio, error: e5 },
    { data: rangoGlobal, error: e6 },
  ] = await Promise.all([
    supabaseAdmin.from('catalogo.guia2_reactivos').select('*'),
    supabaseAdmin.from('catalogo.guia2_dimensiones').select('*'),
    supabaseAdmin.from('catalogo.guia2_dominios').select('*'),
    supabaseAdmin.from('catalogo.guia2_rangos_categoria').select('*'),
    supabaseAdmin.from('catalogo.guia2_rangos_dominio').select('*'),
    supabaseAdmin.from('catalogo.guia2_rango_global').select('*'),
  ]);
  for (const err of [e1, e2, e3, e4, e5, e6]) {
    if (err) throw new Error(`Error leyendo catálogo Guía II: ${err.message}`);
  }

  const reactivosAplicables = reactivos!.filter((r: any) => {
    if (r.requiere_atencion_clientes && !entrada.atiendeClientes) return false;
    if (r.requiere_ser_jefe && !entrada.esJefe) return false;
    return true;
  });
  const reactivoPorId = new Map(reactivosAplicables.map((r: any) => [r.id, r]));
  const respuestaPorReactivo = new Map(entrada.respuestas.map((r) => [r.reactivo_id, r.indice]));

  const faltantes = reactivosAplicables.filter((r: any) => !respuestaPorReactivo.has(r.id));
  if (faltantes.length > 0) {
    throw new Error(`Faltan respuestas: ${faltantes.map((r: any) => r.id).join(', ')}`);
  }
  const noAplicables = entrada.respuestas.filter((r) => !reactivoPorId.has(r.reactivo_id));
  if (noAplicables.length > 0) {
    throw new Error(`Respuestas para reactivos que no aplican: ${noAplicables.map((r) => r.reactivo_id).join(', ')}`);
  }

  const calificacionesReactivo = reactivosAplicables.map((r: any) => ({
    reactivo_id: r.id,
    dimension_id: r.dimension_id,
    calificacion: calificarReactivo(respuestaPorReactivo.get(r.id)!, r.es_invertido),
  }));

  const dominioDeLaDimension = new Map(dimensiones!.map((d: any) => [d.id, d.dominio_id]));
  const categoriaDelDominio = new Map(dominios!.map((d: any) => [d.id, d.categoria_id]));

  const sumaPorDominio = new Map<string, number>();
  for (const c of calificacionesReactivo) {
    const domId = dominioDeLaDimension.get(c.dimension_id)!;
    sumaPorDominio.set(domId, (sumaPorDominio.get(domId) || 0) + c.calificacion);
  }
  const porDominio = [...sumaPorDominio.entries()].map(([dominio_id, puntaje]) => {
    const rangos = rangosDominio!.filter((r: any) => r.dominio_id === dominio_id);
    return {
      dominio_id,
      categoria_id: categoriaDelDominio.get(dominio_id),
      puntaje,
      nivel_riesgo: determinarNivelRiesgo(puntaje, rangos),
    };
  });

  const sumaPorCategoria = new Map<string, number>();
  for (const c of calificacionesReactivo) {
    const domId = dominioDeLaDimension.get(c.dimension_id)!;
    const catId = categoriaDelDominio.get(domId)!;
    sumaPorCategoria.set(catId, (sumaPorCategoria.get(catId) || 0) + c.calificacion);
  }
  const porCategoria = [...sumaPorCategoria.entries()].map(([categoria_id, puntaje]) => {
    const rangos = rangosCategoria!.filter((r: any) => r.categoria_id === categoria_id);
    return { categoria_id, puntaje, nivel_riesgo: determinarNivelRiesgo(puntaje, rangos) };
  });

  const puntajeGlobal = calificacionesReactivo.reduce((acc, c) => acc + c.calificacion, 0);
  const nivelGlobal = determinarNivelRiesgo(puntajeGlobal, rangoGlobal!);

  return { calificacionesReactivo, porDominio, porCategoria, global: { puntaje: puntajeGlobal, nivel_riesgo: nivelGlobal } };
}

// ---------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body: CuerpoSolicitud;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { colaborador_id, respuestas, atiendeClientes, esJefe, duracion_segundos } = body;
  if (!colaborador_id || !Array.isArray(respuestas) || respuestas.length === 0) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // 1) Validar colaborador: existe, Guía II aplica a su centro, y no
    //    la ha contestado ya. centro_trabajo se lee de AQUÍ -- nunca del
    //    cuerpo de la solicitud -- para que no se pueda falsificar.
    const { data: colaborador, error: errColab } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .select('id, status_guia2, centro_trabajo')
      .eq('id', colaborador_id)
      .maybeSingle();
    if (errColab) throw errColab;
    if (!colaborador) {
      return new Response(JSON.stringify({ error: 'Colaborador no encontrado' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (colaborador.status_guia2 === null) {
      return new Response(JSON.stringify({ error: 'La Guía II no aplica al centro de trabajo de este colaborador' }), {
        status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (colaborador.status_guia2 === 'contesto') {
      return new Response(JSON.stringify({ error: 'Este colaborador ya contestó la Guía II' }), {
        status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2) Calificar (motor puro, catálogo Guía II en vivo).
    const resultado = await calificarEncuesta({ respuestas, atiendeClientes, esJefe });

    // 3a) ESCRITURA ANÓNIMA -- mismo principio que Guía III: UUID nuevo
    //     sin colaborador_id, guia='guia_2', y centro_trabajo tomado del
    //     colaborador (no del cliente) para permitir segmentar por
    //     centro sin comprometer el mecanismo de anonimato.
    const aplicacionUuid = crypto.randomUUID();
    const { error: errAplicacion } = await supabaseAdmin
      .schema('encuestas')
      .from('aplicaciones')
      .insert({
        uuid: aplicacionUuid,
        guia: 'guia_2',
        centro_trabajo: colaborador.centro_trabajo,
        fecha_inicio: new Date(Date.now() - duracion_segundos * 1000).toISOString(),
        fecha_fin: new Date().toISOString(),
        duracion_segundos,
      });
    if (errAplicacion) throw errAplicacion;

    const filasRespuestas = resultado.calificacionesReactivo.map((c) => ({
      aplicacion_uuid: aplicacionUuid,
      reactivo_id: c.reactivo_id,
      calificacion_reactivo: c.calificacion,
    }));
    const { error: errRespuestas } = await supabaseAdmin.schema('encuestas').from('respuestas').insert(filasRespuestas);
    if (errRespuestas) throw errRespuestas;

    const filasCalificaciones = resultado.porDominio.map((d) => ({
      aplicacion_uuid: aplicacionUuid,
      guia: 'guia_2',
      dominio_id: d.dominio_id,
      categoria_id: d.categoria_id,
      puntaje_dominio: d.puntaje,
      nivel_riesgo: d.nivel_riesgo,
    }));
    const { error: errCalif } = await supabaseAdmin.schema('encuestas').from('calificaciones').insert(filasCalificaciones);
    if (errCalif) throw errCalif;

    // 3b) ESCRITURA DE SEGUIMIENTO -- status_guia2 específicamente,
    //     nunca status (que es de Guía III).
    const { error: errStatus } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .update({ status_guia2: 'contesto', fecha_encuesta_guia2: new Date().toISOString() })
      .eq('id', colaborador_id);
    if (errStatus) throw errStatus;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('finalize-survey-guia2 error:', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
