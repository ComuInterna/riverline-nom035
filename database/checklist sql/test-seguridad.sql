-- =====================================================================
-- PRUEBAS DE SEGURIDAD: cada bloque prueba una regla concreta.
-- Se imprime OK/FALLO segun el resultado. Correr con:
--   psql -d nom035_test -f test-seguridad.sql
-- =====================================================================
\set ON_ERROR_STOP off
\pset format aligned

-- (el admin de prueba ya se sembro en seed-admin.sql, ejecutado como postgres,
-- porque seguimiento.admins no tiene ninguna policy que permita INSERT)

\echo '--- PRUEBA 1: anon NO puede leer ninguna fila de seguimiento.colaboradores directamente ---'
-- Importante: con RLS habilitado y CERO policies, un SELECT no lanza un
-- error - simplemente regresa 0 filas. Por eso se cuenta el resultado en
-- vez de esperar una excepcion (un PERFORM aqui "pasaria" aunque RLS
-- estuviera ocultando todo, dando una falsa sensacion de seguridad).
SET ROLE anon;
DO $$
DECLARE v_conteo int;
BEGIN
  SELECT count(*) INTO v_conteo FROM seguimiento.colaboradores;
  IF v_conteo = 0 THEN
    RAISE NOTICE 'OK: anon ve 0 filas de seguimiento.colaboradores (RLS default-deny funciona)';
  ELSE
    RAISE NOTICE 'FALLO: anon pudo ver % filas de seguimiento.colaboradores directamente', v_conteo;
  END IF;
END $$;
RESET ROLE;

\echo ''
\echo '--- PRUEBA 1b: anon tampoco puede INSERTAR directamente en seguimiento.colaboradores ---'
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    INSERT INTO seguimiento.colaboradores (codigo, nombre, status) VALUES ('9999', 'Intento anon', 'no_contesto');
    RAISE NOTICE 'FALLO: anon pudo insertar directamente en seguimiento.colaboradores';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK: anon fue rechazado al intentar insertar directamente (%)', SQLERRM;
  END;
END $$;
RESET ROLE;

\echo ''
\echo '--- PRUEBA 2: anon SI puede usar colaborador_buscar() y solo ve id/nombre/status ---'
SET ROLE anon;
SELECT * FROM public.colaborador_buscar('1001');
RESET ROLE;

\echo ''
\echo '--- PRUEBA 3: anon NO puede leer ninguna fila de encuestas.respuestas directamente ---'
SET ROLE anon;
DO $$
DECLARE v_conteo int;
BEGIN
  SELECT count(*) INTO v_conteo FROM encuestas.respuestas;
  IF v_conteo = 0 THEN
    RAISE NOTICE 'OK: anon ve 0 filas de encuestas.respuestas (RLS default-deny funciona)';
  ELSE
    RAISE NOTICE 'FALLO: anon pudo ver % filas de encuestas.respuestas directamente', v_conteo;
  END IF;
END $$;
RESET ROLE;

\echo ''
\echo '--- PRUEBA 4: usuario autenticado SIN ser admin no puede usar admin_obtener_seguimiento() ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999'; -- no esta en seguimiento.admins
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.admin_obtener_seguimiento();
    RAISE NOTICE 'FALLO: usuario no-admin pudo leer el seguimiento completo';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK: usuario no-admin fue rechazado (%)', SQLERRM;
  END;
END $$;
RESET ROLE;
RESET request.jwt.claim.sub;

\echo ''
\echo '--- PRUEBA 5: usuario autenticado QUE SI es admin puede usar admin_obtener_seguimiento() ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; -- si esta en seguimiento.admins
SELECT codigo, nombre, status FROM public.admin_obtener_seguimiento();
RESET ROLE;
RESET request.jwt.claim.sub;

\echo ''
\echo '--- PRUEBA 6: admin puede importar colaboradores via RPC, con deduplicacion por email ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT * FROM public.admin_importar_colaboradores(
  '[
    {"nombre":"Prueba Import A","puesto":"Analista","departamento":"Calidad","email":"nuevo1@riverline.mx"},
    {"nombre":"Prueba Import B","puesto":"Operador","departamento":"Logistica","email":"uno@riverline.mx"}
  ]'::jsonb
);
-- El segundo (email "uno@riverline.mx") ya existe -> debe omitirse
RESET ROLE;
RESET request.jwt.claim.sub;

\echo ''
\echo '--- PRUEBA 7: el evento de importacion quedo registrado en auditoria ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT accion, detalle, admin_id FROM auditoria.eventos_admin ORDER BY id DESC LIMIT 1;
RESET ROLE;
RESET request.jwt.claim.sub;

\echo ''
\echo '--- PRUEBA 8: usuario NO admin no puede leer auditoria.eventos_admin ---'
SET ROLE authenticated;
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
DO $$
DECLARE v_conteo int;
BEGIN
  SELECT count(*) INTO v_conteo FROM auditoria.eventos_admin;
  IF v_conteo = 0 THEN
    RAISE NOTICE 'OK: usuario no-admin ve 0 filas de auditoria (RLS oculta las filas, sin lanzar error)';
  ELSE
    RAISE NOTICE 'FALLO: usuario no-admin pudo ver % filas de auditoria', v_conteo;
  END IF;
END $$;
RESET ROLE;
RESET request.jwt.claim.sub;

\echo ''
\echo '--- PRUEBA 9: registrar_evento() nunca permite falsificar admin_id ---'
-- La funcion no acepta admin_id como parametro (usa auth.uid() del llamante),
-- asi que no hay forma de que un admin registre un evento a nombre de otro.
SELECT proname, pronargs FROM pg_proc WHERE proname = 'registrar_evento';

\echo ''
\echo '--- PRUEBA 10: service_role (Edge Functions) SI puede leer todo, RLS no le aplica ---'
SET ROLE service_role;
SELECT count(*) AS colaboradores_visibles_service_role FROM seguimiento.colaboradores;
SELECT count(*) AS respuestas_visibles_service_role FROM encuestas.respuestas;
RESET ROLE;

\echo ''
\echo '--- PRUEBA 11: catalogo es de lectura publica para anon (informacion normativa, no sensible) ---'
SET ROLE anon;
SELECT * FROM catalogo.reactivos;
RESET ROLE;
