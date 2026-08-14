// =====================================================================
// admin-reportes.test.mjs  (Test A)
// ---------------------------------------------------------------------
// Pruebas de admin-reportes.html multi-centro. Refleja la regla de
// negocio real por plantilla: CEDIS (42) y City Center (15) -> Guia II;
// las otras 13 unidades (<15 personas) solo tienen Guia I activa
// (individual) y por lo tanto NO aparecen en la lista de centros de
// este modulo (no hay nada anonimo que reportar ahi). Las librerias de
// documentos (pdfmake/xlsx/docx/pptxgenjs) se simulan con stubs
// livianos -- solo interesa que la UI arme los datos correctos y llame
// a cada libreria con la forma esperada. La generacion de binarios
// REALES se prueba aparte en admin-reportes.test-libs.mjs (Test B).
// =====================================================================

import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const htmlOriginal = fs.readFileSync('./admin-reportes.html', 'utf-8');

function construirHtml() {
  return htmlOriginal
    .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
    .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
    .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
    .replace('<script src="https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/pdfmake.min.js"></script>', '<script>window.pdfMake = { createPdf: function(def){ window.__ultimoDocDefinicion = def; return { download: function(name){ window.__ultimoArchivo = name; } }; } };</script>')
    .replace('<script src="https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/vfs_fonts.js"></script>', '')
    .replace('<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>', `<script>
      window.XLSX = {
        utils: {
          book_new: function(){ return { sheets: [] }; },
          json_to_sheet: function(rows){ return { rows: rows }; },
          book_append_sheet: function(libro, hoja, nombre){ libro.sheets.push({ nombre: nombre, hoja: hoja }); },
        },
        writeFile: function(libro, nombre){ window.__ultimoLibro = libro; window.__ultimoArchivoXlsx = nombre; },
      };
    </script>`)
    .replace('<script src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js"></script>', `<script>
      function ParagraphStub(opts){ this.opts = opts; }
      window.docx = {
        Document: function(opts){ this.opts = opts; window.__ultimoDocxDoc = opts; },
        Packer: { toBlob: function(){ return Promise.resolve(new Blob(['x'])); } },
        Paragraph: ParagraphStub, TextRun: function(o){ return o; },
        HeadingLevel: { TITLE: 'TITLE', HEADING_1: 'H1', HEADING_2: 'H2', HEADING_3: 'H3' },
        Table: function(opts){ this.opts = opts; }, TableRow: function(opts){ this.opts = opts; },
        TableCell: function(opts){ this.opts = opts; }, WidthType: { PERCENTAGE: 'pct' },
        PageBreak: function(){},
      };
    </script>`)
    .replace('<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>', `<script>
      function SlideStub(){ this.calls = []; }
      SlideStub.prototype.addText = function(){ this.calls.push('addText'); };
      SlideStub.prototype.addChart = function(){ this.calls.push('addChart'); };
      function PresStub(){ this.slides = []; }
      PresStub.prototype.defineLayout = function(){};
      PresStub.prototype.addSlide = function(){ const s = new SlideStub(); this.slides.push(s); return s; };
      PresStub.prototype.writeFile = function(opts){ window.__ultimoPptx = opts; window.__totalSlides = this.slides.length; };
      Object.defineProperty(PresStub.prototype, 'ChartType', { get: function(){ return { bar: 'bar' }; } });
      window.PptxGenJS = PresStub;
    </script>`)
    .replace("const SUPABASE_URL = 'https://beywoewggsbtrmjilcyg.supabase.co';", "const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';");
}

function crearVentana(html) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/createObjectURL/.test(e.message)) console.error('[jsdomError]', e.message);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: undefined,
    url: 'https://example.com/admin-reportes.html', pretendToBeVisual: true, virtualConsole,
  });
  return dom.window;
}
function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

async function marcarYcargar(window, ids) {
  const doc = window.document;
  ids.forEach((id) => { doc.querySelector('#lista-centros input[value="' + id + '"]').checked = true; });
  doc.getElementById('btn-cargar-centros').dispatchEvent(new window.Event('click'));
  await esperar(300);
}

