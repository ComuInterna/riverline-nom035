-- =====================================================================
-- CATÁLOGO NORMATIVO — NOM-035-STPS-2018, Guía de Referencia III
-- Fuente: Diario Oficial de la Federación, martes 23 de octubre de 2018.
-- "Cuestionario para identificar los factores de riesgo psicosocial
--  y evaluar el entorno organizacional en los centros de trabajo"
--  (aplica a centros de trabajo con más de 50 trabajadores)
--
-- Este script transcribe de forma literal y sin modificaciones:
--   - Los 72 reactivos oficiales (texto exacto)
--   - Tabla 5 (valor de las opciones de respuesta / reactivos invertidos)
--   - Tabla 6 (agrupación por dimensión, dominio y categoría)
--   - Tabla 7 / III.4 (rangos de riesgo: categoría, dominio y calificación final)
--
-- No modifica textos, puntuaciones, dominios, categorías ni rangos.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS catalogo;

-- ---------------------------------------------------------------------
-- 1. CATEGORÍAS (5 oficiales)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.categorias (
  id    text PRIMARY KEY,
  nombre text NOT NULL
);

INSERT INTO catalogo.categorias (id, nombre) VALUES
('CAT_AMBIENTE',   'Ambiente de trabajo'),
('CAT_FACTORES',   'Factores propios de la actividad'),
('CAT_ORG_TIEMPO',  'Organización del tiempo de trabajo'),
('CAT_LIDERAZGO',   'Liderazgo y relaciones en el trabajo'),
('CAT_ENTORNO',     'Entorno organizacional');

-- ---------------------------------------------------------------------
-- 2. DOMINIOS (10 oficiales)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.dominios (
  id           text PRIMARY KEY,
  nombre       text NOT NULL,
  categoria_id text NOT NULL REFERENCES catalogo.categorias(id)
);

INSERT INTO catalogo.dominios (id, nombre, categoria_id) VALUES
('DOM_CONDICIONES',  'Condiciones en el ambiente de trabajo',            'CAT_AMBIENTE'),
('DOM_CARGA',        'Carga de trabajo',                                  'CAT_FACTORES'),
('DOM_CONTROL',      'Falta de control sobre el trabajo',                 'CAT_FACTORES'),
('DOM_JORNADA',      'Jornada de trabajo',                                'CAT_ORG_TIEMPO'),
('DOM_INTERFERENCIA','Interferencia en la relación trabajo-familia',      'CAT_ORG_TIEMPO'),
('DOM_LIDERAZGO',    'Liderazgo',                                         'CAT_LIDERAZGO'),
('DOM_RELACIONES',   'Relaciones en el trabajo',                          'CAT_LIDERAZGO'),
('DOM_VIOLENCIA',    'Violencia',                                         'CAT_LIDERAZGO'),
('DOM_RECONOCIMIENTO','Reconocimiento del desempeño',                    'CAT_ENTORNO'),
('DOM_PERTENENCIA',  'Insuficiente sentido de pertenencia e inestabilidad','CAT_ENTORNO');

-- ---------------------------------------------------------------------
-- 3. DIMENSIONES (19 oficiales, agrupadas dentro de cada dominio)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.dimensiones (
  id         text PRIMARY KEY,
  nombre     text NOT NULL,
  dominio_id text NOT NULL REFERENCES catalogo.dominios(id)
);

INSERT INTO catalogo.dimensiones (id, nombre, dominio_id) VALUES
('DIM_PELIGROSAS',       'Condiciones peligrosas e inseguras',                         'DOM_CONDICIONES'),
('DIM_INSALUBRES',       'Condiciones deficientes e insalubres',                       'DOM_CONDICIONES'),
('DIM_TRAB_PELIGROSOS',  'Trabajos peligrosos',                                        'DOM_CONDICIONES'),

('DIM_CUANTITATIVAS',    'Cargas cuantitativas',                                       'DOM_CARGA'),
('DIM_RITMOS',           'Ritmos de trabajo acelerado',                                'DOM_CARGA'),
('DIM_MENTAL',           'Carga mental',                                               'DOM_CARGA'),
('DIM_EMOCIONALES',      'Cargas psicológicas emocionales',                            'DOM_CARGA'),
('DIM_RESPONSABILIDAD',  'Cargas de alta responsabilidad',                             'DOM_CARGA'),
('DIM_CONTRADICTORIAS',  'Cargas contradictorias o inconsistentes',                    'DOM_CARGA'),

