/**
 * scoring-engine.js
 * ---------------------------------------------------------------------
 * Motor de calificación NOM-035-STPS-2018, Guía de Referencia III.
 *
 * Principio de diseño (ver arquitectura, sección 8.1):
 *   Esta es una función PURA y DETERMINISTA. No contiene ningún reactivo,
 *   dominio, categoría ni rango de riesgo "hardcodeado". Todo se recibe
 *   desde el catálogo normativo (tablas catalogo.* en Supabase). Esto
 *   permite auditar la fidelidad normativa revisando el catálogo por
 *   separado del código, y actualizar el catálogo sin tocar el motor.
 *
 * Uso:
 *   import { calificarEncuesta } from './scoring-engine.js';
 *   const resultado = calificarEncuesta(
 *     { respuestas, atiendeClientes, esJefe },
 *     catalogo
 *   );
 * ---------------------------------------------------------------------
 */

/**
 * @typedef {Object} RespuestaReactivo
 * @property {string} reactivo_id  - Id del reactivo, ej. "R1".
 * @property {number} indice       - Índice de la opción elegida:
 *                                    0=Siempre, 1=Casi siempre, 2=Algunas veces,
 *                                    3=Casi nunca, 4=Nunca.
 *
 * @typedef {Object} EntradaEncuesta
 * @property {RespuestaReactivo[]} respuestas
 * @property {boolean} atiendeClientes - Respuesta a "¿Debo brindar servicio a clientes o usuarios?"
 * @property {boolean} esJefe          - Respuesta a "¿Soy jefe de otros trabajadores?"
 *
 * @typedef {Object} Catalogo
 * @property {Array}  reactivos            - catalogo.reactivos
 * @property {Array}  dimensiones          - catalogo.dimensiones
 * @property {Array}  dominios             - catalogo.dominios
 * @property {Array}  categorias           - catalogo.categorias
 * @property {Array}  rangosCategoria      - catalogo.rangos_riesgo_categoria
 * @property {Array}  rangosDominio        - catalogo.rangos_riesgo_dominio
 * @property {Array}  rangoGlobal          - catalogo.rangos_riesgo_global
 */

/**
 * Determina qué reactivos aplican a este colaborador según las dos ramas
 * condicionales oficiales del cuestionario (III.1-III.3):
 *   - Reactivos 65-68 solo si atiendeClientes === true
 *   - Reactivos 69-72 solo si esJefe === true
 */
function obtenerReactivosAplicables(catalogo, { atiendeClientes, esJefe }) {
  return catalogo.reactivos.filter((r) => {
    if (r.requiere_atencion_clientes && !atiendeClientes) return false;
    if (r.requiere_ser_jefe && !esJefe) return false;
    return true;
  });
}

/**
 * Calcula la calificación de un reactivo individual aplicando la inversión
 * de escala oficial (Tabla 5 de la Guía III):
 *   es_invertido = true  → Siempre=0, Casi siempre=1, Algunas veces=2, Casi nunca=3, Nunca=4
 *   es_invertido = false → Siempre=4, Casi siempre=3, Algunas veces=2, Casi nunca=1, Nunca=0
 */
function calificarReactivo(indice, esInvertido) {
  if (!Number.isInteger(indice) || indice < 0 || indice > 4) {
    throw new Error(`Índice de respuesta inválido: ${indice}. Debe ser un entero entre 0 y 4.`);
  }
  return esInvertido ? indice : 4 - indice;
}

/**
 * Determina el nivel de riesgo de un valor contra una lista de rangos oficiales.
 * Los rangos deben venir ordenados de menor a mayor severidad
 * (nulo, bajo, medio, alto, muy_alto). Un valor que cae exactamente en un
 * límite compartido (ej. Cfinal = 50 entre nulo y bajo) se asigna al nivel
 * superior, siguiendo la práctica estándar de interpretación de la Guía III.
 */
function determinarNivelRiesgo(valor, rangos) {
  const orden = ['nulo', 'bajo', 'medio', 'alto', 'muy_alto'];
  const rangosOrdenados = orden
    .map((nivel) => rangos.find((r) => r.nivel === nivel))
    .filter(Boolean);

  for (const rango of rangosOrdenados) {
    const limiteSuperior =
      rango.limite_superior === null || rango.limite_superior === undefined
        ? Infinity
        : rango.limite_superior;
    if (valor < limiteSuperior) {
      return rango.nivel;
    }
  }
  // Si no cayó en ningún rango (no debería ocurrir con catálogo bien formado),
  // se asigna el nivel más alto por seguridad.
  return 'muy_alto';
}

/**
 * Suma valores de un arreglo de objetos agrupando por una llave.
 * Devuelve un Map<llave, suma>.
 */
function sumarPorLlave(items, obtenerLlave, obtenerValor) {
  const acumulado = new Map();
  for (const item of items) {
    const llave = obtenerLlave(item);
    const valorActual = acumulado.get(llave) || 0;
    acumulado.set(llave, valorActual + obtenerValor(item));
  }
  return acumulado;
}

