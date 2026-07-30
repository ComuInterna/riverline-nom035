/**
 * catalogo-nom035-guia3.js
 * ---------------------------------------------------------------------
 * Espejo en JavaScript del catálogo normativo cargado en Supabase
 * (catalogo-nom035-guia3.sql). Misma fuente: Guía de Referencia III,
 * NOM-035-STPS-2018, Diario Oficial de la Federación, 23/oct/2018.
 *
 * Se usa para:
 *   - Pruebas unitarias del motor de calificación (sin necesidad de DB).
 *   - Cachear el catálogo en el cliente del Colaborador durante la
 *     encuesta (se sigue escribiendo el resultado vía Edge Function).
 *
 * IMPORTANTE: esta copia debe permanecer idéntica a la tabla catalogo.*
 * en Supabase. Si la STPS publicara una actualización de la Guía III,
 * ambas fuentes deben actualizarse juntas.
 * ---------------------------------------------------------------------
 */

export const categorias = [
  { id: 'CAT_AMBIENTE', nombre: 'Ambiente de trabajo' },
  { id: 'CAT_FACTORES', nombre: 'Factores propios de la actividad' },
  { id: 'CAT_ORG_TIEMPO', nombre: 'Organización del tiempo de trabajo' },
  { id: 'CAT_LIDERAZGO', nombre: 'Liderazgo y relaciones en el trabajo' },
  { id: 'CAT_ENTORNO', nombre: 'Entorno organizacional' },
];

export const dominios = [
  { id: 'DOM_CONDICIONES', nombre: 'Condiciones en el ambiente de trabajo', categoria_id: 'CAT_AMBIENTE' },
  { id: 'DOM_CARGA', nombre: 'Carga de trabajo', categoria_id: 'CAT_FACTORES' },
  { id: 'DOM_CONTROL', nombre: 'Falta de control sobre el trabajo', categoria_id: 'CAT_FACTORES' },
  { id: 'DOM_JORNADA', nombre: 'Jornada de trabajo', categoria_id: 'CAT_ORG_TIEMPO' },
  { id: 'DOM_INTERFERENCIA', nombre: 'Interferencia en la relación trabajo-familia', categoria_id: 'CAT_ORG_TIEMPO' },
  { id: 'DOM_LIDERAZGO', nombre: 'Liderazgo', categoria_id: 'CAT_LIDERAZGO' },
  { id: 'DOM_RELACIONES', nombre: 'Relaciones en el trabajo', categoria_id: 'CAT_LIDERAZGO' },
  { id: 'DOM_VIOLENCIA', nombre: 'Violencia', categoria_id: 'CAT_LIDERAZGO' },
  { id: 'DOM_RECONOCIMIENTO', nombre: 'Reconocimiento del desempeño', categoria_id: 'CAT_ENTORNO' },
  { id: 'DOM_PERTENENCIA', nombre: 'Insuficiente sentido de pertenencia e inestabilidad', categoria_id: 'CAT_ENTORNO' },
];

