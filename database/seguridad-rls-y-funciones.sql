-- =====================================================================
-- MODULO 9 — SEGURIDAD Y AUDITORIA
-- =====================================================================
-- Principio central: NINGUNA tabla de seguimiento.* o encuestas.* es
-- accesible directamente por los roles `anon` o `authenticated` de
-- Supabase. Toda interaccion pasa por funciones RPC `SECURITY DEFINER`
-- que:
--   1) validan quien puede llamarlas (colaborador anonimo vs admin
--      registrado), y
--   2) regresan exactamente los datos que ese caso de uso necesita —
--      nunca la tabla completa.
--
-- Esto reemplaza los accesos directos "TODO" que quedaron marcados en
-- los Modulos 4-8 (ej. `.from('colaboradores').select(...)`) por
-- llamadas RPC equivalentes. Los archivos de esos modulos ya estan
-- escritos para funcionar con estas funciones sin cambios adicionales,
-- excepto por dos ajustes señalados al final de este archivo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Esquema de auditoria (nuevo en este modulo)
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auditoria;
GRANT USAGE ON SCHEMA auditoria TO authenticated;

CREATE TABLE IF NOT EXISTS auditoria.eventos_admin (
  id            bigserial PRIMARY KEY,
  admin_id      uuid NOT NULL,           -- auth.uid() de quien ejecuto la accion
  accion        text NOT NULL,           -- ej. 'exportar_excel', 'importar_colaboradores', 'enviar_recordatorio'
  detalle       jsonb,                   -- contexto no sensible (ej. {"periodo": "2026-Q3", "filas": 12})
  creado_en     timestamptz NOT NULL DEFAULT now()
);
-- Nunca registra eventos de colaborador, para no crear un log correlacionable
-- con el momento en que alguien contesto la encuesta.
ALTER TABLE auditoria.eventos_admin ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON auditoria.eventos_admin TO authenticated;
-- Sin policy de INSERT para anon/authenticated: solo SECURITY DEFINER puede escribir aqui,
-- y solo un admin puede leerlo (policy de lectura mas abajo, tras definir es_admin()).

-- ---------------------------------------------------------------------
-- 1. Tabla de administradores (quien tiene rol admin)
-- ---------------------------------------------------------------------
-- Un admin es cualquier usuario de Supabase Auth (auth.users) cuyo id
-- aparece aqui. Se gestiona manualmente (o desde un panel interno) —
-- nunca se auto-asigna desde el cliente.
CREATE TABLE IF NOT EXISTS seguimiento.admins (
  user_id     uuid PRIMARY KEY,          -- referencia logica a auth.users.id
  nombre      text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE seguimiento.admins ENABLE ROW LEVEL SECURITY;
-- Sin policies: nadie (ni admin) puede leer/escribir esta tabla desde el
-- cliente. Solo se administra con la service_role key desde Supabase Studio
-- o una funcion de "invitar admin" que un super-admin ejecute manualmente.

CREATE OR REPLACE FUNCTION seguimiento.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM seguimiento.admins WHERE user_id = auth.uid()
  );
$$;
-- es_admin() SI se expone: cualquier usuario autenticado puede preguntar
-- "¿soy admin?" (regresa un booleano, no datos), para que la UI decida
-- que pantalla mostrar.
GRANT EXECUTE ON FUNCTION seguimiento.es_admin() TO authenticated;

-- Ahora que existe es_admin(), agregamos la policy de lectura de auditoria:
DROP POLICY IF EXISTS auditoria_solo_admin_lectura ON auditoria.eventos_admin;
CREATE POLICY auditoria_solo_admin_lectura ON auditoria.eventos_admin
  FOR SELECT
  USING (seguimiento.es_admin());

-- ---------------------------------------------------------------------
-- 2. RLS default-deny en las tablas sensibles
-- ---------------------------------------------------------------------
-- Enable RLS sin ninguna policy = nadie (excepto service_role, que
-- Supabase configura para saltarse RLS) puede tocar estas tablas
-- directamente. Todo pasa por las funciones de la seccion 3.
ALTER TABLE seguimiento.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas.aplicaciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas.respuestas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas.calificaciones  ENABLE ROW LEVEL SECURITY;