('DIM_AUTONOMIA',        'Falta de control y autonomía sobre el trabajo',              'DOM_CONTROL'),
('DIM_DESARROLLO',       'Limitada o nula posibilidad de desarrollo',                  'DOM_CONTROL'),
('DIM_CAMBIO',           'Insuficiente participación y manejo del cambio',             'DOM_CONTROL'),
('DIM_CAPACITACION',     'Limitada o inexistente capacitación',                        'DOM_CONTROL'),

('DIM_JORNADAS_EXT',     'Jornadas de trabajo extensas',                               'DOM_JORNADA'),

('DIM_INFL_TRABAJO',     'Influencia del trabajo fuera del centro laboral',            'DOM_INTERFERENCIA'),
('DIM_INFL_FAMILIA',     'Influencia de las responsabilidades familiares',             'DOM_INTERFERENCIA'),

('DIM_CLARIDAD',         'Escasa claridad de funciones',                               'DOM_LIDERAZGO'),
('DIM_CARACT_LIDERAZGO', 'Características del liderazgo',                              'DOM_LIDERAZGO'),

('DIM_RELACIONES_SOC',   'Relaciones sociales en el trabajo',                          'DOM_RELACIONES'),
('DIM_REL_SUPERVISADOS', 'Deficiente relación con los colaboradores que supervisa',    'DOM_RELACIONES'),

('DIM_VIOLENCIA_LAB',    'Violencia laboral',                                          'DOM_VIOLENCIA'),

('DIM_RETROALIMENTACION','Escasa o nula retroalimentación del desempeño',              'DOM_RECONOCIMIENTO'),
('DIM_RECOMPENSA',       'Escaso o nulo reconocimiento y compensación',                'DOM_RECONOCIMIENTO'),

('DIM_PERTENENCIA_LIM',  'Limitado sentido de pertenencia',                            'DOM_PERTENENCIA'),
('DIM_INESTABILIDAD',    'Inestabilidad laboral',                                      'DOM_PERTENENCIA');

-- ---------------------------------------------------------------------
-- 4. REACTIVOS (72 oficiales — texto literal, orden oficial)
--    es_invertido = true  → escala Siempre=0 ... Nunca=4  (Tabla 5, primer grupo)
--    es_invertido = false → escala Siempre=4 ... Nunca=0  (Tabla 5, segundo grupo)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.reactivos (
  id            text PRIMARY KEY,   -- "R1".."R72"
  numero        int NOT NULL UNIQUE,
  texto         text NOT NULL,
  dimension_id  text NOT NULL REFERENCES catalogo.dimensiones(id),
  es_invertido  boolean NOT NULL,
  requiere_atencion_clientes boolean NOT NULL DEFAULT false, -- ítems 65-68 (condicionales)
  requiere_ser_jefe          boolean NOT NULL DEFAULT false, -- ítems 69-72 (condicionales)
  orden         int NOT NULL
);

INSERT INTO catalogo.reactivos (id, numero, texto, dimension_id, es_invertido, requiere_atencion_clientes, requiere_ser_jefe, orden) VALUES
('R1',  1,  'El espacio donde trabajo me permite realizar mis actividades de manera segura e higiénica', 'DIM_PELIGROSAS',      true,  false, false, 1),
('R2',  2,  'Mi trabajo me exige hacer mucho esfuerzo físico',                                            'DIM_INSALUBRES',      false, false, false, 2),
('R3',  3,  'Me preocupa sufrir un accidente en mi trabajo',                                              'DIM_PELIGROSAS',      false, false, false, 3),
('R4',  4,  'Considero que en mi trabajo se aplican las normas de seguridad y salud en el trabajo',       'DIM_INSALUBRES',      true,  false, false, 4),
('R5',  5,  'Considero que las actividades que realizo son peligrosas',                                   'DIM_TRAB_PELIGROSOS', false, false, false, 5),

