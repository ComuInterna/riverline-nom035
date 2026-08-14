// =====================================================================
// admin-historico.test.mjs
// ---------------------------------------------------------------------
// Pruebas de admin-historico.html multi-guia. Refleja la regla de
// negocio real por plantilla: CEDIS (42) y City Center (15) -> Guia II;
// las otras 13 unidades (<15 personas) solo tienen Guia I activa
// (individual) y no tienen historico anonimo que mostrar aqui.
// =====================================================================

import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const htmlOriginal = fs.readFileSync('./admin-historico.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>', '')
  .replace("const SUPABASE_URL = 'https://beywoewggsbtrmjilcyg.supabase.co';", "const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';");
fs.writeFileSync('./admin-historico.test-copy.html', html);

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

function crearVentana() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/getContext/.test(e.message)) console.error('[jsdomError]', e.message);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: undefined,
    url: 'https://example.com/admin-historico.html',
    pretendToBeVisual: true,
    virtualConsole,
  });
  return dom.window;
}
function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function escenario1_centroPorDefectoGuia2() {
  console.log('\n--- Escenario 1: centro por defecto (CEDIS, 42 personas) usa Guia II ---');
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;

  assert(doc.getElementById('selector-centro').options.length === 15, 'selector de centro tiene 15 opciones');
  assert(window.estado.centroActivo === 'CEDIS', 'centro por defecto es CEDIS');
  assert(window.estado.guiaActiva === 'guia_2', 'guiaActiva inicial es guia_2');
  assert(doc.getElementById('pill-guia').textContent === 'Guia II', 'pill muestra "Guia II"');
  assert(window.estado.historico.length === 5, 'historico demo tiene 5 periodos');
  assert(doc.querySelectorAll('.tabla-aplicaciones tbody tr').length === 5, 'tabla de aplicaciones tiene 5 filas');
  assert(doc.querySelectorAll('.tabla-comparativo tbody tr').length === 5, 'comparativo tiene 1 fila global + 4 categorias (Guia II)');
}

async function escenario2_cityCenterTambienGuia2() {
  console.log('\n--- Escenario 2: City Center (15 personas) también usa Guía II ---');
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;

  const sel = doc.getElementById('selector-centro');
  sel.value = 'CITY_CENTER';
  sel.dispatchEvent(new window.Event('change'));
  await esperar(250);

  assert(window.estado.guiaActiva === 'guia_2', 'guiaActiva es guia_2 en City Center');
  assert(doc.getElementById('texto-sub-tendencia').textContent.indexOf('City Center') !== -1, 'subtitulo menciona el centro');
  assert(doc.querySelectorAll('.tabla-comparativo tbody tr').length === 5, 'comparativo tiene 1 fila global + 4 categorias (Guia II)');
}

async function escenario3_centroSoloGuia1MuestraAviso() {
  console.log('\n--- Escenario 3: un centro con solo Guía I (<15 personas) no tiene historico que mostrar ---');
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;

  const sel = doc.getElementById('selector-centro');
  sel.value = 'TOLUCA'; // guias_activas: ['guia_1']
  sel.dispatchEvent(new window.Event('change'));
  await esperar(250);

  assert(window.estado.guiaActiva === null, 'Toluca (solo Guía I) resuelve a guiaActiva null');
  assert(doc.getElementById('pill-guia').textContent === 'Guia I (individual)', 'pill indica que es Guía I individual');
  assert(window.estado.historico.length === 0, 'no se carga historico para un centro sin guía anónima');
  assert(doc.querySelectorAll('.tabla-aplicaciones tbody tr').length === 0, 'la tabla de aplicaciones queda vacía');
  assert(/solo tiene Guia I activa/.test(doc.getElementById('kpi-tendencia').textContent), 'muestra el aviso explicando por qué no hay historico');
}

async function escenario4_todosLosCentrosCargan() {
  console.log('\n--- Escenario 4: los 15 centros cargan sin error ---');
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;
  const sel = doc.getElementById('selector-centro');

  let conGuiaAnonima = 0, sinGuiaAnonima = 0;
  for (const opt of Array.from(sel.options)) {
    sel.value = opt.value;
    sel.dispatchEvent(new window.Event('change'));
    await esperar(60);
    if (window.estado.guiaActiva === null) sinGuiaAnonima++; else conGuiaAnonima++;
  }
  assert(conGuiaAnonima === 2, 'exactamente 2 centros tienen historico anónimo, obtenido: ' + conGuiaAnonima);
  assert(sinGuiaAnonima === 13, 'exactamente 13 centros solo tienen Guía I, obtenido: ' + sinGuiaAnonima);
}

async function escenario5_ordenCronologicoYTendencia() {
  console.log('\n--- Escenario 5: orden cronologico, tendencia y comparativo (funciones puras) ---');
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;

  const ordenado = window.ordenarHistoricoCronologico(window.estado.historico);
  assert(ordenado[0].periodo === '2025-Q3' && ordenado[ordenado.length - 1].periodo === '2026-Q3', 'ordenarHistoricoCronologico ordena ascendente');

  const tendencia = window.calcularTendenciaGlobal(window.estado.historico);
  assert(tendencia.disponible === true, 'calcularTendenciaGlobal esta disponible con 5 periodos');
  assert(['mejora', 'empeora', 'igual'].indexOf(tendencia.tendencia) !== -1, 'tendencia.tendencia es un valor valido');

  const cat = window.catalogoActivo();
  const comparativo = window.compararPeriodos(window.estado.historico, '2025-Q3', '2026-Q3', cat);
  assert(comparativo !== null, 'compararPeriodos regresa datos para dos periodos validos');
  assert(comparativo.categorias.length === cat.categorias.length, 'compararPeriodos regresa todas las categorias del catalogo activo');

  const selA = doc.getElementById('selector-periodo-a');
  const selB = doc.getElementById('selector-periodo-b');
  assert(selA.value === '2025-Q3' && selB.value === '2026-Q3', 'selectores de periodo arrancan en el primero y el ultimo');
}

async function correrTodo() {
  await escenario1_centroPorDefectoGuia2();
  await escenario2_cityCenterTambienGuia2();
  await escenario3_centroSoloGuia1MuestraAviso();
  await escenario4_todosLosCentrosCargan();
  await escenario5_ordenCronologicoYTendencia();

  console.log('\n=====================================');
  console.log(pasadas + ' pasadas, ' + fallidas + ' fallidas');
  console.log('=====================================');
  if (fallidas > 0) process.exit(1);
}

correrTodo();
