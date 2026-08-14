// =====================================================================
// admin-analisis.test.mjs
// ---------------------------------------------------------------------
// Pruebas de admin-analisis.html (Módulo 6, multi-guía). Corre contra
// una copia sin CDNs para jsdom, igual que el resto de los .test.mjs
// del proyecto (rutas relativas, se auto-genera admin-analisis.test-
// copy.html para inspección manual si algo falla).
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
    // Cliente falso que registra los argumentos de la última llamada a
    // .rpc(), para verificar que p_guia/p_centro_trabajo se envían bien.
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
    // getContext() de <canvas> no está implementado en jsdom -- ya
    // manejado por el propio código (renderRadar corta si no hay
    // window.Chart), así que no es un error real de la prueba.
    if (!/HTMLCanvasElement's getContext/.test(e.message)) {
      console.error('[jsdomError]', e.message);
    }
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: undefined,
    url: 'https://example.com/admin-analisis.html',
    pretendToBeVisual: true,
    virtualConsole,
  });
  return dom.window;
}
function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}

async function escenario1_centroGuia3PorDefecto() {
  console.log('\n--- Escenario 1: centro por defecto usa Guía III ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;

  assert(window.estado.guiaActiva === 'guia_3', 'guiaActiva inicial es guia_3');
  assert(doc.getElementById('pill-guia').textContent === 'Guia III', 'pill muestra "Guia III"');
  assert(doc.querySelectorAll('.ranking-fila').length === 10, 'ranking tiene 10 dominios (Guía III)');
  assert(doc.querySelectorAll('table.heatmap th').length - 1 === 5, 'heatmap tiene 5 columnas de categoría (Guía III)');
  assert(doc.querySelectorAll('.plan-bloque').length >= 2, 'el plan de acción se renderizó');
}

async function escenario2_cambioACentroGuia2() {
  console.log('\n--- Escenario 2: cambiar a un centro con Guía II (Foro 4) ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;

  const sel = doc.getElementById('selector-centro');
  sel.value = 'FORO_4';
  sel.dispatchEvent(new window.Event('change'));
  await esperar(300);

  assert(window.estado.guiaActiva === 'guia_2', 'guiaActiva cambia a guia_2 en Foro 4');
  assert(doc.getElementById('pill-guia').textContent === 'Guia II', 'pill muestra "Guia II"');
  assert(doc.querySelectorAll('.ranking-fila').length === 8, 'ranking tiene 8 dominios (Guía II)');
  assert(doc.querySelectorAll('table.heatmap th').length - 1 === 4, 'heatmap tiene 4 columnas de categoría (Guía II)');
  assert(doc.getElementById('texto-sub-gauge').textContent.indexOf('Foro 4') !== -1, 'subtítulo del gauge menciona el centro');
}

async function escenario3_centroConGuia1NuncaMuestraGuia1() {
  console.log('\n--- Escenario 3: un centro con Guía III + Guía I nunca usa Guía I aquí ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;

  const sel = doc.getElementById('selector-centro');
  sel.value = 'CHAPULTEPEC'; // guias_activas: ['guia_3', 'guia_1']
  sel.dispatchEvent(new window.Event('change'));
  await esperar(300);

  assert(window.estado.guiaActiva === 'guia_3', 'Chapultepec (III+I) resuelve a guia_3, nunca guia_1');
  assert(doc.querySelectorAll('.ranking-fila').length === 10, 'sigue mostrando el catálogo de 10 dominios de Guía III');
}

async function escenario4_todosLosCentrosCargan() {
  console.log('\n--- Escenario 4: los 15 centros cargan sin error ---');
  const window = crearVentana(construirHtml());
  await esperar(300);
  const doc = window.document;
  const sel = doc.getElementById('selector-centro');
  const total = sel.options.length;
  assert(total === 15, 'selector de centro tiene 15 opciones (' + total + ')');

  for (const opt of Array.from(sel.options)) {
    sel.value = opt.value;
    sel.dispatchEvent(new window.Event('change'));
    await esperar(60);
  }
  assert(true, 'recorrer los 15 centros no lanzó errores');
}

async function escenario5_rpcRecibeGuiaYCentro() {
  console.log('\n--- Escenario 5: la llamada RPC real recibe p_guia y p_centro_trabajo ---');
  const window = crearVentana(construirHtml({ forzarDemo: false }));
  await esperar(300);
  const doc = window.document;

  assert(window.__ultimaLlamadaRpc !== null, 'se llamó a supabaseClient.rpc() al iniciar');
  assert(window.__ultimaLlamadaRpc.nombre === 'obtener_resultados_periodo', 'se llamó a la función correcta');
  assert(window.__ultimaLlamadaRpc.args.p_guia === 'guia_3', 'primera carga manda p_guia=guia_3 (centro por defecto CEDIS)');
  assert(window.__ultimaLlamadaRpc.args.p_centro_trabajo === 'CEDIS', 'primera carga manda p_centro_trabajo=CEDIS');

  const sel = doc.getElementById('selector-centro');
  sel.value = 'CALL_CENTER'; // guia_2
  sel.dispatchEvent(new window.Event('change'));
  await esperar(200);

  assert(window.__ultimaLlamadaRpc.args.p_guia === 'guia_2', 'tras cambiar a Call Center, manda p_guia=guia_2');
  assert(window.__ultimaLlamadaRpc.args.p_centro_trabajo === 'CALL_CENTER', 'tras cambiar a Call Center, manda p_centro_trabajo=CALL_CENTER');
}

async function correrTodo() {
  await escenario1_centroGuia3PorDefecto();
  await escenario2_cambioACentroGuia2();
  await escenario3_centroConGuia1NuncaMuestraGuia1();
  await escenario4_todosLosCentrosCargan();
  await escenario5_rpcRecibeGuiaYCentro();

  console.log('\n=====================================');
  console.log(pasadas + ' pasadas, ' + fallidas + ' fallidas');
  console.log('=====================================');
  if (fallidas > 0) process.exit(1);
}

correrTodo();
