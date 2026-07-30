-- =====================================================================
-- ANDAMIAJE DE PRUEBA: simula lo minimo que Supabase ya provee por
-- defecto (roles anon/authenticated/service_role, auth.uid(), auth.users)
-- para poder probar seguridad-rls-y-funciones.sql con Postgres real.
-- Esto NO se despliega en produccion: Supabase ya lo tiene integrado.
-- =====================================================================

-- Roles base de Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  -- authenticator: el rol SIN privilegios especiales con el que PostgREST
  -- (el motor detras de la API de Supabase) realmente abre la conexion,
  -- y desde el cual hace SET ROLE a anon/authenticated/service_role segun
  -- el JWT de cada solicitud. A diferencia de conectar como superusuario,
  -- este rol SI queda sujeto a RLS al cambiar de rol - por eso las pruebas
  -- se conectan como este usuario, no como "postgres".
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOLOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'prueba_local';
    ALTER ROLE authenticator LOGIN;
  END IF;
END $$;

GRANT anon, authenticated, service_role TO authenticator;

-- auth.uid(): en Supabase real, lee el JWT verificado. Aqui simulamos
-- leyendo una variable de sesion que las pruebas van a fijar con SET.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Esquemas de la aplicacion (version minima suficiente para probar RLS)
CREATE SCHEMA IF NOT EXISTS catalogo;
CREATE SCHEMA IF NOT EXISTS seguimiento;
CREATE SCHEMA IF NOT EXISTS encuestas;
GRANT USAGE ON SCHEMA catalogo, seguimiento, encuestas TO anon, authenticated, service_role;

CREATE TABLE catalogo.reactivos (id text PRIMARY KEY, texto text);
INSERT INTO catalogo.reactivos VALUES ('R1', 'reactivo de prueba');

CREATE TABLE seguimiento.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  puesto text,
  departamento text,
  email text,
  fecha_acceso timestamptz,
  fecha_encuesta timestamptz,
  status text NOT NULL DEFAULT 'no_contesto'
);

CREATE TABLE encuestas.aplicaciones (
  uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  duracion_segundos int
);

CREATE TABLE encuestas.respuestas (
  id bigserial PRIMARY KEY,
  aplicacion_uuid uuid REFERENCES encuestas.aplicaciones(uuid),
  reactivo_id text,
  calificacion_reactivo int
);

CREATE TABLE encuestas.calificaciones (
  aplicacion_uuid uuid REFERENCES encuestas.aplicaciones(uuid),
  dominio_id text,
  categoria_id text,
  puntaje_dominio numeric,
  nivel_riesgo text
);

-- Grants de tabla base: Supabase otorga estos privilegios "crudos" a los
-- roles por defecto (equivalente a lo que hace su migracion inicial);
-- la proteccion real la da RLS, no la ausencia de GRANT.
GRANT SELECT ON ALL TABLES IN SCHEMA catalogo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA seguimiento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA seguimiento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA encuestas TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA catalogo, seguimiento, encuestas TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA encuestas TO authenticated, anon, service_role;

-- Datos de prueba
INSERT INTO seguimiento.colaboradores (codigo, nombre, puesto, departamento, email, status)
VALUES ('1001', 'Colaborador Uno', 'Operador', 'Produccion', 'uno@riverline.mx', 'no_contesto');

INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'admin@riverline.mx');
