import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import * as XLSX from 'xlsx';

const htmlOriginal = fs.readFileSync('./admin-seguimiento.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>', '');
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

  // Verificamos independientemente contra la función pura expuesta en window
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

  // Reset filtro
  selDept.value = '';
  selDept.dispatchEvent(new window.Event('change'));
  await esperar(20);

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
  // 5) Recordatorio individual (demo) incrementa contador y deshabilita si "contesto"
  // ---------------------------------------------------------------
  const colaboradorPendiente = window.estado.colaboradores.find((c) => c.status !== 'contesto');
  const filaPendiente = doc.querySelector(`tr[data-id="${colaboradorPendiente.id}"] [data-accion="recordatorio"]`);
  assert(filaPendiente && !filaPendiente.disabled, 'Botón de recordatorio habilitado para colaborador pendiente');
  filaPendiente.click();
  await esperar(20);
  assert(colaboradorPendiente.recordatorios_enviados === 1, 'Recordatorio incrementa el contador en modo demo');

  const colaboradorContesto = window.estado.colaboradores.find((c) => c.status === 'contesto');
  const filaContesto = doc.querySelector(`tr[data-id="${colaboradorContesto.id}"] [data-accion="recordatorio"]`);
  assert(filaContesto && filaContesto.disabled, 'Botón de recordatorio deshabilitado para colaborador que ya contestó');

  // ---------------------------------------------------------------
  // 6) Exportación: función pura genera CSV correcto
  // ---------------------------------------------------------------
  const filasExport = window.construirFilasExportacion(window.estado.colaboradores.slice(0, 3));
  const csv = window.generarCSV(filasExport);
  const lineas = csv.split('\n');
  assert(lineas.length === 4, `CSV tiene encabezado + 3 filas (obtuvo ${lineas.length} líneas)`);
  assert(lineas[0].includes('Nombre') && lineas[0].includes('Departamento'), 'CSV incluye encabezados esperados');

  // Caso especial: nombre con coma debe ir entre comillas
  const csvEspecial = window.generarCSV([{ Nombre: 'García, Ana', Depto: 'X' }]);
  assert(csvEspecial.includes('"García, Ana"'), 'CSV escapa correctamente valores con coma');

  // ---------------------------------------------------------------
  // 7) Importación: parseo real de un archivo Excel generado con SheetJS
  // ---------------------------------------------------------------
  const filasCrudas = [
    { nombre: 'Prueba Import Uno', puesto: 'Analista', departamento: 'Calidad', email: 'p1@riverline.mx' },
    { Nombre: 'Prueba Import Dos', Puesto: 'Operador', Departamento: 'Producción', Email: 'p2@riverline.mx' }, // encabezados con mayúscula/acento
    { nombre: '', puesto: 'Sin depto', departamento: '', email: 'malo@riverline.mx' }, // fila inválida (sin nombre ni depto)
  ];
  const resultadoImport = window.normalizarFilasImportadas(filasCrudas, 2000);
  assert(resultadoImport.validas.length === 2, `normalizarFilasImportadas: 2 filas válidas (obtuvo ${resultadoImport.validas.length})`);
  assert(resultadoImport.invalidas.length === 1, `normalizarFilasImportadas: 1 fila inválida (obtuvo ${resultadoImport.invalidas.length})`);
  assert(resultadoImport.validas[0].codigo === '2000', 'Código autogenerado secuencial para fila sin código');
  assert(resultadoImport.validas[1].nombre === 'Prueba Import Dos', 'Detecta encabezado "Nombre" con mayúscula inicial');
  assert(resultadoImport.validas[1].departamento === 'Producción', 'Detecta encabezado "Departamento" con acento/mayúscula');

  // Ahora probamos el flujo completo de UI de importación con un archivo .xlsx
  // real. Usamos un único encabezado consistente por hoja (como sería un
  // Excel real); la detección de variantes de encabezado (mayúsculas/acentos)
  // ya quedó probada arriba de forma directa con normalizarFilasImportadas().
  const filasParaArchivo = [
    { nombre: 'Prueba Import Uno', puesto: 'Analista', departamento: 'Calidad', email: 'p1@riverline.mx' },
    { nombre: 'Prueba Import Dos', puesto: 'Operador', departamento: 'Producción', email: 'p2@riverline.mx' },
    { nombre: '', puesto: 'Sin depto', departamento: '', email: 'malo@riverline.mx' }, // fila inválida
  ];
  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(filasParaArchivo);
  XLSX.utils.book_append_sheet(libro, hoja, 'Hoja1');
  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

  doc.getElementById('btn-importar').click();
  await esperar(20);
  assert(!doc.getElementById('modal-importar').classList.contains('oculto'), 'Modal de importación se abre');

  // Simulamos la selección de archivo invocando directamente la función de
  // manejo (jsdom no permite construir un FileList real de forma sencilla).
  const archivoFalso = { name: 'prueba.xlsx' };
  const totalColaboradoresAntes = window.estado.colaboradores.length;
  // Sustituimos FileReader por una versión que entrega el buffer real generado arriba.
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
