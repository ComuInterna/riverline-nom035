# Documento de Arquitectura — Plataforma NOM-035-STPS-2018 (Guía de Referencia III)

**Proyecto:** Sistema digital de identificación y análisis de factores de riesgo psicosocial
**Alcance normativo:** Guía de Referencia III (centros de trabajo con más de 50 trabajadores)
**Stack propuesto:** Supabase (PostgreSQL + RLS + Realtime + Storage + Auth) — consistente con tu stack actual en UniStock y Nexus HR
**Estado:** Para revisión y aprobación antes de iniciar desarrollo por módulos

---

## 1. Resumen ejecutivo

La plataforma automatiza la aplicación, calificación e interpretación del cuestionario oficial de la Guía III, garantizando:

1. **Fidelidad normativa total**: reactivos, escalas, dominios, categorías, reactivos invertidos y rangos de riesgo exactamente como los publica la STPS — sin resúmenes ni reinterpretaciones.
2. **Anonimato estructural**, no solo funcional: la separación entre "quién contestó" y "qué contestó" se implementa a nivel de base de datos (dos tablas sin llave foránea entre sí, en esquemas/roles distintos), no solo a nivel de interfaz.
3. **Evidencia documental para inspección**: trazabilidad de metodología, fechas, y reportes exportables listos para auditoría STPS.

Antes de tocar código, este documento cubre: frontend, backend, modelo de datos, seguridad, APIs, flujos de usuario y el motor de evaluación. Una vez aprobado, se construye por módulos.

---

## 2. Arquitectura Frontend

### 2.1 Stack
- HTML5 semántico + CSS3 (custom properties para tema claro/oscuro) + JavaScript ES2025 vanilla como núcleo.
- Bootstrap 5.3 para grid/componentes base, sobre-escrito con un sistema de diseño propio (tokens de color, tipografía, espaciado) para que no se vea "Bootstrap genérico".
- Chart.js para gauge/radar/barras/líneas/pastel/histogramas; DataTables para tablas de seguimiento y respuestas; SheetJS para import/export Excel; PDFMake para reportes PDF client-side (o generación server-side si el volumen de datos lo justifica).
- Arquitectura de módulos JS (ES Modules) separados por dominio funcional: `auth.js`, `survey-engine.js`, `scoring-engine.js`, `admin-dashboard.js`, `reports.js`, `import-export.js`.

### 2.2 Estructura de vistas
```
/login                     → selector Administrador / Colaborador
/colaborador/bienvenida     → objetivo, confidencialidad, tiempo estimado
/colaborador/encuesta       → cuestionario oficial, autoguardado
/colaborador/gracias         → confirmación de envío (sin mostrar resultados individuales)
/admin/dashboard             → KPIs generales
/admin/seguimiento            → tabla de status de aplicación (Tabla A)
/admin/respuestas              → tabla de resultados agregados (Tabla B)
/admin/analisis-nom035          → motor de evaluación y resultados
/admin/plan-de-accion             → generador de recomendaciones
/admin/reportes                    → exportación PDF/Excel/Word/PPT
/admin/historico                    → comparativos entre periodos/años
```

### 2.3 Responsividad y accesibilidad
- Mobile-first, breakpoints Bootstrap estándar + ajustes propios para tablet.
- Modo claro/oscuro con `prefers-color-scheme` + toggle manual persistido en `localStorage` (solo preferencia de UI, nunca datos de encuesta).
- Cumplimiento WCAG 2.1 AA: contraste mínimo 4.5:1, foco visible, roles ARIA en componentes de encuesta (radiogroup por reactivo), navegación 100% por teclado.

---

## 3. Arquitectura Backend (Supabase)

### 3.1 Componentes
- **Supabase Auth**: login de colaborador (simple, solo para marcar "ya contestó") y login de administrador (con roles).
- **PostgreSQL + Row Level Security**: el corazón del aislamiento de datos. RLS es lo que hace *estructuralmente* imposible —no solo "por convención"— que una fila de Tabla A se pueda unir con una fila de Tabla B desde el cliente.
- **Supabase Storage**: reportes generados (PDF/Word/PPT), plantillas de importación.
- **Supabase Realtime**: actualización en vivo del dashboard de seguimiento (KPIs, % de avance) sin refrescar.
- **Edge Functions** (Deno): 
  - `finalize-survey`: recibe respuestas, calcula UUID anónimo, ejecuta el motor de calificación, escribe en Tabla B, y por separado marca el status en Tabla A — en una transacción que nunca expone el vínculo hacia afuera.
  - `generate-report`: arma reportes ejecutivos/técnicos server-side para consistencia entre exportaciones.
  - `send-reminder`: integración con correo (Resend/SendGrid) para recordatorios a pendientes.

