// =====================================================================
// supabase/functions/finalize-survey/index.ts
// ---------------------------------------------------------------------
// Cierre de la encuesta NOM-035 (Guía III). Esta función:
//   1) Valida al colaborador contra `seguimiento.colaboradores` (rol
//      de servicio, nunca expuesto al cliente).
//   2) Ejecuta el motor de calificación puro (mismo algoritmo que
//      scoring-engine.js del Módulo 3, portado a TypeScript aquí para
//      correr en el runtime Deno de Supabase Edge Functions).
//   3) Realiza DOS escrituras independientes en la misma transacción
//      lógica:
//        a) `encuestas.*` — datos anónimos (UUID nuevo, sin colaborador_id)
//        b) `seguimiento.colaboradores` — solo cambia status a 'contesto'
//      Ninguna de las dos escrituras lee ni expone datos de la otra
//      tabla hacia el cliente. El cliente nunca recibe calificaciones
//      individuales de vuelta.
//   4) Borra cualquier buffer temporal de avance (seguimiento_buffer_respuestas)
//      asociado a ese colaborador_id.
//
// Variables de entorno esperadas (configuradas en el proyecto Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cliente con rol de servicio: única identidad en todo el sistema con
// permiso de lectura sobre catalogo.* Y escritura en ambos esquemas.
// El cliente (navegador del colaborador) NUNCA tiene este rol.
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------
interface RespuestaEntrante {
  reactivo_id: string; // "R1".."R72"
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
// Motor de calificación (idéntico en lógica a scoring-engine.js, Módulo 3)
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
  // El catálogo se lee en vivo de Supabase — nunca hardcodeado aquí.
  const [
    { data: reactivos, error: e1 },
    { data: dimensiones, error: e2 },
    { data: dominios, error: e3 },
    { data: rangosCategoria, error: e4 },
    { data: rangosDominio, error: e5 },
    { data: rangoGlobal, error: e6 },
  ] = await Promise.all([
    supabaseAdmin.from('catalogo.reactivos').select('*'),
    supabaseAdmin.from('catalogo.dimensiones').select('*'),
    supabaseAdmin.from('catalogo.dominios').select('*'),
    supabaseAdmin.from('catalogo.rangos_riesgo_categoria').select('*'),
    supabaseAdmin.from('catalogo.rangos_riesgo_dominio').select('*'),
    supabaseAdmin.from('catalogo.rangos_riesgo_global').select('*'),
  ]);
  for (const err of [e1, e2, e3, e4, e5, e6]) {
    if (err) throw new Error(`Error leyendo catálogo: ${err.message}`);
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

  return {
    calificacionesReactivo,
    porDominio,
    porCategoria,
    global: { puntaje: puntajeGlobal, nivel_riesgo: nivelGlobal },
  };
}

// ---------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  let body: CuerpoSolicitud;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo JSON inválido' }), { status: 400 });
  }

  const { colaborador_id, respuestas, atiendeClientes, esJefe, duracion_segundos } = body;
  if (!colaborador_id || !Array.isArray(respuestas) || respuestas.length === 0) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400 });
  }

  try {
    // 1) Validar que el colaborador exista y no haya contestado ya.
    const { data: colaborador, error: errColab } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .select('id, status')
      .eq('id', colaborador_id)
      .maybeSingle();
    if (errColab) throw errColab;
    if (!colaborador) {
      return new Response(JSON.stringify({ error: 'Colaborador no encontrado' }), { status: 404 });
    }
    if (colaborador.status === 'contesto') {
      return new Response(JSON.stringify({ error: 'Este colaborador ya contestó' }), { status: 409 });
    }

    // 2) Calificar (motor puro, catálogo en vivo).
    const resultado = await calificarEncuesta({ respuestas, atiendeClientes, esJefe });

    // 3a) ESCRITURA ANÓNIMA — esquema `encuestas`, UUID nuevo sin relación
    //     a colaborador_id. Esta es la ÚNICA función en todo el sistema
    //     que ve ambos lados a la vez, y nunca los devuelve juntos.
    const aplicacionUuid = crypto.randomUUID();
    const { error: errAplicacion } = await supabaseAdmin
      .schema('encuestas')
      .from('aplicaciones')
      .insert({
        uuid: aplicacionUuid,
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
    const { error: errRespuestas } = await supabaseAdmin
      .schema('encuestas')
      .from('respuestas')
      .insert(filasRespuestas);
    if (errRespuestas) throw errRespuestas;

    const filasCalificaciones = [
      ...resultado.porDominio.map((d) => ({
        aplicacion_uuid: aplicacionUuid,
        dominio_id: d.dominio_id,
        categoria_id: d.categoria_id,
        puntaje_dominio: d.puntaje,
        nivel_riesgo: d.nivel_riesgo,
      })),
    ];
    const { error: errCalifDominio } = await supabaseAdmin
      .schema('encuestas')
      .from('calificaciones')
      .insert(filasCalificaciones);
    if (errCalifDominio) throw errCalifDominio;

    // 3b) ESCRITURA DE SEGUIMIENTO — esquema `seguimiento`, solo status.
    //     No incluye ninguna calificación ni referencia a aplicacionUuid.
    const { error: errStatus } = await supabaseAdmin
      .schema('seguimiento')
      .from('colaboradores')
      .update({ status: 'contesto', fecha_encuesta: new Date().toISOString() })
      .eq('id', colaborador_id);
    if (errStatus) throw errStatus;

    // 4) Borrar el buffer temporal de avance (si existía).
    await supabaseAdmin
      .schema('seguimiento')
      .from('buffer_respuestas')
      .delete()
      .eq('colaborador_id', colaborador_id)
      .then(() => {})
      .catch(() => {}); // no crítico si falla

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('finalize-survey error:', e);
    return new Response(JSON.stringify({ error: 'No se pudo finalizar la encuesta' }), { status: 500 });
  }
});