('R6',  6,  'Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno',              'DIM_CUANTITATIVAS',   false, false, false, 6),
('R7',  7,  'Por la cantidad de trabajo que tengo debo trabajar sin parar',                                'DIM_RITMOS',          false, false, false, 7),
('R8',  8,  'Considero que es necesario mantener un ritmo de trabajo acelerado',                          'DIM_RITMOS',          false, false, false, 8),

('R9',  9,  'Mi trabajo exige que esté muy concentrado',                                                  'DIM_MENTAL',          false, false, false, 9),
('R10', 10, 'Mi trabajo requiere que memorice mucha información',                                         'DIM_MENTAL',          false, false, false, 10),
('R11', 11, 'En mi trabajo tengo que tomar decisiones difíciles muy rápido',                               'DIM_MENTAL',          false, false, false, 11),
('R12', 12, 'Mi trabajo exige que atienda varios asuntos al mismo tiempo',                                 'DIM_CUANTITATIVAS',   false, false, false, 12),

('R13', 13, 'En mi trabajo soy responsable de cosas de mucho valor',                                       'DIM_RESPONSABILIDAD', false, false, false, 13),
('R14', 14, 'Respondo ante mi jefe por los resultados de toda mi área de trabajo',                         'DIM_RESPONSABILIDAD', false, false, false, 14),
('R15', 15, 'En el trabajo me dan órdenes contradictorias',                                                 'DIM_CONTRADICTORIAS', false, false, false, 15),
('R16', 16, 'Considero que en mi trabajo me piden hacer cosas innecesarias',                                'DIM_CONTRADICTORIAS', false, false, false, 16),

('R17', 17, 'Trabajo horas extras más de tres veces a la semana',                                          'DIM_JORNADAS_EXT',    false, false, false, 17),
('R18', 18, 'Mi trabajo me exige laborar en días de descanso, festivos o fines de semana',                 'DIM_JORNADAS_EXT',    false, false, false, 18),
('R19', 19, 'Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares o personales', 'DIM_INFL_TRABAJO', false, false, false, 19),
('R20', 20, 'Debo atender asuntos de trabajo cuando estoy en casa',                                        'DIM_INFL_TRABAJO',    false, false, false, 20),
('R21', 21, 'Pienso en las actividades familiares o personales cuando estoy en mi trabajo',                'DIM_INFL_FAMILIA',    false, false, false, 21),
('R22', 22, 'Pienso que mis responsabilidades familiares afectan mi trabajo',                               'DIM_INFL_FAMILIA',    false, false, false, 22),

('R23', 23, 'Mi trabajo permite que desarrolle nuevas habilidades',                                        'DIM_DESARROLLO',      true,  false, false, 23),
('R24', 24, 'En mi trabajo puedo aspirar a un mejor puesto',                                                'DIM_DESARROLLO',      true,  false, false, 24),
('R25', 25, 'Durante mi jornada de trabajo puedo tomar pausas cuando las necesito',                        'DIM_AUTONOMIA',       true,  false, false, 25),
('R26', 26, 'Puedo decidir cuánto trabajo realizo durante la jornada laboral',                             'DIM_AUTONOMIA',       true,  false, false, 26),
('R27', 27, 'Puedo decidir la velocidad a la que realizo mis actividades en mi trabajo',                   'DIM_AUTONOMIA',       true,  false, false, 27),
('R28', 28, 'Puedo cambiar el orden de las actividades que realizo en mi trabajo',                         'DIM_AUTONOMIA',       true,  false, false, 28),

('R29', 29, 'Los cambios que se presentan en mi trabajo dificultan mi labor',                              'DIM_CAMBIO',          false, false, false, 29),
('R30', 30, 'Cuando se presentan cambios en mi trabajo se tienen en cuenta mis ideas o aportaciones',      'DIM_CAMBIO',          true,  false, false, 30),

