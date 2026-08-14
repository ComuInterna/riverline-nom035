// =====================================================================
// admin-analisis.test.mjs
// ---------------------------------------------------------------------
// Pruebas de admin-analisis.html (Módulo 6, multi-guía). Refleja la
// regla de negocio real por plantilla: CEDIS (42) y City Center (15)
// -> Guia II; las otras 13 unidades (<15 personas) -> solo Guia I, sin
// cuestionario anonimo que analizar aqui (Guia I es individual). Corre
// contra una copia sin CDNs para jsdom, igual que el resto del proyecto.
// =====================================================================

import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const htmlOriginal = fs.readFileSync('./admin-analisis.html', 'utf-8');

function construirHtml({ forzarDemo = true } = {}) {
  let html = htmlOriginal
    .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
    .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
    .replace('<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>', '');

  if (forzarDemo) {
    html = html
      .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
      .replace("const SUPABASE_URL = 'https://beywoewggsbtrmjilcyg.supabase.co';", "const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';");
  } else {
    html = html.replace(
      '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
      `<script>
        window.__ultimaLlamadaRpc = null;
        window.supabase = { createClient: function(){
          return { rpc: function(nombre, args) {
            window.__ultimaLlamadaRpc = { nombre: nombre, args: args };
            return Promise.resolve({ data: { global: { puntaje: 0, nivel_riesgo: 'nulo' }, porCategoria: [], porDominio: [], porDepartamento: [] }, error: null });
          } };
        } };
      </script>`
    );
  }
  return html;
}

fs.writeFileSync('./admin-analisis.test-copy.html', construirHtml());

function crearVentana(html) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/HTMLCanvasElement's getContext/.test(e.message)) console.error('[jsdomError]', e.message);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: undefined,
    url: 'https://example.com/admin-analisis.html', pretendToBeVisual: true, virtualConsole,
  });
  return dom.window;
}
function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

async function escenario1_centroPorDefectoGuia2() {
  console.log('\n--- Escenario 1: centro por defecto (CEDIS, 42 personas) usa Guia II ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;

  assert(window.estado.guiaActiva === 'guia_2', 'guiaActiva inicial es guia_2 (CEDIS)');
  assert(doc.getElementById('pill-guia').textContent === 'Guia II', 'pill muestra "Guia II"');
  assert(doc.querySelectorAll('.ranking-fila').length === 8, 'ranking tiene 8 dominios (Guía II)');
  assert(doc.querySelectorAll('table.heatmap th').length - 1 === 4, 'heatmap tiene 4 columnas de categoría (Guía II)');
  assert(doc.querySelectorAll('.plan-bloque').length >= 2, 'el plan de acción se renderizó');
}

async function escenario2_cityCenterTambienGuia2() {
  console.log('\n--- Escenario 2: City Center (15 personas) también usa Guía II ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;

  const sel = doc.getElementById('selector-centro');
  sel.value = 'CITY_CENTER';
  sel.dispatchEvent(new window.Event('change'));
  await esperar(300);

  assert(window.estado.guiaActiva === 'guia_2', 'guiaActiva es guia_2 en City Center');
  assert(doc.querySelectorAll('.ranking-fila').length === 8, 'ranking tiene 8 dominios (Guía II)');
}

async function escenario3_centroSoloGuia1MuestraAviso() {
  console.log('\n--- Escenario 3: un centro con solo Guía I (<15 personas) no tiene nada que analizar aquí ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;

  const sel = doc.getElementById('selector-centro');
  sel.value = 'TIJUANA'; // guias_activas: ['guia_1']
  sel.dispatchEvent(new window.Event('change'));
  await esperar(300);

  assert(window.estado.guiaActiva === null, 'Tijuana (solo Guía I) resuelve a guiaActiva null');
  assert(doc.getElementById('pill-guia').textContent === 'Guia I (individual)', 'pill indica que es Guía I individual');
  assert(doc.querySelectorAll('.ranking-fila').length === 0, 'no hay ranking de dominios para mostrar');
  assert(/no hay cuestionario anonimo|solo tiene Guia I activa/i.test(doc.getElementById('gauge-global').textContent), 'el gauge explica que este centro no tiene cuestionario anónimo');
}

async function escenario4_todosLosCentrosCargan() {
  console.log('\n--- Escenario 4: los 15 centros cargan sin error ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;
  const sel = doc.getElementById('selector-centro');
  assert(sel.options.length === 15, 'selector de centro tiene 15 opciones (' + sel.options.length + ')');

  let conGuiaAnonima = 0, sinGuiaAnonima = 0;
  for (const opt of Array.from(sel.options)) {
    sel.value = opt.value;
    sel.dispatchEvent(new window.Event('change'));
    await esperar(60);
    if (window.estado.guiaActiva === null) sinGuiaAnonima++; else conGuiaAnonima++;
  }
  assert(conGuiaAnonima === 2, 'exactamente 2 centros tienen cuestionario anónimo (CEDIS y City Center), obtenido: ' + conGuiaAnonima);
  assert(sinGuiaAnonima === 13, 'exactamente 13 centros solo tienen Guía I, obtenido: ' + sinGuiaAnonima);
}

async function escenario5_rpcRecibeGuiaYCentro() {
  console.log('\n--- Escenario 5: la llamada RPC real recibe p_guia y p_centro_trabajo ---');
  const window = crearVentana(construirHtml({ forzarDemo: false }));
  await esperar(300);
  const doc = window.document;

  assert(window.__ultimaLlamadaRpc !== null, 'se llamó a supabaseClient.rpc() al iniciar (CEDIS tiene guía anónima)');
  assert(window.__ultimaLlamadaRpc.nombre === 'obtener_resultados_periodo', 'se llamó a la función correcta');
  assert(window.__ultimaLlamadaRpc.args.p_guia === 'guia_2', 'primera carga manda p_guia=guia_2 (centro por defecto CEDIS)');
  assert(window.__ultimaLlamadaRpc.args.p_centro_trabajo === 'CEDIS', 'primera carga manda p_centro_trabajo=CEDIS');

  const sel = doc.getElementById('selector-centro');
  const llamadasAntes = window.__ultimaLlamadaRpc;
  sel.value = 'PUEBLA'; // solo guia_1
  sel.dispatchEvent(new window.Event('change'));
  await esperar(200);

  assert(window.__ultimaLlamadaRpc === llamadasAntes, 'al cambiar a un centro sin guía anónima, NO se hace una llamada RPC nueva');
}

async function correrTodo() {
  await escenario1_centroPorDefectoGuia2();
  await escenario2_cityCenterTambienGuia2();
  await escenario3_centroSoloGuia1MuestraAviso();
  await escenario4_todosLosCentrosCargan();
  await escenario5_rpcRecibeGuiaYCentro();

  console.log('\n=====================================');
  console.log(pasadas + ' pasadas, ' + fallidas + ' fallidas');
  console.log('=====================================');
  if (fallidas > 0) process.exit(1);
}

correrTodo();