/**
 * Función principal del motor. Calcula la calificación completa de una
 * aplicación del cuestionario Guía III: por dimensión, por dominio, por
 * categoría y global, con su nivel de riesgo correspondiente.
 *
 * @param {EntradaEncuesta} entrada
 * @param {Catalogo} catalogo
 * @returns {{
 *   calificacionesReactivo: Array<{reactivo_id: string, calificacion: number}>,
 *   porDimension: Array<{dimension_id: string, dominio_id: string, puntaje: number}>,
 *   porDominio: Array<{dominio_id: string, categoria_id: string, puntaje: number, nivel_riesgo: string}>,
 *   porCategoria: Array<{categoria_id: string, puntaje: number, nivel_riesgo: string}>,
 *   global: {puntaje: number, nivel_riesgo: string},
 *   totalReactivosAplicados: number
 * }}
 */
export function calificarEncuesta(entrada, catalogo) {
  const { respuestas, atiendeClientes, esJefe } = entrada;

  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    throw new Error('Se requiere un arreglo de respuestas no vacío.');
  }

  const reactivosAplicables = obtenerReactivosAplicables(catalogo, { atiendeClientes, esJefe });
  const reactivoPorId = new Map(reactivosAplicables.map((r) => [r.id, r]));
  const respuestaPorReactivo = new Map(respuestas.map((r) => [r.reactivo_id, r.indice]));

  // Validación: todos los reactivos aplicables deben tener respuesta (no se permiten omisiones).
  const faltantes = reactivosAplicables.filter((r) => !respuestaPorReactivo.has(r.id));
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan respuestas para los reactivos: ${faltantes.map((r) => r.id).join(', ')}`
    );
  }

  // Validación: no debe haber respuestas para reactivos que no aplican a este colaborador
  // (ej. ítems 69-72 si esJefe === false). Esto evita contaminar la suma con datos que
  // la norma indica que no deben existir para ese perfil.
  const respuestasNoAplicables = respuestas.filter((r) => !reactivoPorId.has(r.reactivo_id));
  if (respuestasNoAplicables.length > 0) {
    throw new Error(
      `Se recibieron respuestas para reactivos que no aplican a este colaborador: ${respuestasNoAplicables
        .map((r) => r.reactivo_id)
        .join(', ')}`
    );
  }

  // 1) Calificación por reactivo (con inversión de escala aplicada).
  const calificacionesReactivo = reactivosAplicables.map((r) => ({
    reactivo_id: r.id,
    dimension_id: r.dimension_id,
    calificacion: calificarReactivo(respuestaPorReactivo.get(r.id), r.es_invertido),
  }));

  // Mapas de jerarquía normativa (dimensión → dominio → categoría), leídos del catálogo.
  const dominioDeLaDimension = new Map(catalogo.dimensiones.map((d) => [d.id, d.dominio_id]));
  const categoriaDelDominio = new Map(catalogo.dominios.map((d) => [d.id, d.categoria_id]));

  // 2) Calificación por dimensión.
  const sumaPorDimension = sumarPorLlave(
    calificacionesReactivo,
    (c) => c.dimension_id,
    (c) => c.calificacion
  );
  const porDimension = [...sumaPorDimension.entries()].map(([dimension_id, puntaje]) => ({
    dimension_id,
    dominio_id: dominioDeLaDimension.get(dimension_id),
    puntaje,
  }));

  // 3) Calificación por dominio (Cdom) — suma de todos los reactivos del dominio.
  const sumaPorDominio = sumarPorLlave(
    calificacionesReactivo,
    (c) => dominioDeLaDimension.get(c.dimension_id),
    (c) => c.calificacion
  );
  const porDominio = [...sumaPorDominio.entries()].map(([dominio_id, puntaje]) => {
    const rangos = catalogo.rangosDominio.filter((r) => r.dominio_id === dominio_id);
    return {
      dominio_id,
      categoria_id: categoriaDelDominio.get(dominio_id),
      puntaje,
      nivel_riesgo: determinarNivelRiesgo(puntaje, rangos),
    };
  });

  // 4) Calificación por categoría (Ccat) — suma de todos los reactivos de la categoría.
  const sumaPorCategoria = sumarPorLlave(
    calificacionesReactivo,
    (c) => categoriaDelDominio.get(dominioDeLaDimension.get(c.dimension_id)),
    (c) => c.calificacion
  );
  const porCategoria = [...sumaPorCategoria.entries()].map(([categoria_id, puntaje]) => {
    const rangos = catalogo.rangosCategoria.filter((r) => r.categoria_id === categoria_id);
    return {
      categoria_id,
      puntaje,
      nivel_riesgo: determinarNivelRiesgo(puntaje, rangos),
    };
  });

  // 5) Calificación final del cuestionario (Cfinal) — suma de todos los reactivos aplicados.
  const puntajeGlobal = calificacionesReactivo.reduce((acc, c) => acc + c.calificacion, 0);
  const nivelGlobal = determinarNivelRiesgo(puntajeGlobal, catalogo.rangoGlobal);

  return {
    calificacionesReactivo,
    porDimension,
    porDominio,
    porCategoria,
    global: { puntaje: puntajeGlobal, nivel_riesgo: nivelGlobal },
    totalReactivosAplicados: reactivosAplicables.length,
  };
}

export { calificarReactivo, determinarNivelRiesgo, obtenerReactivosAplicables };