('R31', 31, 'Me informan con claridad cuáles son mis funciones',                                           'DIM_CLARIDAD',        true,  false, false, 31),
('R32', 32, 'Me explican claramente los resultados que debo obtener en mi trabajo',                        'DIM_CLARIDAD',        true,  false, false, 32),
('R33', 33, 'Me explican claramente los objetivos de mi trabajo',                                          'DIM_CLARIDAD',        true,  false, false, 33),
('R34', 34, 'Me informan con quién puedo resolver problemas o asuntos de trabajo',                         'DIM_CLARIDAD',        true,  false, false, 34),
('R35', 35, 'Me permiten asistir a capacitaciones relacionadas con mi trabajo',                            'DIM_CAPACITACION',    true,  false, false, 35),
('R36', 36, 'Recibo capacitación útil para hacer mi trabajo',                                              'DIM_CAPACITACION',    true,  false, false, 36),

('R37', 37, 'Mi jefe ayuda a organizar mejor el trabajo',                                                  'DIM_CARACT_LIDERAZGO',true,  false, false, 37),
('R38', 38, 'Mi jefe tiene en cuenta mis puntos de vista y opiniones',                                     'DIM_CARACT_LIDERAZGO',true,  false, false, 38),
('R39', 39, 'Mi jefe me comunica a tiempo la información relacionada con el trabajo',                      'DIM_CARACT_LIDERAZGO',true,  false, false, 39),
('R40', 40, 'La orientación que me da mi jefe me ayuda a realizar mejor mi trabajo',                       'DIM_CARACT_LIDERAZGO',true,  false, false, 40),
('R41', 41, 'Mi jefe ayuda a solucionar los problemas que se presentan en el trabajo',                     'DIM_CARACT_LIDERAZGO',true,  false, false, 41),

('R42', 42, 'Puedo confiar en mis compañeros de trabajo',                                                  'DIM_RELACIONES_SOC',  true,  false, false, 42),
('R43', 43, 'Entre compañeros solucionamos los problemas de trabajo de forma respetuosa',                  'DIM_RELACIONES_SOC',  true,  false, false, 43),
('R44', 44, 'En mi trabajo me hacen sentir parte del grupo',                                               'DIM_RELACIONES_SOC',  true,  false, false, 44),
('R45', 45, 'Cuando tenemos que realizar trabajo de equipo los compañeros colaboran',                      'DIM_RELACIONES_SOC',  true,  false, false, 45),
('R46', 46, 'Mis compañeros de trabajo me ayudan cuando tengo dificultades',                               'DIM_RELACIONES_SOC',  true,  false, false, 46),

('R47', 47, 'Me informan sobre lo que hago bien en mi trabajo',                                            'DIM_RETROALIMENTACION', true, false, false, 47),
('R48', 48, 'La forma como evalúan mi trabajo en mi centro de trabajo me ayuda a mejorar mi desempeño',    'DIM_RETROALIMENTACION', true, false, false, 48),
('R49', 49, 'En mi centro de trabajo me pagan a tiempo mi salario',                                        'DIM_RECOMPENSA',      true,  false, false, 49),
('R50', 50, 'El pago que recibo es el que merezco por el trabajo que realizo',                             'DIM_RECOMPENSA',      true,  false, false, 50),
('R51', 51, 'Si obtengo los resultados esperados en mi trabajo me recompensan o reconocen',                'DIM_RECOMPENSA',      true,  false, false, 51),
('R52', 52, 'Las personas que hacen bien el trabajo pueden crecer laboralmente',                           'DIM_RECOMPENSA',      true,  false, false, 52),

('R53', 53, 'Considero que mi trabajo es estable',                                                         'DIM_INESTABILIDAD',   true,  false, false, 53),
('R54', 54, 'En mi trabajo existe continua rotación de personal',                                          'DIM_INESTABILIDAD',   false, false, false, 54),
('R55', 55, 'Siento orgullo de laborar en este centro de trabajo',                                         'DIM_PERTENENCIA_LIM', true,  false, false, 55),
('R56', 56, 'Me siento comprometido con mi trabajo',                                                       'DIM_PERTENENCIA_LIM', true,  false, false, 56),