### 3.2 Por qué separar en Edge Function y no solo en el cliente
El cálculo de "quién contestó" y "qué contestó" **nunca debe cruzarse en el navegador**. Si el cliente calculara ambas cosas en la misma sesión de JS, existiría un instante en memoria donde el vínculo persona↔respuesta existe, aunque no se guarde. Al mover la escritura final a una Edge Function con dos llamadas independientes a la base de datos (una a Tabla A sin tocar Tabla B, otra a Tabla B sin tocar Tabla A), se elimina ese riesgo.

---

## 4. Modelo de datos (Entidad-Relación)

### 4.1 Principio de diseño
**Dos universos de datos sin llave foránea entre ellos.** Se refuerza con:
- Esquemas de Postgres distintos: `seguimiento` y `encuestas`.
- Roles de base de datos distintos con permisos distintos (el rol que puede leer `seguimiento` no tiene permiso de lectura sobre `encuestas` y viceversa, salvo el rol de servicio usado únicamente por la Edge Function de cierre).
- Ningún campo en `encuestas.*` referencia `colaborador_id`, `email`, ni ningún identificador reversible.

### 4.2 Esquema `seguimiento` (Tabla A — con datos personales, SIN resultados)

```sql
tabla: seguimiento.colaboradores
- id                    uuid pk
- nombre                text
- puesto                text
- departamento          text
- email                 text
- fecha_alta            timestamptz
- fecha_acceso          timestamptz null      -- primer login
- fecha_encuesta        timestamptz null      -- cuándo terminó
- status                enum('no_contesto','en_proceso','contesto')
- recordatorios_enviados int default 0
```

> Esta tabla **no tiene columna de resultados, calificación, ni respuestas.** Solo sabe *que* la persona contestó, nunca *qué* contestó.

### 4.3 Esquema `encuestas` (Tabla B — anónima, SIN datos personales)

```sql
tabla: encuestas.aplicaciones
- uuid                  uuid pk (generado independiente, sin relación a colaboradores.id)
- fecha_inicio          timestamptz
- fecha_fin             timestamptz
- periodo               text        -- ej. "2026-Q3"
- departamento_generico text null   -- opcional, solo si el mínimo de N preserva anonimato (ver 4.5)
- puesto_generico       text null   -- idem
- duracion_segundos     int

tabla: encuestas.respuestas
- id                    bigserial pk
- aplicacion_uuid       uuid fk → encuestas.aplicaciones.uuid
- reactivo_id           text        -- id oficial del reactivo (ej. "R1", "R2"...)
- respuesta_valor       smallint    -- 0-4 según escala oficial
- es_invertido          boolean
- calificacion_reactivo smallint    -- ya con inversión aplicada

tabla: encuestas.calificaciones
- aplicacion_uuid       uuid fk → encuestas.aplicaciones.uuid
- dimension_id          text
- dominio_id            text
- categoria_id          text
- puntaje_dimension     numeric
- puntaje_dominio       numeric
- puntaje_categoria     numeric
- puntaje_global        numeric
- nivel_riesgo          enum('nulo','bajo','medio','alto','muy_alto')
```

### 4.4 Catálogo normativo (solo lectura, fuente de verdad de la Guía III)

```sql
tabla: catalogo.reactivos
- id             text pk        -- "R1"..."Rn" oficiales
- texto          text           -- texto literal del reactivo
- dimension_id   text fk
- es_invertido   boolean
- orden          int

tabla: catalogo.dimensiones
- id             text pk
- nombre         text
- dominio_id     text fk

tabla: catalogo.dominios
- id             text pk
- nombre         text
- categoria_id   text fk

tabla: catalogo.categorias
- id             text pk
- nombre         text

tabla: catalogo.rangos_riesgo
- categoria_id   text fk
- nivel          enum
- limite_inferior numeric
- limite_superior numeric
```

Este catálogo se carga **una sola vez**, capturado exactamente de la Guía de Referencia III oficial (ver sección 8.4 sobre cómo se valida esa carga). El motor de evaluación nunca calcula "a mano"; siempre consulta este catálogo.

