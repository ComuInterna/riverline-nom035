// Test B - smoke test de generacion real con pdfmake, docx y pptxgenjs
// (fuera de jsdom, en Node puro) usando las MISMAS funciones puras de
// contenido que admin-reportes.html (multi-centro), para confirmar que
// los datos que producen esas funciones son validos para cada libreria
// y generan archivos binarios reales (no solo que "no truena").
import fs from 'fs';
import vm from 'vm';

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

// Cargamos las funciones puras de contenido directamente del archivo
// fuente (extraidas en vivo de admin-reportes.html — sin depender de un
// archivo intermedio creado a mano), ejecutandolas en un sandbox minimo
// (sin document/window reales) para obtener generarResultadosDemo,
// construirRankingDominios, construirDocDefinicionPDF, CATALOGO_G3, etc.
const htmlOriginal = fs.readFileSync('./admin-reportes.html', 'utf-8');
const coincidencia = htmlOriginal.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!coincidencia) throw new Error('No se pudo extraer el <script> de admin-reportes.html');
const codigoFuenteOriginal = coincidencia[1];
// vm.runInContext expone declaraciones `var`/`function` como propiedades
// del sandbox, pero NO `const`/`let` (quedan en un scope lexico aparte).
// Insertamos una linea antes del `iniciar();` final que copia lo que
// necesitamos a `window`, para poder leerlo desde fuera del sandbox.
const codigoFuente = codigoFuenteOriginal.replace(
  /\niniciar\(\);\s*$/,
  '\nwindow.CATALOGO_G3 = CATALOGO_G3; window.CATALOGO_G2 = CATALOGO_G2; ' +
  'window.generarResultadosDemo = generarResultadosDemo; window.construirResumenPeriodo = construirResumenPeriodo; ' +
  'window.construirRankingDominios = construirRankingDominios; window.construirTablaCategorias = construirTablaCategorias; ' +
  'window.construirPlanDeAccion = construirPlanDeAccion; window.construirDocDefinicionPDF = construirDocDefinicionPDF; ' +
  'try { iniciar(); } catch (e) {}\n'
);
if (codigoFuente === codigoFuenteOriginal) throw new Error('No se encontro la llamada final a iniciar(); revisa admin-reportes.html');
const sandbox = {
  window: { addEventListener() {} },
  document: {
    getElementById: () => ({ addEventListener() {}, style: {}, textContent: '' }),
    createElement: () => ({ click() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  console,
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  setTimeout,
  Blob: class {},
};
sandbox.window.supabase = { createClient: () => ({}) };
vm.createContext(sandbox);
try {
  vm.runInContext(codigoFuente, sandbox);
} catch (e) {
  // El script llama iniciar() al final, que intenta usar document.getElementById(...).style
  // en un sandbox minimo; lo relevante para este test son las funciones ya definidas
  // en el scope global del sandbox, asi que un error en iniciar() no es bloqueante.
  console.log('  (info) iniciar() genero un aviso esperado en el sandbox minimo:', e.message);
}

// Arma un "centro con datos" tal como lo haria construirDatosCentro(),
// pero a mano (el sandbox no tiene estado.resultadosPorCentro poblado).
function armarCentro(centroId, nombreCentro, catalogo) {
  const resultados = sandbox.window.generarResultadosDemo(catalogo);
  return {
    centroId,
    nombreCentro,
    catalogo,
    resumen: sandbox.window.construirResumenPeriodo(resultados, '2026-Q3'),
    ranking: sandbox.window.construirRankingDominios(resultados, catalogo),
    tablaCategorias: sandbox.window.construirTablaCategorias(resultados, catalogo),
    plan: sandbox.window.construirPlanDeAccion(resultados, catalogo),
  };
}

const centroG3 = armarCentro('CEDIS', 'CEDIS', sandbox.window.CATALOGO_G3);
const centroG2 = armarCentro('FORO_4', 'Foro 4', sandbox.window.CATALOGO_G2);
const centrosCombinados = [centroG3, centroG2];

const docDefEjecutivo = sandbox.window.construirDocDefinicionPDF('ejecutivo', centrosCombinados, '2026-Q3');
const docDefTecnico = sandbox.window.construirDocDefinicionPDF('tecnico', centrosCombinados, '2026-Q3');

async function probarPDF() {
  console.log('\n(nota) La generacion de PDF via pdfMake.createPdf(...).download() solo es soportada');
  console.log('en navegador (es la API oficial documentada por pdfmake para uso en CDN); no se');
  console.log('genera un buffer real aqui. Su doc-definition combinada (multi-centro) ya se valida');
  console.log('arriba (mas contenido en tecnico que en ejecutivo) y exhaustivamente en Test A.');
}

async function probarWord() {
  console.log('\n--- Word (docx), reporte combinado ---');
  const docxLib = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, PageBreak } = docxLib;

  function filaTabla(celdas, encabezado) {
    return new TableRow({
      children: celdas.map((texto) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(texto), bold: !!encabezado })] })],
      })),
    });
  }
  const hijos = [
    new Paragraph({ text: 'Riverline', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: 'Reporte Tecnico NOM-035' }),
  ];
  centrosCombinados.forEach((c, i) => {
    const tabla = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [filaTabla(['Categoria', 'Puntaje', 'Nivel'], true), ...c.tablaCategorias.map((cat) => filaTabla([cat.nombre, cat.puntaje, cat.etiqueta]))],
    });
    hijos.push(
      new Paragraph({ children: i === 0 ? [] : [new PageBreak()] }),
      new Paragraph({ text: c.nombreCentro + ' (' + c.catalogo.etiqueta + ')' }),
      tabla,
      new Paragraph({ text: c.plan.accionOficial })
    );
  });
  const documento = new Document({ sections: [{ children: hijos }] });
  const buffer = await Packer.toBuffer(documento);
  assert(buffer.length > 1000, `Word: genera un buffer no trivial (${buffer.length} bytes)`);
  assert(buffer.slice(0, 2).toString() === 'PK', 'Word: encabezado de archivo ZIP valido (PK, formato OOXML)');
  fs.writeFileSync('./salida-prueba.docx', buffer);
}