-- catalogo.* es informacion normativa publica (no personal, no sensible):
-- se permite lectura directa a cualquiera, pero solo service_role escribe.
ALTER TABLE catalogo.reactivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalogo_lectura_publica ON catalogo.reactivos;
CREATE POLICY catalogo_lectura_publica ON catalogo.reactivos FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 3. Funciones RPC SECURITY DEFINER (unico punto de acceso)
-- ---------------------------------------------------------------------

-- 3.1 Colaborador: buscar su codigo (login). Publica (anon), pero
-- regresa SOLO id/nombre/status — nunca email, puesto o departamento,
-- que no le hacen falta al colaborador para nada.
CREATE OR REPLACE FUNCTION public.colaborador_buscar(p_codigo text)
RETURNS TABLE (id uuid, nombre text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nombre, c.status
  FROM seguimiento.colaboradores c
  WHERE c.codigo = p_codigo;
$$;
GRANT EXECUTE ON FUNCTION public.colaborador_buscar(text) TO anon, authenticated;

-- 3.2 Colaborador: marcar que ya accedio (primer login).
CREATE OR REPLACE FUNCTION public.marcar_acceso_colaborador(p_colaborador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE seguimiento.colaboradores
  SET fecha_acceso = COALESCE(fecha_acceso, now()),
      status = CASE WHEN status = 'no_contesto' THEN 'en_proceso' ELSE status END
  WHERE id = p_colaborador_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marcar_acceso_colaborador(uuid) TO anon, authenticated;

-- 3.3 Admin: seguimiento completo (Modulo 5). Lanza excepcion si quien
-- llama no es admin — nunca regresa filas parciales silenciosamente.
CREATE OR REPLACE FUNCTION public.admin_obtener_seguimiento()
RETURNS SETOF seguimiento.colaboradores
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT seguimiento.es_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY SELECT * FROM seguimiento.colaboradores;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_obtener_seguimiento() TO authenticated;

-- 3.4 Admin: importar colaboradores (Modulo 5). Genera codigo si falta
-- y evita duplicados por email, dentro de la misma transaccion.
CREATE OR REPLACE FUNCTION public.admin_importar_colaboradores(p_filas jsonb)
RETURNS TABLE (insertados int, omitidos_duplicados int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insertados int := 0;
  v_omitidos int := 0;
  v_fila jsonb;
  v_siguiente_codigo int;
BEGIN
  IF NOT seguimiento.es_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COALESCE(MAX(codigo::int), 1000) + 1 INTO v_siguiente_codigo
  FROM seguimiento.colaboradores WHERE codigo ~ '^[0-9]+$';

  FOR v_fila IN SELECT * FROM jsonb_array_elements(p_filas) LOOP
    IF EXISTS (
      SELECT 1 FROM seguimiento.colaboradores
      WHERE email = (v_fila->>'email') AND email IS NOT NULL AND email <> ''
    ) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    INSERT INTO seguimiento.colaboradores (codigo, nombre, puesto, departamento, email, status)
    VALUES (
      COALESCE(NULLIF(v_fila->>'codigo', ''), v_siguiente_codigo::text),
      v_fila->>'nombre',
      v_fila->>'puesto',
      v_fila->>'departamento',
      NULLIF(v_fila->>'email', ''),
      'no_contesto'
    );
    v_insertados := v_insertados + 1;
    IF v_fila->>'codigo' IS NULL OR v_fila->>'codigo' = '' THEN
      v_siguiente_codigo := v_siguiente_codigo + 1;
    END IF;
  END LOOP;

  PERFORM auditoria.registrar_evento('importar_colaboradores', jsonb_build_object('insertados', v_insertados, 'omitidos_duplicados', v_omitidos));

  RETURN QUERY SELECT v_insertados, v_omitidos;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_importar_colaboradores(jsonb) TO authenticated;

-- 3.5 Admin: resultados agregados por periodo (Modulo 6/7). Nunca hace
-- join con seguimiento.colaboradores.
CREATE OR REPLACE FUNCTION public.obtener_resultados_periodo(p_periodo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  IF NOT seguimiento.es_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT jsonb_build_object(
    'totalRespuestas', (SELECT count(*) FROM encuestas.aplicaciones WHERE periodo = p_periodo),
    'porDominio', (
      SELECT jsonb_agg(jsonb_build_object('dominio_id', dominio_id, 'puntaje', round(avg(puntaje_dominio)), 'nivel_riesgo', mode() WITHIN GROUP (ORDER BY nivel_riesgo)))
      FROM encuestas.calificaciones c
      JOIN encuestas.aplicaciones a ON a.uuid = c.aplicacion_uuid
      WHERE a.periodo = p_periodo
      GROUP BY dominio_id
    )
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$;
GRANT EXECUTE ON FUNCTION public.obtener_resultados_periodo(text) TO authenticated;

-- 3.6 Admin: promedio de duracion (Modulo 5 KPI). Agregado puro, sin
-- ninguna columna identificable.
CREATE OR REPLACE FUNCTION public.duracion_promedio_segundos()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN seguimiento.es_admin()
    THEN (SELECT round(avg(duracion_segundos)) FROM encuestas.aplicaciones)
    ELSE NULL::numeric
  END;
$$;
GRANT EXECUTE ON FUNCTION public.duracion_promedio_segundos() TO authenticated;

-- 3.7 Admin: historico de aplicaciones (Modulo 8).
CREATE OR REPLACE FUNCTION public.obtener_historico_aplicaciones()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT seguimiento.es_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN (
    SELECT jsonb_agg(jsonb_build_object('periodo', periodo, 'totalRespuestas', total, 'fecha', fecha_max))
    FROM (
      SELECT periodo, count(*) AS total, max(fecha_fin)::date AS fecha_max
      FROM encuestas.aplicaciones
      GROUP BY periodo
    ) sub
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.obtener_historico_aplicaciones() TO authenticated;

-- 3.8 Auditoria: registrar evento admin (llamada desde otras funciones
-- o directamente desde el cliente al exportar un reporte). No acepta
-- admin_id como parametro: siempre usa auth.uid() del llamante, para
-- que no se pueda falsificar a nombre de otro admin.
CREATE OR REPLACE FUNCTION auditoria.registrar_evento(p_accion text, p_detalle jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT seguimiento.es_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  INSERT INTO auditoria.eventos_admin (admin_id, accion, detalle)
  VALUES (auth.uid(), p_accion, p_detalle);
END;
$$;
GRANT EXECUTE ON FUNCTION auditoria.registrar_evento(text, jsonb) TO authenticated;

-- =====================================================================
-- AJUSTES PENDIENTES EN LOS ARCHIVOS DE MODULOS ANTERIORES
-- =====================================================================
-- Con este endurecimiento, dos llamadas que en Modulos 4/5 usaban
-- `.from(...).select(...)` directo deben cambiar a `.rpc(...)`:
--
-- colaborador.html (Modulo 4), funcion buscarColaborador():
--   ANTES: supabase.from('colaboradores').select('id, codigo, nombre, status').eq('codigo', codigo).maybeSingle()
--   AHORA: supabase.rpc('colaborador_buscar', { p_codigo: codigo }).maybeSingle()
--
-- admin-seguimiento.html (Modulo 5), funcion cargarColaboradores():
--   ANTES: supabase.schema('seguimiento').from('colaboradores').select('*')
--   AHORA: supabase.rpc('admin_obtener_seguimiento')
--
-- Y la importacion (confirmarImportacion) pasa de un INSERT directo a:
--   AHORA: supabase.rpc('admin_importar_colaboradores', { p_filas: filasParaImportar })
--
-- Todas las demas llamadas .rpc(...) que ya se dejaron en los Modulos
-- 5-8 (obtener_resultados_periodo, obtener_historico_aplicaciones,
-- duracion_promedio_segundos, marcar_acceso_colaborador) ya coinciden
-- con los nombres de funcion definidos aqui.
-- =====================================================================