('R57', 57, 'En mi trabajo puedo expresarme libremente sin interrupciones',                                'DIM_VIOLENCIA_LAB',   true,  false, false, 57),
('R58', 58, 'Recibo críticas constantes a mi persona y/o trabajo',                                         'DIM_VIOLENCIA_LAB',   false, false, false, 58),
('R59', 59, 'Recibo burlas, calumnias, difamaciones, humillaciones o ridiculizaciones',                    'DIM_VIOLENCIA_LAB',   false, false, false, 59),
('R60', 60, 'Se ignora mi presencia o se me excluye de las reuniones de trabajo y en la toma de decisiones','DIM_VIOLENCIA_LAB',  false, false, false, 60),
('R61', 61, 'Se manipulan las situaciones de trabajo para hacerme parecer un mal trabajador',              'DIM_VIOLENCIA_LAB',   false, false, false, 61),
('R62', 62, 'Se ignoran mis éxitos laborales y se atribuyen a otros trabajadores',                         'DIM_VIOLENCIA_LAB',   false, false, false, 62),
('R63', 63, 'Me bloquean o impiden las oportunidades que tengo para obtener ascenso o mejora en mi trabajo','DIM_VIOLENCIA_LAB',  false, false, false, 63),
('R64', 64, 'He presenciado actos de violencia en mi centro de trabajo',                                   'DIM_VIOLENCIA_LAB',   false, false, false, 64),

-- Reactivos condicionales: solo se responden si "En mi trabajo debo brindar servicio a clientes o usuarios" = Sí
('R65', 65, 'Atiendo clientes o usuarios muy enojados',                                                    'DIM_EMOCIONALES',     false, true,  false, 65),
('R66', 66, 'Mi trabajo me exige atender personas muy necesitadas de ayuda o enfermas',                    'DIM_EMOCIONALES',     false, true,  false, 66),
('R67', 67, 'Para hacer mi trabajo debo demostrar sentimientos distintos a los míos',                      'DIM_EMOCIONALES',     false, true,  false, 67),
('R68', 68, 'Mi trabajo me exige atender situaciones de violencia',                                        'DIM_EMOCIONALES',     false, true,  false, 68),

-- Reactivos condicionales: solo se responden si "Soy jefe de otros trabajadores" = Sí
('R69', 69, 'Comunican tarde los asuntos de trabajo',                                                      'DIM_REL_SUPERVISADOS', false, false, true, 69),
('R70', 70, 'Dificultan el logro de los resultados del trabajo',                                           'DIM_REL_SUPERVISADOS', false, false, true, 70),
('R71', 71, 'Cooperan poco cuando se necesita',                                                            'DIM_REL_SUPERVISADOS', false, false, true, 71),
('R72', 72, 'Ignoran las sugerencias para mejorar su trabajo',                                             'DIM_REL_SUPERVISADOS', false, false, true, 72);

-- ---------------------------------------------------------------------
-- 5. RANGOS DE RIESGO POR CATEGORÍA (Tabla III.3-c-2)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.rangos_riesgo_categoria (
  categoria_id      text NOT NULL REFERENCES catalogo.categorias(id),
  nivel             text NOT NULL, -- 'nulo','bajo','medio','alto','muy_alto'
  limite_inferior   numeric,       -- NULL = sin límite inferior (0)
  limite_superior   numeric,       -- NULL = sin límite superior (infinito)
  PRIMARY KEY (categoria_id, nivel)
);

INSERT INTO catalogo.rangos_riesgo_categoria (categoria_id, nivel, limite_inferior, limite_superior) VALUES
('CAT_AMBIENTE',    'nulo',      0,   5),
('CAT_AMBIENTE',    'bajo',      5,   9),
('CAT_AMBIENTE',    'medio',     9,   11),
('CAT_AMBIENTE',    'alto',      11,  14),
('CAT_AMBIENTE',    'muy_alto',  14,  NULL),

('CAT_FACTORES',    'nulo',      0,   15),
('CAT_FACTORES',    'bajo',      15,  30),
('CAT_FACTORES',    'medio',     30,  45),
('CAT_FACTORES',    'alto',      45,  60),
('CAT_FACTORES',    'muy_alto',  60,  NULL),

