import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import * as XLSX from 'xlsx';

const html = fs.readFileSync('./admin-reportes.html', 'utf-8');
const htmlSinCDN = html
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script src="https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/pdfmake.min.js"></script>', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/vfs_fonts.js"></script>', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js"></script>', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>', '');
fs.writeFileSync('./admin-reportes.test-copy.html', htmlSinCDN);

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

function crearVentana() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => console.error('[jsdomError]', e.message));
  const dom = new JSDOM(htmlSinCDN, {
    runScripts: 'dangerously',
    resources: undefined,
    url: 'https://example.com/admin-reportes.html',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.XLSX = Object.assign({}, XLSX);
      // Stubs minimos para pdfMake/docx/PptxGenJS: solo para que el
      // wiring de botones no truene; la generacion REAL de estos 3
      // formatos se prueba por separado en node-smoke-test-otros-formatos.mjs
      // usando las mismas funciones puras de contenido.
      window.pdfMake = { createPdf: () => ({ download: () => {} }) };
      window.docx = new Proxy({}, { get: () => class { static toBlob() { return Promise.resolve(new Blob(['x'])); } } });
      window.PptxGenJS = class {
        addSlide() { return { addText() {}, addChart() {} }; }
        addChart() {}
        defineLayout() {}
        writeFile() {}
        get ChartType() { return { bar: 'bar' }; }
      };
    },
  });
  return dom.window;
}

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function correr() {
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;

  // -------------------------------------------------------------
  // 1) Funciones puras de contenido (fuente unica de verdad,
  //    compartida por los 4 formatos)
  // -------------------------------------------------------------
  const resultados = window.generarResultadosDemo();
  assert(resultados.totalRespuestas === 41, 'Datos demo: 41 respuestas anonimas');

  const ranking = window.construirRankingDominios(resultados);
  assert(ranking.length === 10, `Ranking incluye los 10 dominios (obtuvo ${ranking.length})`);
  assert(ranking[0].nivel_riesgo === 'muy_alto', 'El dominio #1 del ranking es muy_alto');
  for (let i = 0; i < ranking.length - 1; i++) {
    const ordenA = { nulo: 0, bajo: 1, medio: 2, alto: 3, muy_alto: 4 }[ranking[i].nivel_riesgo];
    const ordenB = { nulo: 0, bajo: 1, medio: 2, alto: 3, muy_alto: 4 }[ranking[i + 1].nivel_riesgo];
    assert(ordenA >= ordenB, `Ranking se mantiene ordenado por severidad en la posicion ${i}`);
  }

  const tablaCategorias = window.construirTablaCategorias(resultados);
  assert(tablaCategorias.length === 5, `Tabla de categorias tiene 5 filas (obtuvo ${tablaCategorias.length})`);
  assert(tablaCategorias.every((c) => typeof c.etiqueta === 'string' && c.etiqueta.length > 0), 'Todas las categorias tienen etiqueta de nivel legible');

  const plan = window.construirPlanDeAccion(resultados);
  assert(plan.nivelGlobal === 'alto', 'Plan: nivel global = alto (igual que en resultados)');
  assert(plan.accionOficial.startsWith('Se requiere realizar un analisis de cada categoria y dominio'), 'Plan cita el texto oficial exacto del nivel "alto"');
  const idsPrioritarios = plan.dominiosPrioritarios.map((d) => d.dominio_id);
  const idsEsperados = ranking.filter((d) => ['alto', 'muy_alto'].includes(d.nivel_riesgo)).map((d) => d.dominio_id);
  assert(JSON.stringify(idsPrioritarios.sort()) === JSON.stringify(idsEsperados.sort()), 'Dominios prioritarios = exactamente los reales en alto/muy_alto');
  assert(!idsPrioritarios.includes('DOM_CONDICIONES'), 'Un dominio bajo (Condiciones) no aparece como prioritario');

  const resumen = window.construirResumenPeriodo(resultados, '2026-Q3');
  assert(resumen.puntajeGlobal === 111, 'Resumen: puntaje global correcto (111)');
  assert(resumen.etiquetaGlobal === 'Alto', 'Resumen: etiqueta de nivel correcta (Alto)');

  // -------------------------------------------------------------
  // 2) Definicion de documento PDF (pdfmake): estructura correcta
  //    para ambos tipos, sin necesidad de renderizar el PDF real aqui.
  // -------------------------------------------------------------
  const defEjecutivo = window.construirDocDefinicionPDF('ejecutivo', resultados, '2026-Q3');
  const defTecnico = window.construirDocDefinicionPDF('tecnico', resultados, '2026-Q3');
  assert(Array.isArray(defEjecutivo.content) && defEjecutivo.content.length > 0, 'PDF ejecutivo: doc-definition tiene contenido');
  assert(defTecnico.content.length > defEjecutivo.content.length, 'PDF tecnico tiene mas secciones que el ejecutivo (incluye objetivo/metodologia/anexos)');
  const textoTecnicoPlano = JSON.stringify(defTecnico.content);
  assert(textoTecnicoPlano.includes('NOM-035-STPS-2018'), 'PDF tecnico incluye el anexo con catalogo de categorias/dominios');
  assert(textoTecnicoPlano.includes('Objetivo'), 'PDF tecnico incluye la seccion Objetivo');
  assert(!JSON.stringify(defEjecutivo.content).includes('Objetivo'), 'PDF ejecutivo NO incluye la seccion Objetivo (queda solo en el tecnico)');

  // -------------------------------------------------------------
  // 3) UI: resumen renderizado y botones conectados
  // -------------------------------------------------------------
  const resumenTexto = doc.getElementById('resumen-periodo').textContent;
  assert(resumenTexto.includes('111'), 'UI: resumen del periodo muestra el puntaje global');
  assert(resumenTexto.includes('Alto'), 'UI: resumen del periodo muestra el nivel');

  const botones = ['btn-pdf-ejecutivo', 'btn-pdf-tecnico', 'btn-excel', 'btn-word', 'btn-ppt'];
  botones.forEach((id) => assert(!!doc.getElementById(id), `Boton "${id}" presente en la UI`));

  // -------------------------------------------------------------
  // 4) Generacion real de Excel end-to-end (mismo patron que Modulo 5)
  // -------------------------------------------------------------
  let libroCapturado = null;
  const originalWriteFile = window.XLSX.writeFile;
  window.XLSX.writeFile = (libro, nombre) => { libroCapturado = { libro, nombre }; };
  doc.getElementById('btn-excel').click();
  await esperar(50);
  window.XLSX.writeFile = originalWriteFile;

  assert(!!libroCapturado, 'Click en "Descargar Excel" invoca XLSX.writeFile');
  assert(libroCapturado.nombre.endsWith('.xlsx'), 'Nombre de archivo Excel termina en .xlsx');
  assert(libroCapturado.libro.SheetNames.length === 4, `Libro Excel tiene 4 hojas (obtuvo ${libroCapturado.libro.SheetNames.length}: ${libroCapturado.libro.SheetNames.join(', ')})`);
  assert(libroCapturado.libro.SheetNames.includes('Plan de accion'), 'Libro Excel incluye la hoja "Plan de accion"');

  const hojaDominios = XLSX.utils.sheet_to_json(libroCapturado.libro.Sheets['Dominios']);
  assert(hojaDominios.length === 10, `Hoja "Dominios" tiene 10 filas (obtuvo ${hojaDominios.length})`);
  assert(hojaDominios[0].Nivel === 'Muy alto', 'Hoja "Dominios" esta ordenada por severidad (fila 1 = Muy alto)');

  console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
  process.exit(fallidas > 0 ? 1 : 0);
}

correr().catch((e) => {
  console.error('\u2718 ERROR INESPERADO:', e.stack || e.message);
  process.exit(1);
});