export const dimensiones = [
  { id: 'DIM_PELIGROSAS', nombre: 'Condiciones peligrosas e inseguras', dominio_id: 'DOM_CONDICIONES' },
  { id: 'DIM_INSALUBRES', nombre: 'Condiciones deficientes e insalubres', dominio_id: 'DOM_CONDICIONES' },
  { id: 'DIM_TRAB_PELIGROSOS', nombre: 'Trabajos peligrosos', dominio_id: 'DOM_CONDICIONES' },

  { id: 'DIM_CUANTITATIVAS', nombre: 'Cargas cuantitativas', dominio_id: 'DOM_CARGA' },
  { id: 'DIM_RITMOS', nombre: 'Ritmos de trabajo acelerado', dominio_id: 'DOM_CARGA' },
  { id: 'DIM_MENTAL', nombre: 'Carga mental', dominio_id: 'DOM_CARGA' },
  { id: 'DIM_EMOCIONALES', nombre: 'Cargas psicológicas emocionales', dominio_id: 'DOM_CARGA' },
  { id: 'DIM_RESPONSABILIDAD', nombre: 'Cargas de alta responsabilidad', dominio_id: 'DOM_CARGA' },
  { id: 'DIM_CONTRADICTORIAS', nombre: 'Cargas contradictorias o inconsistentes', dominio_id: 'DOM_CARGA' },

  { id: 'DIM_AUTONOMIA', nombre: 'Falta de control y autonomía sobre el trabajo', dominio_id: 'DOM_CONTROL' },
  { id: 'DIM_DESARROLLO', nombre: 'Limitada o nula posibilidad de desarrollo', dominio_id: 'DOM_CONTROL' },
  { id: 'DIM_CAMBIO', nombre: 'Insuficiente participación y manejo del cambio', dominio_id: 'DOM_CONTROL' },
  { id: 'DIM_CAPACITACION', nombre: 'Limitada o inexistente capacitación', dominio_id: 'DOM_CONTROL' },

  { id: 'DIM_JORNADAS_EXT', nombre: 'Jornadas de trabajo extensas', dominio_id: 'DOM_JORNADA' },

  { id: 'DIM_INFL_TRABAJO', nombre: 'Influencia del trabajo fuera del centro laboral', dominio_id: 'DOM_INTERFERENCIA' },
  { id: 'DIM_INFL_FAMILIA', nombre: 'Influencia de las responsabilidades familiares', dominio_id: 'DOM_INTERFERENCIA' },

  { id: 'DIM_CLARIDAD', nombre: 'Escasa claridad de funciones', dominio_id: 'DOM_LIDERAZGO' },
  { id: 'DIM_CARACT_LIDERAZGO', nombre: 'Características del liderazgo', dominio_id: 'DOM_LIDERAZGO' },

  { id: 'DIM_RELACIONES_SOC', nombre: 'Relaciones sociales en el trabajo', dominio_id: 'DOM_RELACIONES' },
  { id: 'DIM_REL_SUPERVISADOS', nombre: 'Deficiente relación con los colaboradores que supervisa', dominio_id: 'DOM_RELACIONES' },

  { id: 'DIM_VIOLENCIA_LAB', nombre: 'Violencia laboral', dominio_id: 'DOM_VIOLENCIA' },

  { id: 'DIM_RETROALIMENTACION', nombre: 'Escasa o nula retroalimentación del desempeño', dominio_id: 'DOM_RECONOCIMIENTO' },
  { id: 'DIM_RECOMPENSA', nombre: 'Escaso o nulo reconocimiento y compensación', dominio_id: 'DOM_RECONOCIMIENTO' },

  { id: 'DIM_PERTENENCIA_LIM', nombre: 'Limitado sentido de pertenencia', dominio_id: 'DOM_PERTENENCIA' },
  { id: 'DIM_INESTABILIDAD', nombre: 'Inestabilidad laboral', dominio_id: 'DOM_PERTENENCIA' },
];