('CAT_ORG_TIEMPO',  'nulo',      0,   5),
('CAT_ORG_TIEMPO',  'bajo',      5,   7),
('CAT_ORG_TIEMPO',  'medio',     7,   10),
('CAT_ORG_TIEMPO',  'alto',      10,  13),
('CAT_ORG_TIEMPO',  'muy_alto',  13,  NULL),

('CAT_LIDERAZGO',   'nulo',      0,   14),
('CAT_LIDERAZGO',   'bajo',      14,  29),
('CAT_LIDERAZGO',   'medio',     29,  42),
('CAT_LIDERAZGO',   'alto',      42,  58),
('CAT_LIDERAZGO',   'muy_alto',  58,  NULL),

('CAT_ENTORNO',     'nulo',      0,   10),
('CAT_ENTORNO',     'bajo',      10,  14),
('CAT_ENTORNO',     'medio',     14,  18),
('CAT_ENTORNO',     'alto',      18,  23),
('CAT_ENTORNO',     'muy_alto',  23,  NULL);

-- ---------------------------------------------------------------------
-- 6. RANGOS DE RIESGO POR DOMINIO (Tabla III.3-c-3)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.rangos_riesgo_dominio (
  dominio_id        text NOT NULL REFERENCES catalogo.dominios(id),
  nivel             text NOT NULL,
  limite_inferior   numeric,
  limite_superior   numeric,
  PRIMARY KEY (dominio_id, nivel)
);

INSERT INTO catalogo.rangos_riesgo_dominio (dominio_id, nivel, limite_inferior, limite_superior) VALUES
('DOM_CONDICIONES',   'nulo',      0,   5),
('DOM_CONDICIONES',   'bajo',      5,   9),
('DOM_CONDICIONES',   'medio',     9,   11),
('DOM_CONDICIONES',   'alto',      11,  14),
('DOM_CONDICIONES',   'muy_alto',  14,  NULL),

('DOM_CARGA',         'nulo',      0,   15),
('DOM_CARGA',         'bajo',      15,  21),
('DOM_CARGA',         'medio',     21,  27),
('DOM_CARGA',         'alto',      27,  37),
('DOM_CARGA',         'muy_alto',  37,  NULL),

('DOM_CONTROL',       'nulo',      0,   11),
('DOM_CONTROL',       'bajo',      11,  16),
('DOM_CONTROL',       'medio',     16,  21),
('DOM_CONTROL',       'alto',      21,  25),
('DOM_CONTROL',       'muy_alto',  25,  NULL),

('DOM_JORNADA',       'nulo',      0,   1),
('DOM_JORNADA',       'bajo',      1,   2),
('DOM_JORNADA',       'medio',     2,   4),
('DOM_JORNADA',       'alto',      4,   6),
('DOM_JORNADA',       'muy_alto',  6,   NULL),

('DOM_INTERFERENCIA', 'nulo',      0,   4),
('DOM_INTERFERENCIA', 'bajo',      4,   6),
('DOM_INTERFERENCIA', 'medio',     6,   8),
('DOM_INTERFERENCIA', 'alto',      8,   10),
('DOM_INTERFERENCIA', 'muy_alto',  10,  NULL),

('DOM_LIDERAZGO',     'nulo',      0,   9),
('DOM_LIDERAZGO',     'bajo',      9,   12),
('DOM_LIDERAZGO',     'medio',     12,  16),
('DOM_LIDERAZGO',     'alto',      16,  20),
('DOM_LIDERAZGO',     'muy_alto',  20,  NULL),

('DOM_RELACIONES',    'nulo',      0,   10),
('DOM_RELACIONES',    'bajo',      10,  13),
('DOM_RELACIONES',    'medio',     13,  17),
('DOM_RELACIONES',    'alto',      17,  21),
('DOM_RELACIONES',    'muy_alto',  21,  NULL),

('DOM_VIOLENCIA',     'nulo',      0,   7),
('DOM_VIOLENCIA',     'bajo',      7,   10),
('DOM_VIOLENCIA',     'medio',     10,  13),
('DOM_VIOLENCIA',     'alto',      13,  16),
('DOM_VIOLENCIA',     'muy_alto',  16,  NULL),