### 4.5 Regla de anonimato en comparativos por departamento
Un `departamento_generico` solo se llena en `encuestas.aplicaciones` si el número de respondientes de ese departamento en ese periodo es mayor o igual a un mínimo configurable (recomendado: 5, ajustable). Si no se cumple, el campo queda `null` y ese registro se agrupa en "General" para reportes. Esta regla vive en la Edge Function de cierre, no en el cliente.

### 4.6 Diagrama de relaciones (alto nivel)

```
[seguimiento.colaboradores]          [encuestas.aplicaciones]
        (PII)                              (anónimo)
           |                                    |
           |  (sin FK — separación total)       |
           |                                    ├──< encuestas.respuestas
           |                                    └──< encuestas.calificaciones
           |
           └── Edge Function "finalize-survey" escribe status aquí,
               SIN pasar ningún dato de vuelta desde encuestas.*
```

---

## 5. Seguridad y cumplimiento

- **RLS por rol**: rol `colaborador_auth` solo puede hacer `UPDATE` de su propio status en `seguimiento` (vía función, no acceso directo a tabla) e `INSERT` en `encuestas.respuestas` durante su sesión activa, nunca `SELECT` sobre resultados ajenos.
- **Rol `admin`**: `SELECT` sobre `seguimiento.*` y sobre `encuestas.*` agregado/anonimizado, pero la interfaz de administrador **nunca despliega una vista que permita cruzar ambas tablas por timestamp o coincidencia**, ni siquiera como query ad-hoc (se bloquea a nivel de RLS, no solo de UI).
- **JWT de Supabase Auth** con expiración corta para sesión de colaborador (se revalida en cada guardado automático).
- **HTTPS** obligatorio (Supabase lo da por defecto).
- **Auditoría**: tabla `auditoria.eventos_admin` (quién exportó qué, cuándo) — nunca registra eventos de colaborador para no crear un log correlacionable.
- **Backups**: point-in-time recovery de Supabase (plan Pro) + export programado semanal a Storage cifrado.
- **Cifrado en reposo**: por defecto en Supabase/Postgres; campos de `seguimiento.colaboradores.email` opcionalmente con `pgcrypto` si el cliente lo requiere.

---

## 6. APIs y contratos de datos