// texto: literal de la Guía III. es_invertido: ver Tabla 5.
export const reactivos = [
  { id: 'R1', numero: 1, texto: 'El espacio donde trabajo me permite realizar mis actividades de manera segura e higiénica', dimension_id: 'DIM_PELIGROSAS', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R2', numero: 2, texto: 'Mi trabajo me exige hacer mucho esfuerzo físico', dimension_id: 'DIM_INSALUBRES', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R3', numero: 3, texto: 'Me preocupa sufrir un accidente en mi trabajo', dimension_id: 'DIM_PELIGROSAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R4', numero: 4, texto: 'Considero que en mi trabajo se aplican las normas de seguridad y salud en el trabajo', dimension_id: 'DIM_INSALUBRES', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R5', numero: 5, texto: 'Considero que las actividades que realizo son peligrosas', dimension_id: 'DIM_TRAB_PELIGROSOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R6', numero: 6, texto: 'Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno', dimension_id: 'DIM_CUANTITATIVAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R7', numero: 7, texto: 'Por la cantidad de trabajo que tengo debo trabajar sin parar', dimension_id: 'DIM_RITMOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R8', numero: 8, texto: 'Considero que es necesario mantener un ritmo de trabajo acelerado', dimension_id: 'DIM_RITMOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R9', numero: 9, texto: 'Mi trabajo exige que esté muy concentrado', dimension_id: 'DIM_MENTAL', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R10', numero: 10, texto: 'Mi trabajo requiere que memorice mucha información', dimension_id: 'DIM_MENTAL', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R11', numero: 11, texto: 'En mi trabajo tengo que tomar decisiones difíciles muy rápido', dimension_id: 'DIM_MENTAL', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R12', numero: 12, texto: 'Mi trabajo exige que atienda varios asuntos al mismo tiempo', dimension_id: 'DIM_CUANTITATIVAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R13', numero: 13, texto: 'En mi trabajo soy responsable de cosas de mucho valor', dimension_id: 'DIM_RESPONSABILIDAD', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R14', numero: 14, texto: 'Respondo ante mi jefe por los resultados de toda mi área de trabajo', dimension_id: 'DIM_RESPONSABILIDAD', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R15', numero: 15, texto: 'En el trabajo me dan órdenes contradictorias', dimension_id: 'DIM_CONTRADICTORIAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R16', numero: 16, texto: 'Considero que en mi trabajo me piden hacer cosas innecesarias', dimension_id: 'DIM_CONTRADICTORIAS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R17', numero: 17, texto: 'Trabajo horas extras más de tres veces a la semana', dimension_id: 'DIM_JORNADAS_EXT', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R18', numero: 18, texto: 'Mi trabajo me exige laborar en días de descanso, festivos o fines de semana', dimension_id: 'DIM_JORNADAS_EXT', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R19', numero: 19, texto: 'Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares o personales', dimension_id: 'DIM_INFL_TRABAJO', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R20', numero: 20, texto: 'Debo atender asuntos de trabajo cuando estoy en casa', dimension_id: 'DIM_INFL_TRABAJO', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R21', numero: 21, texto: 'Pienso en las actividades familiares o personales cuando estoy en mi trabajo', dimension_id: 'DIM_INFL_FAMILIA', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R22', numero: 22, texto: 'Pienso que mis responsabilidades familiares afectan mi trabajo', dimension_id: 'DIM_INFL_FAMILIA', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R23', numero: 23, texto: 'Mi trabajo permite que desarrolle nuevas habilidades', dimension_id: 'DIM_DESARROLLO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R24', numero: 24, texto: 'En mi trabajo puedo aspirar a un mejor puesto', dimension_id: 'DIM_DESARROLLO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R25', numero: 25, texto: 'Durante mi jornada de trabajo puedo tomar pausas cuando las necesito', dimension_id: 'DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R26', numero: 26, texto: 'Puedo decidir cuánto trabajo realizo durante la jornada laboral', dimension_id: 'DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R27', numero: 27, texto: 'Puedo decidir la velocidad a la que realizo mis actividades en mi trabajo', dimension_id: 'DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R28', numero: 28, texto: 'Puedo cambiar el orden de las actividades que realizo en mi trabajo', dimension_id: 'DIM_AUTONOMIA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R29', numero: 29, texto: 'Los cambios que se presentan en mi trabajo dificultan mi labor', dimension_id: 'DIM_CAMBIO', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R30', numero: 30, texto: 'Cuando se presentan cambios en mi trabajo se tienen en cuenta mis ideas o aportaciones', dimension_id: 'DIM_CAMBIO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R31', numero: 31, texto: 'Me informan con claridad cuáles son mis funciones', dimension_id: 'DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R32', numero: 32, texto: 'Me explican claramente los resultados que debo obtener en mi trabajo', dimension_id: 'DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R33', numero: 33, texto: 'Me explican claramente los objetivos de mi trabajo', dimension_id: 'DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R34', numero: 34, texto: 'Me informan con quién puedo resolver problemas o asuntos de trabajo', dimension_id: 'DIM_CLARIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R35', numero: 35, texto: 'Me permiten asistir a capacitaciones relacionadas con mi trabajo', dimension_id: 'DIM_CAPACITACION', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R36', numero: 36, texto: 'Recibo capacitación útil para hacer mi trabajo', dimension_id: 'DIM_CAPACITACION', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R37', numero: 37, texto: 'Mi jefe ayuda a organizar mejor el trabajo', dimension_id: 'DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R38', numero: 38, texto: 'Mi jefe tiene en cuenta mis puntos de vista y opiniones', dimension_id: 'DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R39', numero: 39, texto: 'Mi jefe me comunica a tiempo la información relacionada con el trabajo', dimension_id: 'DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R40', numero: 40, texto: 'La orientación que me da mi jefe me ayuda a realizar mejor mi trabajo', dimension_id: 'DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R41', numero: 41, texto: 'Mi jefe ayuda a solucionar los problemas que se presentan en el trabajo', dimension_id: 'DIM_CARACT_LIDERAZGO', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R42', numero: 42, texto: 'Puedo confiar en mis compañeros de trabajo', dimension_id: 'DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R43', numero: 43, texto: 'Entre compañeros solucionamos los problemas de trabajo de forma respetuosa', dimension_id: 'DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R44', numero: 44, texto: 'En mi trabajo me hacen sentir parte del grupo', dimension_id: 'DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R45', numero: 45, texto: 'Cuando tenemos que realizar trabajo de equipo los compañeros colaboran', dimension_id: 'DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R46', numero: 46, texto: 'Mis compañeros de trabajo me ayudan cuando tengo dificultades', dimension_id: 'DIM_RELACIONES_SOC', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R47', numero: 47, texto: 'Me informan sobre lo que hago bien en mi trabajo', dimension_id: 'DIM_RETROALIMENTACION', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R48', numero: 48, texto: 'La forma como evalúan mi trabajo en mi centro de trabajo me ayuda a mejorar mi desempeño', dimension_id: 'DIM_RETROALIMENTACION', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R49', numero: 49, texto: 'En mi centro de trabajo me pagan a tiempo mi salario', dimension_id: 'DIM_RECOMPENSA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R50', numero: 50, texto: 'El pago que recibo es el que merezco por el trabajo que realizo', dimension_id: 'DIM_RECOMPENSA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R51', numero: 51, texto: 'Si obtengo los resultados esperados en mi trabajo me recompensan o reconocen', dimension_id: 'DIM_RECOMPENSA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R52', numero: 52, texto: 'Las personas que hacen bien el trabajo pueden crecer laboralmente', dimension_id: 'DIM_RECOMPENSA', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R53', numero: 53, texto: 'Considero que mi trabajo es estable', dimension_id: 'DIM_INESTABILIDAD', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R54', numero: 54, texto: 'En mi trabajo existe continua rotación de personal', dimension_id: 'DIM_INESTABILIDAD', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R55', numero: 55, texto: 'Siento orgullo de laborar en este centro de trabajo', dimension_id: 'DIM_PERTENENCIA_LIM', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R56', numero: 56, texto: 'Me siento comprometido con mi trabajo', dimension_id: 'DIM_PERTENENCIA_LIM', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R57', numero: 57, texto: 'En mi trabajo puedo expresarme libremente sin interrupciones', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: true, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R58', numero: 58, texto: 'Recibo críticas constantes a mi persona y/o trabajo', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R59', numero: 59, texto: 'Recibo burlas, calumnias, difamaciones, humillaciones o ridiculizaciones', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R60', numero: 60, texto: 'Se ignora mi presencia o se me excluye de las reuniones de trabajo y en la toma de decisiones', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R61', numero: 61, texto: 'Se manipulan las situaciones de trabajo para hacerme parecer un mal trabajador', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R62', numero: 62, texto: 'Se ignoran mis éxitos laborales y se atribuyen a otros trabajadores', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R63', numero: 63, texto: 'Me bloquean o impiden las oportunidades que tengo para obtener ascenso o mejora en mi trabajo', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },
  { id: 'R64', numero: 64, texto: 'He presenciado actos de violencia en mi centro de trabajo', dimension_id: 'DIM_VIOLENCIA_LAB', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: false },

  { id: 'R65', numero: 65, texto: 'Atiendo clientes o usuarios muy enojados', dimension_id: 'DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },
  { id: 'R66', numero: 66, texto: 'Mi trabajo me exige atender personas muy necesitadas de ayuda o enfermas', dimension_id: 'DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },
  { id: 'R67', numero: 67, texto: 'Para hacer mi trabajo debo demostrar sentimientos distintos a los míos', dimension_id: 'DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },
  { id: 'R68', numero: 68, texto: 'Mi trabajo me exige atender situaciones de violencia', dimension_id: 'DIM_EMOCIONALES', es_invertido: false, requiere_atencion_clientes: true, requiere_ser_jefe: false },

  { id: 'R69', numero: 69, texto: 'Comunican tarde los asuntos de trabajo', dimension_id: 'DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
  { id: 'R70', numero: 70, texto: 'Dificultan el logro de los resultados del trabajo', dimension_id: 'DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
  { id: 'R71', numero: 71, texto: 'Cooperan poco cuando se necesita', dimension_id: 'DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
  { id: 'R72', numero: 72, texto: 'Ignoran las sugerencias para mejorar su trabajo', dimension_id: 'DIM_REL_SUPERVISADOS', es_invertido: false, requiere_atencion_clientes: false, requiere_ser_jefe: true },
];

export const rangosCategoria = [
  { categoria_id: 'CAT_AMBIENTE', nivel: 'nulo', limite_inferior: 0, limite_superior: 5 },
  { categoria_id: 'CAT_AMBIENTE', nivel: 'bajo', limite_inferior: 5, limite_superior: 9 },
  { categoria_id: 'CAT_AMBIENTE', nivel: 'medio', limite_inferior: 9, limite_superior: 11 },
  { categoria_id: 'CAT_AMBIENTE', nivel: 'alto', limite_inferior: 11, limite_superior: 14 },
  { categoria_id: 'CAT_AMBIENTE', nivel: 'muy_alto', limite_inferior: 14, limite_superior: null },

  { categoria_id: 'CAT_FACTORES', nivel: 'nulo', limite_inferior: 0, limite_superior: 15 },
  { categoria_id: 'CAT_FACTORES', nivel: 'bajo', limite_inferior: 15, limite_superior: 30 },
  { categoria_id: 'CAT_FACTORES', nivel: 'medio', limite_inferior: 30, limite_superior: 45 },
  { categoria_id: 'CAT_FACTORES', nivel: 'alto', limite_inferior: 45, limite_superior: 60 },
  { categoria_id: 'CAT_FACTORES', nivel: 'muy_alto', limite_inferior: 60, limite_superior: null },

  { categoria_id: 'CAT_ORG_TIEMPO', nivel: 'nulo', limite_inferior: 0, limite_superior: 5 },
  { categoria_id: 'CAT_ORG_TIEMPO', nivel: 'bajo', limite_inferior: 5, limite_superior: 7 },
  { categoria_id: 'CAT_ORG_TIEMPO', nivel: 'medio', limite_inferior: 7, limite_superior: 10 },
  { categoria_id: 'CAT_ORG_TIEMPO', nivel: 'alto', limite_inferior: 10, limite_superior: 13 },
  { categoria_id: 'CAT_ORG_TIEMPO', nivel: 'muy_alto', limite_inferior: 13, limite_superior: null },

  { categoria_id: 'CAT_LIDERAZGO', nivel: 'nulo', limite_inferior: 0, limite_superior: 14 },
  { categoria_id: 'CAT_LIDERAZGO', nivel: 'bajo', limite_inferior: 14, limite_superior: 29 },
  { categoria_id: 'CAT_LIDERAZGO', nivel: 'medio', limite_inferior: 29, limite_superior: 42 },
  { categoria_id: 'CAT_LIDERAZGO', nivel: 'alto', limite_inferior: 42, limite_superior: 58 },
  { categoria_id: 'CAT_LIDERAZGO', nivel: 'muy_alto', limite_inferior: 58, limite_superior: null },

  { categoria_id: 'CAT_ENTORNO', nivel: 'nulo', limite_inferior: 0, limite_superior: 10 },
  { categoria_id: 'CAT_ENTORNO', nivel: 'bajo', limite_inferior: 10, limite_superior: 14 },
  { categoria_id: 'CAT_ENTORNO', nivel: 'medio', limite_inferior: 14, limite_superior: 18 },
  { categoria_id: 'CAT_ENTORNO', nivel: 'alto', limite_inferior: 18, limite_superior: 23 },
  { categoria_id: 'CAT_ENTORNO', nivel: 'muy_alto', limite_inferior: 23, limite_superior: null },
];

export const rangosDominio = [
  { dominio_id: 'DOM_CONDICIONES', nivel: 'nulo', limite_inferior: 0, limite_superior: 5 },
  { dominio_id: 'DOM_CONDICIONES', nivel: 'bajo', limite_inferior: 5, limite_superior: 9 },
  { dominio_id: 'DOM_CONDICIONES', nivel: 'medio', limite_inferior: 9, limite_superior: 11 },
  { dominio_id: 'DOM_CONDICIONES', nivel: 'alto', limite_inferior: 11, limite_superior: 14 },
  { dominio_id: 'DOM_CONDICIONES', nivel: 'muy_alto', limite_inferior: 14, limite_superior: null },

  { dominio_id: 'DOM_CARGA', nivel: 'nulo', limite_inferior: 0, limite_superior: 15 },
  { dominio_id: 'DOM_CARGA', nivel: 'bajo', limite_inferior: 15, limite_superior: 21 },
  { dominio_id: 'DOM_CARGA', nivel: 'medio', limite_inferior: 21, limite_superior: 27 },
  { dominio_id: 'DOM_CARGA', nivel: 'alto', limite_inferior: 27, limite_superior: 37 },
  { dominio_id: 'DOM_CARGA', nivel: 'muy_alto', limite_inferior: 37, limite_superior: null },

  { dominio_id: 'DOM_CONTROL', nivel: 'nulo', limite_inferior: 0, limite_superior: 11 },
  { dominio_id: 'DOM_CONTROL', nivel: 'bajo', limite_inferior: 11, limite_superior: 16 },
  { dominio_id: 'DOM_CONTROL', nivel: 'medio', limite_inferior: 16, limite_superior: 21 },
  { dominio_id: 'DOM_CONTROL', nivel: 'alto', limite_inferior: 21, limite_superior: 25 },
  { dominio_id: 'DOM_CONTROL', nivel: 'muy_alto', limite_inferior: 25, limite_superior: null },

  { dominio_id: 'DOM_JORNADA', nivel: 'nulo', limite_inferior: 0, limite_superior: 1 },
  { dominio_id: 'DOM_JORNADA', nivel: 'bajo', limite_inferior: 1, limite_superior: 2 },
  { dominio_id: 'DOM_JORNADA', nivel: 'medio', limite_inferior: 2, limite_superior: 4 },
  { dominio_id: 'DOM_JORNADA', nivel: 'alto', limite_inferior: 4, limite_superior: 6 },
  { dominio_id: 'DOM_JORNADA', nivel: 'muy_alto', limite_inferior: 6, limite_superior: null },

  { dominio_id: 'DOM_INTERFERENCIA', nivel: 'nulo', limite_inferior: 0, limite_superior: 4 },
  { dominio_id: 'DOM_INTERFERENCIA', nivel: 'bajo', limite_inferior: 4, limite_superior: 6 },
  { dominio_id: 'DOM_INTERFERENCIA', nivel: 'medio', limite_inferior: 6, limite_superior: 8 },
  { dominio_id: 'DOM_INTERFERENCIA', nivel: 'alto', limite_inferior: 8, limite_superior: 10 },
  { dominio_id: 'DOM_INTERFERENCIA', nivel: 'muy_alto', limite_inferior: 10, limite_superior: null },

  { dominio_id: 'DOM_LIDERAZGO', nivel: 'nulo', limite_inferior: 0, limite_superior: 9 },
  { dominio_id: 'DOM_LIDERAZGO', nivel: 'bajo', limite_inferior: 9, limite_superior: 12 },
  { dominio_id: 'DOM_LIDERAZGO', nivel: 'medio', limite_inferior: 12, limite_superior: 16 },
  { dominio_id: 'DOM_LIDERAZGO', nivel: 'alto', limite_inferior: 16, limite_superior: 20 },
  { dominio_id: 'DOM_LIDERAZGO', nivel: 'muy_alto', limite_inferior: 20, limite_superior: null },

  { dominio_id: 'DOM_RELACIONES', nivel: 'nulo', limite_inferior: 0, limite_superior: 10 },
  { dominio_id: 'DOM_RELACIONES', nivel: 'bajo', limite_inferior: 10, limite_superior: 13 },
  { dominio_id: 'DOM_RELACIONES', nivel: 'medio', limite_inferior: 13, limite_superior: 17 },
  { dominio_id: 'DOM_RELACIONES', nivel: 'alto', limite_inferior: 17, limite_superior: 21 },
  { dominio_id: 'DOM_RELACIONES', nivel: 'muy_alto', limite_inferior: 21, limite_superior: null },

  { dominio_id: 'DOM_VIOLENCIA', nivel: 'nulo', limite_inferior: 0, limite_superior: 7 },
  { dominio_id: 'DOM_VIOLENCIA', nivel: 'bajo', limite_inferior: 7, limite_superior: 10 },
  { dominio_id: 'DOM_VIOLENCIA', nivel: 'medio', limite_inferior: 10, limite_superior: 13 },
  { dominio_id: 'DOM_VIOLENCIA', nivel: 'alto', limite_inferior: 13, limite_superior: 16 },
  { dominio_id: 'DOM_VIOLENCIA', nivel: 'muy_alto', limite_inferior: 16, limite_superior: null },

  { dominio_id: 'DOM_RECONOCIMIENTO', nivel: 'nulo', limite_inferior: 0, limite_superior: 6 },
  { dominio_id: 'DOM_RECONOCIMIENTO', nivel: 'bajo', limite_inferior: 6, limite_superior: 10 },
  { dominio_id: 'DOM_RECONOCIMIENTO', nivel: 'medio', limite_inferior: 10, limite_superior: 14 },
  { dominio_id: 'DOM_RECONOCIMIENTO', nivel: 'alto', limite_inferior: 14, limite_superior: 18 },
  { dominio_id: 'DOM_RECONOCIMIENTO', nivel: 'muy_alto', limite_inferior: 18, limite_superior: null },

  { dominio_id: 'DOM_PERTENENCIA', nivel: 'nulo', limite_inferior: 0, limite_superior: 4 },
  { dominio_id: 'DOM_PERTENENCIA', nivel: 'bajo', limite_inferior: 4, limite_superior: 6 },
  { dominio_id: 'DOM_PERTENENCIA', nivel: 'medio', limite_inferior: 6, limite_superior: 8 },
  { dominio_id: 'DOM_PERTENENCIA', nivel: 'alto', limite_inferior: 8, limite_superior: 10 },
  { dominio_id: 'DOM_PERTENENCIA', nivel: 'muy_alto', limite_inferior: 10, limite_superior: null },
];

export const rangoGlobal = [
  { nivel: 'nulo', limite_inferior: 0, limite_superior: 50 },
  { nivel: 'bajo', limite_inferior: 50, limite_superior: 75 },
  { nivel: 'medio', limite_inferior: 75, limite_superior: 99 },
  { nivel: 'alto', limite_inferior: 99, limite_superior: 140 },
  { nivel: 'muy_alto', limite_inferior: 140, limite_superior: null },
];

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