('DOM_RECONOCIMIENTO','nulo',      0,   6),
('DOM_RECONOCIMIENTO','bajo',      6,   10),
('DOM_RECONOCIMIENTO','medio',     10,  14),
('DOM_RECONOCIMIENTO','alto',      14,  18),
('DOM_RECONOCIMIENTO','muy_alto',  18,  NULL),

('DOM_PERTENENCIA',   'nulo',      0,   4),
('DOM_PERTENENCIA',   'bajo',      4,   6),
('DOM_PERTENENCIA',   'medio',     6,   8),
('DOM_PERTENENCIA',   'alto',      8,   10),
('DOM_PERTENENCIA',   'muy_alto',  10,  NULL);

-- ---------------------------------------------------------------------
-- 7. RANGO DE RIESGO GLOBAL / CALIFICACIÓN FINAL DEL CUESTIONARIO (III.3-c-1)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.rangos_riesgo_global (
  nivel             text PRIMARY KEY,
  limite_inferior   numeric,
  limite_superior   numeric
);

INSERT INTO catalogo.rangos_riesgo_global (nivel, limite_inferior, limite_superior) VALUES
('nulo',      0,   50),
('bajo',      50,  75),
('medio',     75,  99),
('alto',      99,  140),
('muy_alto',  140, NULL);

-- ---------------------------------------------------------------------
-- 8. TABLA DE ACCIONES POR NIVEL DE RIESGO (Tabla 7 / III.4)
--    Texto oficial completo, usado por el Plan de Acción (Módulo 6)
-- ---------------------------------------------------------------------
CREATE TABLE catalogo.acciones_por_nivel (
  nivel  text PRIMARY KEY,
  accion text NOT NULL
);

INSERT INTO catalogo.acciones_por_nivel (nivel, accion) VALUES
('muy_alto', 'Se requiere realizar el análisis de cada categoría y dominio para establecer las acciones de intervención apropiadas, mediante un Programa de intervención que deberá incluir evaluaciones específicas, y contemplar campañas de sensibilización, revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión.'),
('alto', 'Se requiere realizar un análisis de cada categoría y dominio, de manera que se puedan determinar las acciones de intervención apropiadas a través de un Programa de intervención, que podrá incluir una evaluación específica y deberá incluir una campaña de sensibilización, revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión.'),
('medio', 'Se requiere revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su aplicación y difusión, mediante un Programa de intervención.'),
('bajo', 'Es necesario una mayor difusión de la política de prevención de riesgos psicosociales y programas para: la prevención de los factores de riesgo psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral.'),
('nulo', 'El riesgo resulta despreciable por lo que no se requiere medidas adicionales.');

-- ---------------------------------------------------------------------
-- Notas de implementación para el motor de calificación (Módulo 3):
--
-- 1) calificacion_reactivo se calcula así (Tabla 5):
--      si es_invertido = true  → Siempre=0, Casi siempre=1, Algunas veces=2, Casi nunca=3, Nunca=4
--      si es_invertido = false → Siempre=4, Casi siempre=3, Algunas veces=2, Casi nunca=1, Nunca=0
--
-- 2) Los reactivos 65-68 solo aplican si el colaborador respondió "Sí" a
--    "En mi trabajo debo brindar servicio a clientes o usuarios". Si respondió
--    "No", esos 4 reactivos se omiten y NO se incluyen en ninguna suma.
--
-- 3) Los reactivos 69-72 solo aplican si el colaborador respondió "Sí" a
--    "Soy jefe de otros trabajadores". Si respondió "No", el cuestionario
--    concluye ahí y esos 4 reactivos se omiten de todas las sumas.
--
--    Esto significa que Cfinal máximo varía según el perfil del colaborador
--    (68, 72 o 76 reactivos posibles según si atiende clientes y/o supervisa).
--    Esta es la regla oficial (III.1-III.3) — no es un ajuste nuestro.
--
-- 4) Cdom = suma de calificacion_reactivo de todos los reactivos de ese dominio.
-- 5) Ccat = suma de calificacion_reactivo de todos los reactivos de esa categoría.
-- 6) Cfinal = suma de calificacion_reactivo de TODOS los reactivos contestados.
-- =====================================================================
