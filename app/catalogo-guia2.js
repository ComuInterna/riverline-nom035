/**
 * catalogo-guia2.js
 * ---------------------------------------------------------------------
 * Espejo en JavaScript del catálogo Guía de Referencia II cargado en
 * Supabase (06-catalogo-guia2.sql). Misma fuente: NOM-035-STPS-2018,
 * Diario Oficial de la Federación, 23/oct/2018.
 *
 * Tiene EXACTAMENTE la misma forma que catalogo-nom035-guia3.js, por
 * eso se puede usar directo con el motor genérico de scoring-engine.js
 * (Módulo 3) sin escribir un motor nuevo — Guía II y Guía III comparten
 * la misma lógica de cálculo (inversión de escala, suma por dominio/
 * categoría/global, comparación contra rangos); solo cambian los
 * reactivos, la agrupación y los rangos.
 * ---------------------------------------------------------------------
 */

export const categorias = [
  { id: 'G2_CAT_AMBIENTE', nombre: 'Ambiente de trabajo' },
  { id: 'G2_CAT_FACTORES', nombre: 'Factores propios de la actividad' },
  { id: 'G2_CAT_ORG_TIEMPO', nombre: 'Organización del tiempo de trabajo' },
  { id: 'G2_CAT_LIDERAZGO', nombre: 'Liderazgo y relaciones en el trabajo' },
];

export const dominios = [
  { id: 'G2_DOM_CONDICIONES', nombre: 'Condiciones en el ambiente de trabajo', categoria_id: 'G2_CAT_AMBIENTE' },
  { id: 'G2_DOM_CARGA', nombre: 'Carga de trabajo', categoria_id: 'G2_CAT_FACTORES' },
  { id: 'G2_DOM_CONTROL', nombre: 'Falta de control sobre el trabajo', categoria_id: 'G2_CAT_FACTORES' },
  { id: 'G2_DOM_JORNADA', nombre: 'Jornada de trabajo', categoria_id: 'G2_CAT_ORG_TIEMPO' },
  { id: 'G2_DOM_INTERFERENCIA', nombre: 'Interferencia en la relación trabajo-familia', categoria_id: 'G2_CAT_ORG_TIEMPO' },
  { id: 'G2_DOM_LIDERAZGO', nombre: 'Liderazgo', categoria_id: 'G2_CAT_LIDERAZGO' },
  { id: 'G2_DOM_RELACIONES', nombre: 'Relaciones en el trabajo', categoria_id: 'G2_CAT_LIDERAZGO' },
  { id: 'G2_DOM_VIOLENCIA', nombre: 'Violencia', categoria_id: 'G2_CAT_LIDERAZGO' },
];

export const dimensiones = [
  { id: 'G2_DIM_PELIGROSAS', nombre: 'Condiciones peligrosas e inseguras', dominio_id: 'G2_DOM_CONDICIONES' },
  { id: 'G2_DIM_INSALUBRES', nombre: 'Condiciones deficientes e insalubres', dominio_id: 'G2_DOM_CONDICIONES' },
  { id: 'G2_DIM_TRAB_PELIGROSOS', nombre: 'Trabajos peligrosos', dominio_id: 'G2_DOM_CONDICIONES' },
  { id: 'G2_DIM_CUANTITATIVAS', nombre: 'Cargas cuantitativas', dominio_id: 'G2_DOM_CARGA' },
  { id: 'G2_DIM_RITMOS', nombre: 'Ritmos de trabajo acelerado', dominio_id: 'G2_DOM_CARGA' },
  { id: 'G2_DIM_MENTAL', nombre: 'Carga mental', dominio_id: 'G2_DOM_CARGA' },
  { id: 'G2_DIM_EMOCIONALES', nombre: 'Cargas psicológicas emocionales', dominio_id: 'G2_DOM_CARGA' },
  { id: 'G2_DIM_RESPONSABILIDAD', nombre: 'Cargas de alta responsabilidad', dominio_id: 'G2_DOM_CARGA' },
  { id: 'G2_DIM_CONTRADICTORIAS', nombre: 'Cargas contradictorias o inconsistentes', dominio_id: 'G2_DOM_CARGA' },
  { id: 'G2_DIM_AUTONOMIA', nombre: 'Falta de control y autonomía sobre el trabajo', dominio_id: 'G2_DOM_CONTROL' },
  { id: 'G2_DIM_DESARROLLO', nombre: 'Limitada o nula posibilidad de desarrollo', dominio_id: 'G2_DOM_CONTROL' },
  { id: 'G2_DIM_CAPACITACION', nombre: 'Limitada o inexistente capacitación', dominio_id: 'G2_DOM_CONTROL' },
  { id: 'G2_DIM_JORNADAS_EXT', nombre: 'Jornadas de trabajo extensas', dominio_id: 'G2_DOM_JORNADA' },
  { id: 'G2_DIM_INFL_TRABAJO', nombre: 'Influencia del trabajo fuera del centro laboral', dominio_id: 'G2_DOM_INTERFERENCIA' },
  { id: 'G2_DIM_INFL_FAMILIA', nombre: 'Influencia de las responsabilidades familiares', dominio_id: 'G2_DOM_INTERFERENCIA' },
  { id: 'G2_DIM_CLARIDAD', nombre: 'Escasa claridad de funciones', dominio_id: 'G2_DOM_LIDERAZGO' },
  { id: 'G2_DIM_CARACT_LIDERAZGO', nombre: 'Características del liderazgo', dominio_id: 'G2_DOM_LIDERAZGO' },
  { id: 'G2_DIM_RELACIONES_SOC', nombre: 'Relaciones sociales en el trabajo', dominio_id: 'G2_DOM_RELACIONES' },
  { id: 'G2_DIM_REL_SUPERVISADOS', nombre: 'Deficiente relación con los colaboradores que supervisa', dominio_id: 'G2_DOM_RELACIONES' },
  { id: 'G2_DIM_VIOLENCIA_LAB', nombre: 'Violencia laboral', dominio_id: 'G2_DOM_VIOLENCIA' },
];

