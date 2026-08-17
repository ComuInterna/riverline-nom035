import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import * as XLSX from 'xlsx';

const htmlOriginal = fs.readFileSync('./admin-seguimiento.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>', '')
  .replace("const SUPABASE_URL = 'https://beywoewggsbtrmjilcyg.supabase.co';", "const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';");
fs.writeFileSync('./admin-seguimiento.test-copy.html', html);

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

function crearVentana() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => console.error('[jsdomError]', e.message));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: undefined,
    url: 'https://example.com/admin-seguimiento.html',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      // Inyectar XLSX real ANTES de que el <script> inline se ejecute.
      window.XLSX = XLSX;
    },
  });
  return dom.window;
}

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function correr() {
  const window = crearVentana();
  await esperar(250); // deja correr iniciar() (async)
  const doc = window.document;

  // ---------------------------------------------------------------
  // 1) KPIs iniciales calculados correctamente contra el padrón demo
  // ---------------------------------------------------------------
  const kpiValores = [...doc.querySelectorAll('.kpi-valor')].map((el) => el.textContent);
  assert(kpiValores[0] === '47', `Total colaboradores = 47 (obtuvo ${kpiValores[0]})`);

  const kpiCalculado = window.calcularKPIs(window.estado.colaboradores, window.estado.tiempoPromedioSegundos);
  assert(kpiCalculado.total === 47, 'calcularKPIs: total = 47');
  assert(kpiCalculado.contestaron + kpiCalculado.pendientes === 47, 'calcularKPIs: contestaron + pendientes = total');
  assert(kpiCalculado.porcentaje === Math.round((kpiCalculado.contestaron / 47) * 100), 'calcularKPIs: porcentaje correcto');
  console.log(`  (info) contestaron=${kpiCalculado.contestaron} enProceso=${kpiCalculado.enProceso} noContesto=${kpiCalculado.noContesto}`);

  // ---------------------------------------------------------------
  // 2) Filtro por departamento reduce correctamente la tabla
  // ---------------------------------------------------------------
  const selDept = doc.getElementById('filtro-departamento');
  const opcionesDept = [...selDept.options].map((o) => o.value).filter(Boolean);
  assert(opcionesDept.length === 5, `5 departamentos únicos en filtro (obtuvo ${opcionesDept.length})`);

  const deptElegido = opcionesDept[0];
  selDept.value = deptElegido;
  selDept.dispatchEvent(new window.Event('change'));
  await esperar(20);
  const filasVisibles = doc.querySelectorAll('table.tabla-seguimiento tbody tr');
  const esperadas = window.estado.colaboradores.filter((c) => c.departamento === deptElegido).length;
  assert(filasVisibles.length === esperadas, `Filtro por departamento "${deptElegido}": ${filasVisibles.length} filas (esperado ${esperadas})`);

  selDept.value = '';
  selDept.dispatchEvent(new window.Event('change'));
  await esperar(20);

  // ---------------------------------------------------------------
  // 2b) Filtro por centro de trabajo
  // ---------------------------------------------------------------
  const selCentro = doc.getElementById('filtro-centro');
  const opcionesCentro = [...selCentro.options].map((o) => o.value).filter(Boolean);
  assert(opcionesCentro.length === 15, `15 centros de trabajo en el filtro (obtuvo ${opcionesCentro.length})`);
  assert(opcionesCentro.includes('CEDIS') && opcionesCentro.includes('TOLUCA'), 'El filtro incluye los centros reales (CEDIS, Toluca, etc.)');

  selCentro.value = 'CEDIS';
  selCentro.dispatchEvent(new window.Event('change'));
  await esperar(20);
  const filasCedis = doc.querySelectorAll('table.tabla-seguimiento tbody tr');
  const esperadasCedis = window.estado.colaboradores.filter((c) => c.centro_trabajo === 'CEDIS').length;
  assert(filasCedis.length === esperadasCedis, `Filtro "CEDIS": ${filasCedis.length} filas (esperado ${esperadasCedis})`);
  assert([...filasCedis].every((tr) => tr.textContent.includes('CEDIS')), 'Todas las filas visibles muestran "CEDIS" como centro');
  selCentro.value = '';
  selCentro.dispatchEvent(new window.Event('change'));
  await esperar(20);

  // ---------------------------------------------------------------
  // 2c) Badges de guía(s) y regla de negocio real por plantilla:
  //     CEDIS (42 personas) y City Center (15) -> Guía II; el resto
  //     de los centros (<15 personas) -> solo Guía I.
  // ---------------------------------------------------------------
  const colaboradorCedis = window.estado.colaboradores.find((c) => c.centro_trabajo === 'CEDIS');
  assert(colaboradorCedis.status === null && colaboradorCedis.status_guia2 !== null,
    'Colaborador de CEDIS SOLO tiene status de Guía II (no Guía III ni Guía I por default)');
  assert(colaboradorCedis.status_guia1 === null, 'Colaborador de CEDIS no tiene Guía I asignada por default (es manual)');

  const colaboradorToluca = window.estado.colaboradores.find((c) => c.centro_trabajo === 'TOLUCA');
  assert(colaboradorToluca.status === null && colaboradorToluca.status_guia2 === null && colaboradorToluca.status_guia1 !== null,
    'Colaborador de Toluca (<15 personas) SOLO tiene status de Guía I (automática, sin Guía II/III)');

  const filaCedisHTML = doc.querySelector(`tr[data-id="${colaboradorCedis.id}"]`).innerHTML;
  assert(filaCedisHTML.includes('G2:') && !filaCedisHTML.includes('G1:'), 'La fila de un colaborador de CEDIS muestra badge G2 y NO badge G1 (por default)');
  const filaTolucaHTML = doc.querySelector(`tr[data-id="${colaboradorToluca.id}"]`).innerHTML;
  assert(filaTolucaHTML.includes('G1:') && !filaTolucaHTML.includes('G2:') && !filaTolucaHTML.includes('G3:'), 'La fila de un colaborador de Toluca muestra SOLO badge G1');

  // ---------------------------------------------------------------
  // 2d) Asignación manual de Guía I: solo disponible en centros con
  //     Guía II/III activa (CEDIS/City Center), revertible mientras
  //     no se haya iniciado.
  // ---------------------------------------------------------------
  const filaCedisEl = doc.querySelector(`tr[data-id="${colaboradorCedis.id}"]`);
  const btnAsignarCedis = filaCedisEl.querySelector('[data-accion="asignar-guia1"]');
  assert(btnAsignarCedis !== null, 'Colaborador de CEDIS (Guía II) muestra botón "Asignar G1"');

  const filaTolucaEl = doc.querySelector(`tr[data-id="${colaboradorToluca.id}"]`);
  assert(filaTolucaEl.querySelector('[data-accion="asignar-guia1"]') === null && filaTolucaEl.querySelector('[data-accion="quitar-guia1"]') === null,
    'Colaborador de Toluca (solo Guía I automática) NO muestra botón de asignación manual');

  btnAsignarCedis.click();
  await esperar(20);
  assert(colaboradorCedis.status_guia1 === 'no_contesto', 'Tras "Asignar G1", el colaborador de CEDIS queda con status_guia1=no_contesto');
  const filaCedisEl2 = doc.querySelector(`tr[data-id="${colaboradorCedis.id}"]`);
  assert(filaCedisEl2.innerHTML.includes('G1:'), 'La fila ahora muestra el badge G1 tras la asignación manual');
  const btnQuitarCedis = filaCedisEl2.querySelector('[data-accion="quitar-guia1"]');
  assert(btnQuitarCedis !== null, 'Ahora aparece el botón "Quitar G1" (todavía no contestada)');

  btnQuitarCedis.click();
  await esperar(20);
  assert(colaboradorCedis.status_guia1 === null, 'Tras "Quitar G1", el colaborador de CEDIS vuelve a status_guia1=null');
  const filaCedisEl3 = doc.querySelector(`tr[data-id="${colaboradorCedis.id}"]`);
  assert(!filaCedisEl3.innerHTML.includes('G1:'), 'El badge G1 desaparece de nuevo');
  assert(filaCedisEl3.querySelector('[data-accion="asignar-guia1"]') !== null, 'El botón vuelve a ser "Asignar G1"');

  // ---------------------------------------------------------------
  // 3) Búsqueda por nombre
  // ---------------------------------------------------------------
  const inputBusqueda = doc.getElementById('filtro-busqueda');
  inputBusqueda.value = 'ana';
  inputBusqueda.dispatchEvent(new window.Event('input'));
  await esperar(20);
  const filasBusqueda = [...doc.querySelectorAll('table.tabla-seguimiento tbody tr td:first-child')];
  const todasContienenAna = filasBusqueda.every((td) => td.textContent.toLowerCase().includes('ana'));
  assert(filasBusqueda.length > 0 && todasContienenAna, `Búsqueda "ana" filtra correctamente (${filasBusqueda.length} resultados)`);
  inputBusqueda.value = '';
  inputBusqueda.dispatchEvent(new window.Event('input'));
  await esperar(20);

  // ---------------------------------------------------------------
  // 4) Ordenar por columna (la tabla ya inicia ordenada asc por nombre;
  //    un click sobre la misma columna invierte a desc, otro click regresa a asc)
  // ---------------------------------------------------------------
  const nombresIniciales = [...doc.querySelectorAll('table.tabla-seguimiento tbody tr td:first-child')].map((td) => td.textContent);
  const ascEsperado = [...nombresIniciales].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert(JSON.stringify(nombresIniciales) === JSON.stringify(ascEsperado), 'Tabla inicia ordenada ascendente por nombre (default)');

  const thNombre = doc.querySelector('th[data-col="nombre"]');
  thNombre.click(); // misma columna -> invierte a desc
  await esperar(20);
  const nombresDesc = [...doc.querySelectorAll('table.tabla-seguimiento tbody tr td:first-child')].map((td) => td.textContent);
  assert(JSON.stringify(nombresDesc) === JSON.stringify([...ascEsperado].reverse()), 'Click sobre columna ya ordenada invierte a descendente');

  thNombre.click(); // vuelve a asc
  await esperar(20);
  const nombresAscDeNuevo = [...doc.querySelectorAll('table.tabla-seguimiento tbody tr td:first-child')].map((td) => td.textContent);
  assert(JSON.stringify(nombresAscDeNuevo) === JSON.stringify(ascEsperado), 'Segundo click regresa a orden ascendente');

  // ---------------------------------------------------------------
  // 5) Recordatorio individual (demo) incrementa contador y deshabilita
  //    solo cuando NO le queda ninguna guía aplicable pendiente
  // ---------------------------------------------------------------
  const colaboradorPendiente = window.estado.colaboradores.find((c) => window.tienePendientes(c));
  const filaPendiente = doc.querySelector(`tr[data-id="${colaboradorPendiente.id}"] [data-accion="recordatorio"]`);
  assert(filaPendiente && !filaPendiente.disabled, 'Botón de recordatorio habilitado para colaborador con alguna guía pendiente');
  filaPendiente.click();
  await esperar(20);
  assert(colaboradorPendiente.recordatorios_enviados === 1, 'Recordatorio incrementa el contador en modo demo');

  const colaboradorSinPendientes = window.estado.colaboradores.find((c) => !window.tienePendientes(c));
  const filaSinPendientes = doc.querySelector(`tr[data-id="${colaboradorSinPendientes.id}"] [data-accion="recordatorio"]`);
  assert(filaSinPendientes && filaSinPendientes.disabled, 'Botón de recordatorio deshabilitado cuando ninguna guía aplicable está pendiente');

  // ---------------------------------------------------------------
  // 6) Exportación: función pura genera CSV correcto
  // ---------------------------------------------------------------
  const filasExport = window.construirFilasExportacion(window.estado.colaboradores.slice(0, 3));
  const csv = window.generarCSV(filasExport);
  const lineas = csv.split('\n');
  assert(lineas.length === 4, `CSV tiene encabezado + 3 filas (obtuvo ${lineas.length} líneas)`);
  assert(lineas[0].includes('Nombre') && lineas[0].includes('Departamento'), 'CSV incluye encabezados esperados');

  const csvEspecial = window.generarCSV([{ Nombre: 'García, Ana', Depto: 'X' }]);
  assert(csvEspecial.includes('"García, Ana"'), 'CSV escapa correctamente valores con coma');

  // ---------------------------------------------------------------
  // 7) Importación: parseo real, con "Centro de Trabajo" obligatorio y
  //    la regla de negocio real por plantilla (CEDIS/City Center =
  //    Guía II; el resto = solo Guía I).
  // ---------------------------------------------------------------
  const filasCrudas = [
    { nombre: 'Prueba Import Uno', puesto: 'Analista', departamento: 'Calidad', 'centro de trabajo': 'CEDIS', email: 'p1@riverline.mx' },
    { Nombre: 'Prueba Import Dos', Puesto: 'Operador', Departamento: 'Producción', 'Centro de Trabajo': 'toluca', Email: 'p2@riverline.mx' }, // encabezados con mayúscula/acento, centro en minúsculas
    { nombre: 'Prueba Import Tres', puesto: 'Analista', departamento: 'Ventas', 'centro de trabajo': 'City Center', email: 'p3@riverline.mx' }, // centro con guia_2
    { nombre: '', puesto: 'Sin depto', departamento: '', 'centro de trabajo': 'Toluca', email: 'malo@riverline.mx' }, // fila inválida (sin nombre ni depto)
    { nombre: 'Prueba Sin Centro', puesto: 'Analista', departamento: 'Calidad', email: 'sincentro@riverline.mx' }, // sin centro de trabajo
    { nombre: 'Prueba Centro Falso', puesto: 'Analista', departamento: 'Calidad', 'centro de trabajo': 'Ciudad Inventada', email: 'falso@riverline.mx' }, // centro no reconocido
  ];
  const resultadoImport = window.normalizarFilasImportadas(filasCrudas, 2000);
  assert(resultadoImport.validas.length === 3, `normalizarFilasImportadas: 3 filas válidas (obtuvo ${resultadoImport.validas.length})`);
  assert(resultadoImport.invalidas.length === 3, `normalizarFilasImportadas: 3 filas inválidas (obtuvo ${resultadoImport.invalidas.length})`);
  assert(resultadoImport.validas[0].codigo === '2000', 'Código autogenerado secuencial para fila sin código');
  assert(resultadoImport.validas[1].nombre === 'Prueba Import Dos', 'Detecta encabezado "Nombre" con mayúscula inicial');
  assert(resultadoImport.validas[1].departamento === 'Producción', 'Detecta encabezado "Departamento" con acento/mayúscula');
  assert(resultadoImport.validas[1].centro_trabajo === 'TOLUCA', 'Centro "toluca" (minúsculas) se resuelve al id TOLUCA');
  assert(resultadoImport.invalidas.some((f) => f.motivo.includes('Centro de Trabajo')), 'Fila sin centro de trabajo se marca inválida con motivo claro');
  assert(resultadoImport.invalidas.some((f) => f.motivo.includes('Ciudad Inventada')), 'Centro no reconocido se marca inválido, mencionando el valor recibido');

  // Verificar que status/status_guia1/status_guia2 se inicializan según
  // las guías activas reales del centro (CEDIS/City Center = Guía II,
  // Toluca = solo Guía I).
  const filaCedisImport = resultadoImport.validas.find((f) => f.centro_trabajo === 'CEDIS');
  assert(filaCedisImport.status === null && filaCedisImport.status_guia1 === null && filaCedisImport.status_guia2 === 'no_contesto',
    'CEDIS (Guía II): status=null, status_guia1=null, status_guia2=no_contesto');
  const filaTolucaImport = resultadoImport.validas.find((f) => f.centro_trabajo === 'TOLUCA');
  assert(filaTolucaImport.status === null && filaTolucaImport.status_guia1 === 'no_contesto' && filaTolucaImport.status_guia2 === null,
    'Toluca (solo Guía I): status=null, status_guia1=no_contesto, status_guia2=null');
  const filaCityCenterImport = resultadoImport.validas.find((f) => f.centro_trabajo === 'CITY_CENTER');
  assert(filaCityCenterImport.status === null && filaCityCenterImport.status_guia1 === null && filaCityCenterImport.status_guia2 === 'no_contesto',
    'City Center (Guía II): status=null, status_guia1=null, status_guia2=no_contesto');

  // Ahora probamos el flujo completo de UI de importación con un archivo .xlsx real.
  const filasParaArchivo = [
    { nombre: 'Prueba Import Uno', puesto: 'Analista', departamento: 'Calidad', 'centro de trabajo': 'CEDIS', email: 'p1@riverline.mx' },
    { nombre: 'Prueba Import Dos', puesto: 'Operador', departamento: 'Producción', 'centro de trabajo': 'Toluca', email: 'p2@riverline.mx' },
    { nombre: '', puesto: 'Sin depto', departamento: '', 'centro de trabajo': 'Toluca', email: 'malo@riverline.mx' }, // fila inválida
  ];
  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(filasParaArchivo);
  XLSX.utils.book_append_sheet(libro, hoja, 'Hoja1');
  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

  doc.getElementById('btn-importar').click();
  await esperar(20);
  assert(!doc.getElementById('modal-importar').classList.contains('oculto'), 'Modal de importación se abre');

  const archivoFalso = { name: 'prueba.xlsx' };
  const totalColaboradoresAntes = window.estado.colaboradores.length;
  const OriginalFileReader = window.FileReader;
  window.FileReader = function () {
    return {
      readAsArrayBuffer() {
        this.onload({ target: { result: buffer } });
      },
    };
  };
  window.manejarArchivoSeleccionado(archivoFalso);
  await esperar(20);
  window.FileReader = OriginalFileReader;

  const btnConfirmar = doc.getElementById('btn-confirmar-importar');
  assert(!btnConfirmar.disabled, 'Botón "Importar" se habilita tras parsear archivo válido con 2 filas buenas');
  const previewTexto = doc.getElementById('preview-importacion').textContent;
  assert(previewTexto.includes('2') && previewTexto.includes('1'), 'Preview muestra conteo de válidas e inválidas');

  btnConfirmar.click();
  await esperar(50);
  assert(window.estado.colaboradores.length === totalColaboradoresAntes + 2, `Importación agrega 2 colaboradores nuevos (total ahora ${window.estado.colaboradores.length})`);
  assert(doc.getElementById('modal-importar').classList.contains('oculto'), 'Modal se cierra tras importar');

  // ---------------------------------------------------------------
  // Resumen
  // ---------------------------------------------------------------
  console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
  process.exit(fallidas > 0 ? 1 : 0);
}

correr().catch((e) => {
  console.error('\u2718 ERROR INESPERADO:', e.stack || e.message);
  process.exit(1);
});