async function probarPowerPoint() {
  console.log('\n--- PowerPoint (pptxgenjs), reporte combinado ---');
  const PptxGenJSMod = await import('pptxgenjs');
  const PptxGenJS = PptxGenJSMod.default || PptxGenJSMod;
  const pres = new PptxGenJS();
  let slide = pres.addSlide();
  slide.addText('Riverline', { x: 0.5, y: 0.5, fontSize: 14, bold: true });
  slide.addText('Reporte Ejecutivo NOM-035 — 2 centros', { x: 0.5, y: 2, fontSize: 32, bold: true });

  centrosCombinados.forEach((c) => {
    slide = pres.addSlide();
    slide.addText(c.nombreCentro + ' (' + c.catalogo.etiqueta + ')', { x: 0.5, y: 0.4, fontSize: 22, bold: true });
    slide.addChart(pres.ChartType.bar, [{
      name: 'Severidad relativa (%)',
      labels: c.ranking.map((d) => d.nombre),
      values: c.ranking.map((d) => d.porcentaje),
    }], { x: 0.4, y: 1.0, w: 9, h: 4.3, barDir: 'bar' });
  });

  const buffer = await pres.write({ outputType: 'nodebuffer' });
  assert(buffer.length > 1000, `PowerPoint: genera un buffer no trivial (${buffer.length} bytes)`);
  assert(buffer.slice(0, 2).toString() === 'PK', 'PowerPoint: encabezado de archivo ZIP valido (PK, formato OOXML)');
  fs.writeFileSync('./salida-prueba.pptx', buffer);
}

async function correr() {
  assert(centroG3.resumen.totalRespuestas === 41 && centroG2.resumen.totalRespuestas === 41, 'Datos demo cargados correctamente para ambos catalogos');
  assert(centroG3.ranking.length === 10, 'Centro Guia III: ranking tiene 10 dominios');
  assert(centroG2.ranking.length === 8, 'Centro Guia II: ranking tiene 8 dominios');
  assert(centroG3.tablaCategorias.length === 5, 'Centro Guia III: 5 categorias');
  assert(centroG2.tablaCategorias.length === 4, 'Centro Guia II: 4 categorias');
  assert(docDefEjecutivo.content.length > 0 && docDefTecnico.content.length > docDefEjecutivo.content.length, 'PDF tecnico tiene mas contenido que el ejecutivo (objetivo/metodologia/anexos)');

  await probarPDF();
  await probarWord();
  await probarPowerPoint();

  console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
  process.exit(fallidas > 0 ? 1 : 0);
}

correr().catch((e) => {
  console.error('\u2718 ERROR INESPERADO:', e.stack || e.message);
  process.exit(1);
});