Todas las escrituras críticas pasan por Edge Functions (no INSERT directo desde el cliente a tablas sensibles), para mantener la lógica de anonimización centralizada y auditable.

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/auth/colaborador-login` | POST | público | Valida colaborador contra `seguimiento.colaboradores`, crea sesión, marca `fecha_acceso` |
| `/survey/save-progress` | POST | colaborador | Autoguardado de respuestas parciales (buffer temporal, no en `encuestas.respuestas` hasta cierre) |
| `/survey/finalize` | POST | colaborador | Ejecuta motor de calificación, escribe Tabla B, marca `contesto` en Tabla A, destruye buffer |
| `/admin/kpis` | GET | admin | KPIs agregados para dashboard |
| `/admin/seguimiento` | GET | admin | Tabla A completa (con filtros) |
| `/admin/respuestas` | GET | admin | Tabla B agregada/anónima |
| `/admin/import-colaboradores` | POST | admin | Carga Excel/CSV a `seguimiento.colaboradores` |
| `/admin/export/{formato}` | GET | admin | Excel/CSV/JSON/PDF/Word/PPT |
| `/admin/reminder` | POST | admin | Dispara recordatorio a pendientes |
| `/admin/plan-de-accion` | GET | admin | Genera análisis narrativo basado en resultados reales (sin inventar datos) |

---

## 7. Flujos de usuario

### 7.1 Colaborador
1. Login simple → se marca `fecha_acceso`, status pasa a `en_proceso`.
2. Pantalla de bienvenida (objetivo, confidencialidad, tiempo estimado, botón "Comenzar").
3. Cuestionario oficial, un reactivo o bloque a la vez, con barra de progreso y autoguardado en buffer temporal (no en tabla final).
4. Si cierra el navegador: al reingresar, recupera el buffer y continúa.
5. Al terminar el último reactivo → Edge Function `finalize-survey`: calcula, anonimiza, escribe Tabla B, marca Tabla A como `contestó`, borra el buffer.
6. Pantalla de agradecimiento — **nunca muestra resultado individual**, para no romper la separación conceptual y evitar interpretaciones ansiosas.

### 7.2 Administrador
1. Login con rol.
2. Dashboard con KPIs (respondidos/pendientes/tiempo promedio) en tiempo real vía Realtime.
3. Seguimiento: tabla filtrable, exportable, con botón de recordatorio.
4. Respuestas: solo vista agregada anónima, exportable.
5. Análisis NOM-035: ejecuta/consulta el motor de evaluación, ve resultados por dimensión/dominio/categoría/global.
6. Plan de acción: texto generado a partir de resultados reales.
7. Reportes: descarga PDF ejecutivo/técnico, Excel, Word, PPT.
8. Histórico: comparativos entre periodos.

---

## 8. Motor de evaluación NOM-035 (arquitectura, no aún el contenido literal)

### 8.1 Principio de diseño
El motor es una función pura y determinista:
```
calificar(respuestas[], catalogo) → { puntaje_dimension, puntaje_dominio, puntaje_categoria, puntaje_global, nivel_riesgo }
```
Nunca contiene reactivos "hardcodeados" en la lógica de negocio — todo reactivo, inversión, agrupación y rango de riesgo se lee del esquema `catalogo` (sección 4.4). Esto permite:
- Auditar el catálogo por separado del código (un revisor de cumplimiento puede validar el catálogo contra el PDF oficial de la STPS sin leer JavaScript).
- Actualizar el catálogo si la STPS publica una actualización, sin tocar el motor.

### 8.2 Pasos del cálculo (genérico, se llenará con los valores oficiales exactos)
1. Aplicar inversión de puntaje a reactivos marcados `es_invertido`.
2. Sumar por dimensión.
3. Sumar dimensiones dentro de cada dominio.
4. Sumar dominios dentro de cada categoría.
5. Obtener calificación global.
6. Mapear cada suma contra `catalogo.rangos_riesgo` para determinar Nulo/Bajo/Medio/Alto/Muy Alto.

### 8.3 Punto crítico a resolver antes de programar el catálogo
Para que el catálogo de reactivos, dimensiones, dominios, categorías y rangos sea **fiel al 100%**, necesito cargar el texto oficial completo de la Guía de Referencia III directamente de la fuente publicada por la STPS/DOF (no reconstruirlo de memoria). Te propongo que, antes del módulo de "Encuesta", verifiquemos juntos la fuente oficial vigente (PDF de la STPS) para transcribir el catálogo exacto — así garantizamos cero desviación normativa. Puedo buscarla y confirmar la versión vigente en cuanto arranquemos ese módulo.

### 8.4 Validación del catálogo
Antes de producción: checklist de validación reactivo por reactivo contra el documento oficial (texto, dimensión, dominio, categoría, si es invertido), firmada por la persona responsable de cumplimiento normativo en Riverline.

---

## 9. Hoja de ruta de desarrollo por módulos

| # | Módulo | Contenido |
|---|---|---|
| 1 | Fundaciones | Supabase project, esquemas, RLS, roles, Auth |
| 2 | Catálogo normativo | Carga y validación del catálogo oficial Guía III |
| 3 | Motor de evaluación | Función pura de calificación + pruebas unitarias contra casos conocidos |
| 4 | Módulo Colaborador | Login, bienvenida, encuesta, autoguardado, cierre |
| 5 | Módulo Administrador — Seguimiento | Dashboard KPIs, tabla, import, recordatorios |
| 6 | Módulo Administrador — Análisis | Resultados, gráficas, plan de acción |
| 7 | Reportes | PDF/Excel/Word/PPT |
| 8 | Histórico | Comparativos entre periodos |
| 9 | Seguridad y auditoría | Revisión final RLS, logs, backups |
| 10 | QA y despliegue | Pruebas responsivas, accesibilidad AA, deploy producción |

---

## 10. Próximos pasos

1. Confirmas o ajustas esta arquitectura (por ejemplo: si prefieres Firebase en vez de Supabase, o un híbrido).
2. Empezamos por el **Módulo 2 (Catálogo normativo)** — ahí es donde busco y confirmamos contigo la fuente oficial vigente de la Guía III para transcribir el catálogo completo sin errores.
3. A partir de un catálogo validado, construimos el resto de los módulos en orden, cada uno entregable y probable por separado.

¿Aprobamos esta arquitectura para arrancar con el catálogo normativo, o quieres ajustar algo primero (por ejemplo, Firebase vs. Supabase, o el mínimo de N para comparativos por departamento)?
