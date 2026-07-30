# Módulo 9 — Checklist de seguridad, auditoría y respaldos

Este módulo tiene dos partes: **código ya escrito y probado** (abajo) y
**configuración manual del proyecto Supabase** que nadie puede automatizar
por ti (la lista de verificación al final). Ambas son necesarias antes de
producción.

---

## 1. Lo que ya quedó implementado y probado

Archivo: `seguridad-rls-y-funciones.sql`

- **RLS default-deny** en `seguimiento.colaboradores`, `encuestas.aplicaciones`,
  `encuestas.respuestas` y `encuestas.calificaciones`: se activa RLS sin
  ninguna policy, así que ni `anon` ni `authenticated` pueden leer o escribir
  una sola fila directamente — todo pasa por funciones RPC.
- **Tabla `seguimiento.admins`**: define quién es administrador. Nadie
  (ni siquiera un admin) puede leerla o escribirla desde el cliente; se
  gestiona manualmente desde Supabase Studio con la `service_role` key.
- **Función `seguimiento.es_admin()`**: la usan todas las funciones RPC
  de administrador para verificar permisos antes de regresar cualquier dato.
- **7 funciones RPC `SECURITY DEFINER`** que reemplazan todo acceso directo:
  - `colaborador_buscar(codigo)` — pública, regresa solo id/nombre/status.
  - `marcar_acceso_colaborador(id)` — pública.
  - `admin_obtener_seguimiento()` — solo admin.
  - `admin_importar_colaboradores(filas)` — solo admin, deduplica por email.
  - `obtener_resultados_periodo(periodo)` — solo admin, agregado anónimo.
  - `duracion_promedio_segundos()` — solo admin, agregado anónimo.
  - `obtener_historico_aplicaciones()` — solo admin.
- **`auditoria.eventos_admin`**: registra qué admin hizo qué acción y cuándo
  (ej. importar colaboradores). Nunca registra eventos de colaborador, para
  no crear un log correlacionable con el momento en que alguien contestó.
- **`colaborador.html`** y **`admin-seguimiento.html`** ya se actualizaron
  para llamar estas funciones en vez de tocar las tablas directamente.

### Cómo lo probé

Instalé PostgreSQL real en este entorno y reproduje las piezas clave de
Supabase (roles `anon`/`authenticated`/`service_role`, la función `auth.uid()`,
y — lo más importante — un rol `authenticator` sin privilegios de
superusuario, igual al que usa PostgREST, porque probar con una sesión de
superusuario da una falsa sensación de seguridad: **un superusuario
conservaba acceso incluso después de `SET ROLE anon`**, así que las primeras
pruebas daban falsos negativos hasta que corregí el arnés de pruebas.

11 escenarios verificados de punta a punta, entre ellos:
- Un colaborador anónimo no puede leer ni insertar directamente en
  `seguimiento.colaboradores`, pero sí puede usar `colaborador_buscar()`.
- Un usuario autenticado que **no** es admin es rechazado explícitamente
  (`RAISE EXCEPTION`) al intentar `admin_obtener_seguimiento()`.
- Un admin real sí puede importar colaboradores, y el evento queda
  registrado en `auditoria.eventos_admin` con su `admin_id` real — nunca
  falsificable, porque la función usa `auth.uid()` del llamante, no un
  parámetro.
- Un no-admin ve **0 filas** de la tabla de auditoría (no un error: RLS
  las oculta silenciosamente, que es el comportamiento correcto a probar).
- `service_role` (el que usan las Edge Functions) sí ve todo, como debe ser.

---

## 2. Configuración manual pendiente en el dashboard de Supabase

Esto **no se puede dejar en código** — hay que configurarlo una vez, a mano,
en cada proyecto Supabase (desarrollo y producción):

- [ ] **Sesiones y JWT**: en *Authentication → Sessions*, reducir el tiempo
      de expiración del JWT de colaborador (por defecto suele ser largo);
      para una encuesta de 10-15 minutos, 1 hora es más que suficiente.
- [ ] **Point-in-Time Recovery (PITR)**: en *Database → Backups*, activar
      PITR (requiere plan Pro o superior). Sin esto, solo tienes el backup
      diario automático de Supabase, sin granularidad de minuto a minuto.
- [ ] **Respaldo exportado adicional**: aunque Supabase ya respalda,
      programa una exportación semanal completa (`pg_dump`) hacia un
      bucket de Storage o almacenamiento externo, como red de seguridad
      independiente del proveedor.
- [ ] **MFA para cuentas de administrador**: en *Authentication →
      Providers*, considera exigir un segundo factor para las cuentas
      que están en `seguimiento.admins` — son las únicas con acceso a
      datos de seguimiento con nombre y puesto.
- [ ] **Alertas de uso anómalo**: revisar periódicamente
      `auditoria.eventos_admin` (o configurar una alerta) por patrones
      raros — ej. una exportación masiva fuera de horario laboral.
- [ ] **Rotación de la `service_role` key**: solo debe vivir en las
      Edge Functions y nunca en código de cliente; rótala si alguna vez
      se expuso por accidente (ej. subida a un repositorio público).
- [ ] **HTTPS**: automático en Supabase y en cualquier hosting está bien
      configurado (Vercel, Netlify, etc.) — no requiere acción, pero
      confírmalo si usas un dominio propio con proxy intermedio.
- [ ] **Revisión del checklist de RLS de Supabase**: Supabase tiene un
      linter de seguridad integrado (*Database → Linter*) que señala
      tablas con RLS desactivado o políticas permisivas — correrlo una
      vez más después de cargar `seguridad-rls-y-funciones.sql`.

---

## 3. Antes de producción (resumen)

1. Cargar `catalogo-nom035-guia3.sql` (Módulo 2).
2. Cargar `seguridad-rls-y-funciones.sql` (este módulo).
3. Sembrar manualmente al menos un admin en `seguimiento.admins` desde
   Supabase Studio (con la cuenta de Auth que va a administrar la
   plataforma).
4. Marcar los checkboxes de la sección 2 en el dashboard.
5. Correr el linter de seguridad de Supabase una vez más.