async function escenario1_soloCentrosConGuiaAnonima() {
  console.log('\n--- Escenario 1: solo CEDIS y City Center aparecen en la lista (los otros 13 solo tienen Guia I) ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  const doc = window.document;
  const checkboxes = doc.querySelectorAll('#lista-centros input[type="checkbox"]');
  assert(checkboxes.length === 2, 'solo hay 2 checkboxes de centro (obtenido: ' + checkboxes.length + ')');
  const valores = Array.from(checkboxes).map((el) => el.value).sort();
  assert(JSON.stringify(valores) === JSON.stringify(['CEDIS', 'CITY_CENTER']), 'los 2 centros son CEDIS y City Center');
  assert(/13.*Guia I/.test(doc.getElementById('nota-centros-solo-guia1').textContent), 'hay una nota explicando por que faltan los otros 13 centros');
  assert(doc.getElementById('btn-pdf-ejecutivo').disabled === true, 'los botones de descarga arrancan deshabilitados');
}

async function escenario2_sinSeleccion() {
  console.log('\n--- Escenario 2: cargar sin seleccionar ningun centro ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  window.document.getElementById('btn-cargar-centros').dispatchEvent(new window.Event('click'));
  await esperar(150);
  assert(window.document.getElementById('btn-pdf-ejecutivo').disabled === true, 'los botones siguen deshabilitados sin seleccion');
  assert(/Selecciona al menos un centro/.test(window.document.getElementById('resumen-periodo').textContent), 'se muestra el mensaje de error correspondiente');
}

async function escenario3_dosCentrosGuia2() {
  console.log('\n--- Escenario 3: cargar CEDIS y City Center juntos (ambos Guia II) ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  await marcarYcargar(window, ['CEDIS', 'CITY_CENTER']);
  const doc = window.document;

  assert(JSON.stringify(window.estado.centrosSeleccionados.sort()) === JSON.stringify(['CEDIS', 'CITY_CENTER'].sort()), 'estado.centrosSeleccionados tiene ambos centros');
  assert(doc.querySelectorAll('.tabla-resumen-centros tbody tr').length === 2, 'la tabla de resumen tiene 2 filas');
  assert(doc.getElementById('btn-pdf-ejecutivo').disabled === false, 'los botones de descarga se habilitan tras cargar');
}

async function escenario4_pdfEjecutivoYTecnico() {
  console.log('\n--- Escenario 4: generar PDF ejecutivo y tecnico con los 2 centros ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  await marcarYcargar(window, ['CEDIS', 'CITY_CENTER']);
  const doc = window.document;

  doc.getElementById('btn-pdf-ejecutivo').dispatchEvent(new window.Event('click'));
  await esperar(150);
  assert(window.__ultimoArchivo === 'reporte-ejecutivo-nom035-2centros-2026-Q3.pdf', 'nombre de archivo PDF ejecutivo incluye "2centros"');
  const bloquesEjecutivo = window.__ultimoDocDefinicion.content.length;

  doc.getElementById('btn-pdf-tecnico').dispatchEvent(new window.Event('click'));
  await esperar(150);
  assert(window.__ultimoArchivo === 'reporte-tecnico-nom035-2centros-2026-Q3.pdf', 'nombre de archivo PDF tecnico incluye "2centros"');
  assert(window.__ultimoDocDefinicion.content.length > bloquesEjecutivo, 'el PDF tecnico tiene mas contenido que el ejecutivo (objetivo/metodologia/anexos)');
}

async function escenario5_excelHojasPorCentro() {
  console.log('\n--- Escenario 5: Excel genera hojas por centro con nombre correcto ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  await marcarYcargar(window, ['CEDIS', 'CITY_CENTER']);
  window.document.getElementById('btn-excel').dispatchEvent(new window.Event('click'));
  await esperar(150);

  const nombresHojas = window.__ultimoLibro.sheets.map((s) => s.nombre);
  assert(nombresHojas[0] === 'Resumen', 'primera hoja es "Resumen"');
  assert(nombresHojas.includes('Cat CEDIS') && nombresHojas.includes('Dom CEDIS') && nombresHojas.includes('Plan CEDIS'), 'hojas de CEDIS presentes');
  assert(nombresHojas.includes('Cat City Center') && nombresHojas.includes('Dom City Center') && nombresHojas.includes('Plan City Center'), 'hojas de City Center presentes');
  assert(window.__ultimoLibro.sheets[0].hoja.rows.length === 2, 'hoja Resumen tiene una fila por centro (2)');
}

async function escenario6_powerpointSlidesPorCentro() {
  console.log('\n--- Escenario 6: PowerPoint genera bloque de slides por centro ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  await marcarYcargar(window, ['CEDIS', 'CITY_CENTER']);
  window.document.getElementById('btn-ppt').dispatchEvent(new window.Event('click'));
  await esperar(150);

  // 2 slides compartidos (portada + objetivo) + 6 slides por centro x 2 centros.
  assert(window.__totalSlides === 14, 'total de slides es 14 (2 compartidos + 6 x 2 centros), obtenido: ' + window.__totalSlides);
  assert(window.__ultimoPptx.fileName === 'reporte-ejecutivo-nom035-2centros-2026-Q3.pptx', 'nombre de archivo pptx incluye "2centros"');
}

async function escenario7_unSoloCentroSufijoSinNumero() {
  console.log('\n--- Escenario 7: con un solo centro, el sufijo del archivo es el id del centro ---');
  const window = crearVentana(construirHtml());
  await esperar(150);
  await marcarYcargar(window, ['CEDIS']);
  window.document.getElementById('btn-pdf-ejecutivo').dispatchEvent(new window.Event('click'));
  await esperar(150);
  assert(window.__ultimoArchivo === 'reporte-ejecutivo-nom035-CEDIS-2026-Q3.pdf', 'nombre de archivo usa el id del centro cuando solo hay uno');
}

async function correrTodo() {
  await escenario1_soloCentrosConGuiaAnonima();
  await escenario2_sinSeleccion();
  await escenario3_dosCentrosGuia2();
  await escenario4_pdfEjecutivoYTecnico();
  await escenario5_excelHojasPorCentro();
  await escenario6_powerpointSlidesPorCentro();
  await escenario7_unSoloCentroSufijoSinNumero();

  console.log('\n=====================================');
  console.log(pasadas + ' pasadas, ' + fallidas + ' fallidas');
  console.log('=====================================');
  if (fallidas > 0) process.exit(1);
}

correrTodo();