export const reactivos = [
  { id: 'G2_R1', numero: 1, texto: 'Mi trabajo me exige hacer mucho esfuerzo físico', dimension_id: 'G2_DIM_INSALUBRES', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R2', numero: 2, texto: 'Me preocupa sufrir un accidente en mi trabajo', dimension_id: 'G2_DIM_PELIGROSAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R3', numero: 3, texto: 'Considero que las actividades que realizo son peligrosas', dimension_id: 'G2_DIM_TRAB_PELIGROSOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R4', numero: 4, texto: 'Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno', dimension_id: 'G2_DIM_CUANTITATIVAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R5', numero: 5, texto: 'Por la cantidad de trabajo que tengo debo trabajar sin parar', dimension_id: 'G2_DIM_RITMOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R6', numero: 6, texto: 'Considero que es necesario mantener un ritmo de trabajo acelerado', dimension_id: 'G2_DIM_RITMOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R7', numero: 7, texto: 'Mi trabajo exige que esté muy concentrado', dimension_id: 'G2_DIM_MENTAL', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R8', numero: 8, texto: 'Mi trabajo requiere que memorice mucha información', dimension_id: 'G2_DIM_MENTAL', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R9', numero: 9, texto: 'Mi trabajo exige que atienda varios asuntos al mismo tiempo', dimension_id: 'G2_DIM_CUANTITATIVAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R10', numero: 10, texto: 'En mi trabajo soy responsable de cosas de mucho valor', dimension_id: 'G2_DIM_RESPONSABILIDAD', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R11', numero: 11, texto: 'Respondo ante mi jefe por los resultados de toda mi área de trabajo', dimension_id: 'G2_DIM_RESPONSABILIDAD', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R12', numero: 12, texto: 'En mi trabajo me dan órdenes contradictorias', dimension_id: 'G2_DIM_CONTRADICTORIAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R13', numero: 13, texto: 'Considero que en mi trabajo me piden hacer cosas innecesarias', dimension_id: 'G2_DIM_CONTRADICTORIAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R14', numero: 14, texto: 'Trabajo horas extras más de tres veces a la semana', dimension_id: 'G2_DIM_JORNADAS_EXT', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R15', numero: 15, texto: 'Mi trabajo me exige laborar en días de descanso, festivos o fines de semana', dimension_id: 'G2_DIM_JORNADAS_EXT', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R16', numero: 16, texto: 'Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares o personales', dimension_id: 'G2_DIM_INFL_TRABAJO', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R17', numero: 17, texto: 'Pienso en las actividades familiares o personales cuando estoy en mi trabajo', dimension_id: 'G2_DIM_INFL_FAMILIA', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R18', numero: 18, texto: 'Mi trabajo permite que desarrolle nuevas habilidades', dimension_id: 'G2_DIM_DESARROLLO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R19', numero: 19, texto: 'En mi trabajo puedo aspirar a un mejor puesto', dimension_id: 'G2_DIM_DESARROLLO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R20', numero: 20, texto: 'Durante mi jornada de trabajo puedo tomar pausas cuando las necesito', dimension_id: 'G2_DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R21', numero: 21, texto: 'Puedo decidir la velocidad a la que realizo mis actividades en mi trabajo', dimension_id: 'G2_DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R22', numero: 22, texto: 'Puedo cambiar el orden de las actividades que realizo en mi trabajo', dimension_id: 'G2_DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R23', numero: 23, texto: 'Me informan con claridad cuáles son mis funciones', dimension_id: 'G2_DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R24', numero: 24, texto: 'Me explican claramente los resultados que debo obtener en mi trabajo', dimension_id: 'G2_DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R25', numero: 25, texto: 'Me informan con quién puedo resolver problemas o asuntos de trabajo', dimension_id: 'G2_DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R26', numero: 26, texto: 'Me permiten asistir a capacitaciones relacionadas con mi trabajo', dimension_id: 'G2_DIM_CAPACITACION', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R27', numero: 27, texto: 'Recibo capacitación útil para hacer mi trabajo', dimension_id: 'G2_DIM_CAPACITACION', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R28', numero: 28, texto: 'Mi jefe tiene en cuenta mis puntos de vista y opiniones', dimension_id: 'G2_DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R29', numero: 29, texto: 'Mi jefe ayuda a solucionar los problemas que se presentan en el trabajo', dimension_id: 'G2_DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R30', numero: 30, texto: 'Puedo confiar en mis compañeros de trabajo', dimension_id: 'G2_DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R31', numero: 31, texto: 'Cuando tenemos que realizar trabajo de equipo los compañeros colaboran', dimension_id: 'G2_DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R32', numero: 32, texto: 'Mis compañeros de trabajo me ayudan cuando tengo dificultades', dimension_id: 'G2_DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R33', numero: 33, texto: 'En mi trabajo puedo expresarme libremente sin interrupciones', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R34', numero: 34, texto: 'Recibo críticas constantes a mi persona y/o trabajo', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R35', numero: 35, texto: 'Recibo burlas, calumnias, difamaciones, humillaciones o ridiculizaciones', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R36', numero: 36, texto: 'Se ignora mi presencia o se me excluye de las reuniones de trabajo y en la toma de decisiones', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R37', numero: 37, texto: 'Se manipulan las situaciones de trabajo para hacerme parecer un mal trabajador', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R38', numero: 38, texto: 'Se ignoran mis éxitos laborales y se atribuyen a otros trabajadores', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R39', numero: 39, texto: 'Me bloquean o impiden las oportunidades que tengo para obtener ascenso o mejora en mi trabajo', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R40', numero: 40, texto: 'He presenciado actos de violencia en mi centro de trabajo', dimension_id: 'G2_DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'G2_R41', numero: 41, texto: 'Atiendo clientes o usuarios muy enojados', dimension_id: 'G2_DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },
  { id: 'G2_R42', numero: 42, texto: 'Mi trabajo me exige atender personas muy necesitadas de ayuda o enfermas', dimension_id: 'G2_DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },
  { id: 'G2_R43', numero: 43, texto: 'Para hacer mi trabajo debo demostrar sentimientos distintos a los míos', dimension_id: 'G2_DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },
  { id: 'G2_R44', numero: 44, texto: 'Comunican tarde los asuntos de trabajo', dimension_id: 'G2_DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
  { id: 'G2_R45', numero: 45, texto: 'Dificultan el logro de los resultados del trabajo', dimension_id: 'G2_DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
  { id: 'G2_R46', numero: 46, texto: 'Ignoran las sugerencias para mejorar su trabajo', dimension_id: 'G2_DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
];

export const rangosCategoria = [
  { categoria_id: 'G2_CAT_AMBIENTE', nivel: 'nulo', limite_inferior: 0, limite_superior: 3 },
  { categoria_id: 'G2_CAT_AMBIENTE', nivel: 'bajo', limite_inferior: 3, limite_superior: 5 },
  { categoria_id: 'G2_CAT_AMBIENTE', nivel: 'medio', limite_inferior: 5, limite_superior: 7 },
  { categoria_id: 'G2_CAT_AMBIENTE', nivel: 'alto', limite_inferior: 7, limite_superior: 9 },
  { categoria_id: 'G2_CAT_AMBIENTE', nivel: 'muy_alto', limite_inferior: 9, limite_superior: null },

  { categoria_id: 'G2_CAT_FACTORES', nivel: 'nulo', limite_inferior: 0, limite_superior: 10 },
  { categoria_id: 'G2_CAT_FACTORES', nivel: 'bajo', limite_inferior: 10, limite_superior: 20 },
  { categoria_id: 'G2_CAT_FACTORES', nivel: 'medio', limite_inferior: 20, limite_superior: 30 },
  { categoria_id: 'G2_CAT_FACTORES', nivel: 'alto', limite_inferior: 30, limite_superior: 40 },
  { categoria_id: 'G2_CAT_FACTORES', nivel: 'muy_alto', limite_inferior: 40, limite_superior: null },

  { categoria_id: 'G2_CAT_ORG_TIEMPO', nivel: 'nulo', limite_inferior: 0, limite_superior: 4 },
  { categoria_id: 'G2_CAT_ORG_TIEMPO', nivel: 'bajo', limite_inferior: 4, limite_superior: 6 },
  { categoria_id: 'G2_CAT_ORG_TIEMPO', nivel: 'medio', limite_inferior: 6, limite_superior: 9 },
  { categoria_id: 'G2_CAT_ORG_TIEMPO', nivel: 'alto', limite_inferior: 9, limite_superior: 12 },
  { categoria_id: 'G2_CAT_ORG_TIEMPO', nivel: 'muy_alto', limite_inferior: 12, limite_superior: null },

  { categoria_id: 'G2_CAT_LIDERAZGO', nivel: 'nulo', limite_inferior: 0, limite_superior: 10 },
  { categoria_id: 'G2_CAT_LIDERAZGO', nivel: 'bajo', limite_inferior: 10, limite_superior: 18 },
  { categoria_id: 'G2_CAT_LIDERAZGO', nivel: 'medio', limite_inferior: 18, limite_superior: 28 },
  { categoria_id: 'G2_CAT_LIDERAZGO', nivel: 'alto', limite_inferior: 28, limite_superior: 38 },
  { categoria_id: 'G2_CAT_LIDERAZGO', nivel: 'muy_alto', limite_inferior: 38, limite_superior: null },
];

export const rangosDominio = [
  { dominio_id: 'G2_DOM_CONDICIONES', nivel: 'nulo', limite_inferior: 0, limite_superior: 3 },
  { dominio_id: 'G2_DOM_CONDICIONES', nivel: 'bajo', limite_inferior: 3, limite_superior: 5 },
  { dominio_id: 'G2_DOM_CONDICIONES', nivel: 'medio', limite_inferior: 5, limite_superior: 7 },
  { dominio_id: 'G2_DOM_CONDICIONES', nivel: 'alto', limite_inferior: 7, limite_superior: 9 },
  { dominio_id: 'G2_DOM_CONDICIONES', nivel: 'muy_alto', limite_inferior: 9, limite_superior: null },

  { dominio_id: 'G2_DOM_CARGA', nivel: 'nulo', limite_inferior: 0, limite_superior: 12 },
  { dominio_id: 'G2_DOM_CARGA', nivel: 'bajo', limite_inferior: 12, limite_superior: 16 },
  { dominio_id: 'G2_DOM_CARGA', nivel: 'medio', limite_inferior: 16, limite_superior: 20 },
  { dominio_id: 'G2_DOM_CARGA', nivel: 'alto', limite_inferior: 20, limite_superior: 24 },
  { dominio_id: 'G2_DOM_CARGA', nivel: 'muy_alto', limite_inferior: 24, limite_superior: null },

  { dominio_id: 'G2_DOM_CONTROL', nivel: 'nulo', limite_inferior: 0, limite_superior: 5 },
  { dominio_id: 'G2_DOM_CONTROL', nivel: 'bajo', limite_inferior: 5, limite_superior: 8 },
  { dominio_id: 'G2_DOM_CONTROL', nivel: 'medio', limite_inferior: 8, limite_superior: 11 },
  { dominio_id: 'G2_DOM_CONTROL', nivel: 'alto', limite_inferior: 11, limite_superior: 14 },
  { dominio_id: 'G2_DOM_CONTROL', nivel: 'muy_alto', limite_inferior: 14, limite_superior: null },

  { dominio_id: 'G2_DOM_JORNADA', nivel: 'nulo', limite_inferior: 0, limite_superior: 1 },
  { dominio_id: 'G2_DOM_JORNADA', nivel: 'bajo', limite_inferior: 1, limite_superior: 2 },
  { dominio_id: 'G2_DOM_JORNADA', nivel: 'medio', limite_inferior: 2, limite_superior: 4 },
  { dominio_id: 'G2_DOM_JORNADA', nivel: 'alto', limite_inferior: 4, limite_superior: 6 },
  { dominio_id: 'G2_DOM_JORNADA', nivel: 'muy_alto', limite_inferior: 6, limite_superior: null },

  { dominio_id: 'G2_DOM_INTERFERENCIA', nivel: 'nulo', limite_inferior: 0, limite_superior: 1 },
  { dominio_id: 'G2_DOM_INTERFERENCIA', nivel: 'bajo', limite_inferior: 1, limite_superior: 2 },
  { dominio_id: 'G2_DOM_INTERFERENCIA', nivel: 'medio', limite_inferior: 2, limite_superior: 4 },
  { dominio_id: 'G2_DOM_INTERFERENCIA', nivel: 'alto', limite_inferior: 4, limite_superior: 6 },
  { dominio_id: 'G2_DOM_INTERFERENCIA', nivel: 'muy_alto', limite_inferior: 6, limite_superior: null },

  { dominio_id: 'G2_DOM_LIDERAZGO', nivel: 'nulo', limite_inferior: 0, limite_superior: 3 },
  { dominio_id: 'G2_DOM_LIDERAZGO', nivel: 'bajo', limite_inferior: 3, limite_superior: 5 },
  { dominio_id: 'G2_DOM_LIDERAZGO', nivel: 'medio', limite_inferior: 5, limite_superior: 8 },
  { dominio_id: 'G2_DOM_LIDERAZGO', nivel: 'alto', limite_inferior: 8, limite_superior: 11 },
  { dominio_id: 'G2_DOM_LIDERAZGO', nivel: 'muy_alto', limite_inferior: 11, limite_superior: null },

  { dominio_id: 'G2_DOM_RELACIONES', nivel: 'nulo', limite_inferior: 0, limite_superior: 5 },
  { dominio_id: 'G2_DOM_RELACIONES', nivel: 'bajo', limite_inferior: 5, limite_superior: 8 },
  { dominio_id: 'G2_DOM_RELACIONES', nivel: 'medio', limite_inferior: 8, limite_superior: 11 },
  { dominio_id: 'G2_DOM_RELACIONES', nivel: 'alto', limite_inferior: 11, limite_superior: 14 },
  { dominio_id: 'G2_DOM_RELACIONES', nivel: 'muy_alto', limite_inferior: 14, limite_superior: null },

  { dominio_id: 'G2_DOM_VIOLENCIA', nivel: 'nulo', limite_inferior: 0, limite_superior: 7 },
  { dominio_id: 'G2_DOM_VIOLENCIA', nivel: 'bajo', limite_inferior: 7, limite_superior: 10 },
  { dominio_id: 'G2_DOM_VIOLENCIA', nivel: 'medio', limite_inferior: 10, limite_superior: 13 },
  { dominio_id: 'G2_DOM_VIOLENCIA', nivel: 'alto', limite_inferior: 13, limite_superior: 16 },
  { dominio_id: 'G2_DOM_VIOLENCIA', nivel: 'muy_alto', limite_inferior: 16, limite_superior: null },
];

export const rangoGlobal = [
  { nivel: 'nulo', limite_inferior: 0, limite_superior: 20 },
  { nivel: 'bajo', limite_inferior: 20, limite_superior: 45 },
  { nivel: 'medio', limite_inferior: 45, limite_superior: 70 },
  { nivel: 'alto', limite_inferior: 70, limite_superior: 90 },
  { nivel: 'muy_alto', limite_inferior: 90, limite_superior: null },
];

// Texto identico al de Guia III (misma Tabla de acciones en la norma).
export const accionesPorNivel = {
  muy_alto: 'Se requiere realizar el análisis de cada categoría y dominio para establecer las acciones de intervención apropiadas, mediante un Programa de intervención que deberá incluir evaluaciones específicas, y contemplar campañas de sensibilización, revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión.',
  alto: 'Se requiere realizar un análisis de cada categoría y dominio, de manera que se puedan determinar las acciones de intervención apropiadas a través de un Programa de intervención, que podrá incluir una evaluación específica y deberá incluir una campaña de sensibilización, revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión.',
  medio: 'Se requiere revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión, mediante un Programa de intervención.',
  bajo: 'Es necesario una mayor difusión de la política de prevención de riesgos psicosociales y programas para: la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral.',
  nulo: 'El riesgo resulta despreciable por lo que no se requiere medidas adicionales.',
};

export const catalogo = {
  reactivos,
  dimensiones,
  dominios,
  categorias,
  rangosCategoria,
  rangosDominio,
  rangoGlobal,
  accionesPorNivel,
};

export default catalogo;
