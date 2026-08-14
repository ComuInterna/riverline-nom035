/**
 * scoring-engine-guia1.js
 * ---------------------------------------------------------------------
 * Motor de calificación de la Guía de Referencia I (NOM-035-STPS-2018):
 * cuestionario para identificar trabajadores sujetos a acontecimientos
 * traumáticos severos.
 *
 * A diferencia de Guía II/III (suma ponderada + rangos de riesgo), este
 * cuestionario usa una lógica de COMPUERTAS (ver GR.I de la norma):
 *
 *   Sección I  (1 reactivo, Sí/No)
 *     - "No" -> el cuestionario termina aquí. No requiere atención clínica.
 *     - "Sí" -> se deben contestar las secciones II, III y IV completas.
 *
 *   Si se llegó a contestar II/III/IV, requiere atención clínica si
 *   CUALQUIERA de estas 3 reglas se cumple:
 *     1) Algún "Sí" en la Sección II (2 reactivos)
 *     2) 3 o más "Sí" en la Sección III (7 reactivos)
 *     3) 2 o más "Sí" en la Sección IV (5 reactivos)
 *
 * IMPORTANTE: a diferencia de Guía II/III, esta guía SÍ identifica a la
 * persona (la norma, numeral 5.5, requiere poder canalizarla a atención).
 * Este motor no decide el manejo de datos personales — eso lo hace la
 * capa de persistencia (seguimiento.guia1_resultados) — solo calcula.
 * ---------------------------------------------------------------------
 */

const IDS_SECCION_1 = ['GR1_1'];
const IDS_SECCION_2 = ['GR1_2', 'GR1_3'];
const IDS_SECCION_3 = ['GR1_4', 'GR1_5', 'GR1_6', 'GR1_7', 'GR1_8', 'GR1_9', 'GR1_10'];
const IDS_SECCION_4 = ['GR1_11', 'GR1_12', 'GR1_13', 'GR1_14', 'GR1_15'];

const UMBRAL_SECCION_3 = 3; // "3 o más" preguntas en Sí
const UMBRAL_SECCION_4 = 2; // "2 o más" preguntas en Sí

/**
 * @typedef {Object.<string, boolean>} RespuestasGuia1  reactivo_id -> true (Sí) | false (No)
 */

/**
 * Cuenta cuántas respuestas de una lista de ids son "Sí" (true).
 * Lanza error si falta alguna respuesta requerida — nunca asume un
 * valor por defecto para un reactivo no contestado.
 */
function contarSiesRequeridos(respuestas, ids) {
  let conteo = 0;
  const faltantes = [];
  for (const id of ids) {
    if (!(id in respuestas)) {
      faltantes.push(id);
      continue;
    }
    if (respuestas[id] === true) conteo++;
  }
  if (faltantes.length > 0) {
    throw new Error(`Faltan respuestas: ${faltantes.join(', ')}`);
  }
  return conteo;
}

/**
 * Verifica que no se hayan enviado respuestas para reactivos que, según
 * la Sección I, no debían contestarse (Sección I = "No" -> nunca se
 * preguntan II/III/IV). Evita que datos "de más" se cuelen al resultado.
 */
function verificarSinRespuestasSobrantes(respuestas, idsPermitidos) {
  const permitidos = new Set(idsPermitidos);
  const sobrantes = Object.keys(respuestas).filter((id) => !permitidos.has(id));
  if (sobrantes.length > 0) {
    throw new Error(`Se recibieron respuestas para reactivos que no aplican: ${sobrantes.join(', ')}`);
  }
}

/**
 * Función principal. Recibe un objeto { reactivo_id: boolean } y regresa
 * el resultado completo según la lógica oficial de la Guía I.
 *
 * @param {RespuestasGuia1} respuestas
 * @returns {{
 *   seccion1EventoTraumatico: boolean,
 *   seccion2AlgunSi: boolean | null,
 *   seccion3ConteoSi: number | null,
 *   seccion4ConteoSi: number | null,
 *   requiereAtencionClinica: boolean,
 *   criteriosDisparados: string[]
 * }}
 */
export function calificarGuia1(respuestas) {
  if (!respuestas || typeof respuestas !== 'object') {
    throw new Error('Se requiere un objeto de respuestas.');
  }

  // Sección I es siempre obligatoria.
  const conteoSeccion1 = contarSiesRequeridos(respuestas, IDS_SECCION_1);
  const seccion1EventoTraumatico = conteoSeccion1 > 0;

  if (!seccion1EventoTraumatico) {
    // GR.I inciso a): si la Sección I es "No", el cuestionario termina
    // aquí. No se deben haber recibido respuestas de las demás secciones.
    verificarSinRespuestasSobrantes(respuestas, IDS_SECCION_1);
    return {
      seccion1EventoTraumatico: false,
      seccion2AlgunSi: null,
      seccion3ConteoSi: null,
      seccion4ConteoSi: null,
      requiereAtencionClinica: false,
      criteriosDisparados: [],
    };
  }

  // GR.I inciso b): Sección I fue "Sí" -> se requieren II, III y IV completas.
  verificarSinRespuestasSobrantes(respuestas, [...IDS_SECCION_1, ...IDS_SECCION_2, ...IDS_SECCION_3, ...IDS_SECCION_4]);

  const conteoSeccion2 = contarSiesRequeridos(respuestas, IDS_SECCION_2);
  const conteoSeccion3 = contarSiesRequeridos(respuestas, IDS_SECCION_3);
  const conteoSeccion4 = contarSiesRequeridos(respuestas, IDS_SECCION_4);

  const seccion2AlgunSi = conteoSeccion2 >= 1;
  const criterios = [];
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

export { IDS_SECCION_1, IDS_SECCION_2, IDS_SECCION_3, IDS_SECCION_4 };
