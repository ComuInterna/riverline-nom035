// =====================================================================
// admin-periodos.test.mjs
// ---------------------------------------------------------------------
// Regresion: admin-reportes.html pedia SIEMPRE '2026-Q3' (fijo) y
// admin-analisis.html pedia un periodo vacio, asi que las respuestas de
// otros trimestres (hoy '2026-Q4') nunca aparecian en los reportes.
// Aqui se prueban ambas pantallas contra una base simulada con datos
// en DOS trimestres (modo NO demo).
// =====================================================================
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

let pasadas = 0, fallidas = 0;
function assert(c, msg) { if (c) { pasadas++; console.log('  ✔ ' + msg); } else { fallidas++; console.log('  ✘ FALLÓ: ' + msg); } }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const STUB = (periodosJs) => `<script>
  window.__llamadas = [];
  window.supabase = { createClient: function(){ return { rpc: function(nombre, args) {
    window.__llamadas.push({ nombre: nombre, args: args });
    if (nombre === 'admin_listar_periodos') return Promise.resolve(${periodosJs});
    return Promise.resolve({ data: { totalRespuestas: 3, global: { puntaje: 10, nivel_riesgo: 'bajo' }, porCategoria: [], porDominio: [], porDepartamento: [] }, error: null });
  } }; } };
</script>`;

function cargar(archivo, periodosJs) {
  let html = fs.readFileSync(archivo, 'utf-8')
    .replace(/<link [^>]*fonts\.[^>]*>/g, '')
    .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/, STUB(periodosJs))
    .replace(/<script src="https:[^"]+"><\/script>/g, '');
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/getContext|not implemented/i.test(e.message)) console.error('[jsdomError]', e.message); });
  return new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/' + archivo, pretendToBeVisual: true, virtualConsole: vc }).window;
}

const DOS_TRIMESTRES = `{ data: [
  { periodo: '2026-Q3', guia: 'guia_2', centro_trabajo: 'CEDIS', respuestas: 2, ultima: '2026-09-02T00:00:00Z' },
  { periodo: '2026-Q4', guia: 'guia_2', centro_trabajo: 'CEDIS', respuestas: 1, ultima: '2026-10-25T00:00:00Z' },
  { periodo: '2026-Q4', guia: 'guia_2', centro_trabajo: 'CITY_CENTER', respuestas: 1, ultima: '2026-10-26T00:00:00Z' },
], error: null }`;

async function reportes() {
  console.log('\n--- admin-reportes: pide el periodo que SÍ tiene respuestas ---');
  const w = cargar('admin-reportes.html', DOS_TRIMESTRES); await esperar(300);
  const d = w.document;
  const opts = Array.from(d.querySelectorAll('#selector-periodo option'));
  assert(opts.length === 2, 'el selector ofrece los 2 trimestres con respuestas');
  assert(d.getElementById('selector-periodo').value === '2026-Q4', 'arranca en el periodo más reciente (2026-Q4), no en 2026-Q3 fijo');
  assert(opts[0].textContent.includes('2 respuestas'), 'muestra cuántas respuestas hay en cada periodo (Q4 = 2)');
  assert(w.estado.periodo === '2026-Q4', 'estado.periodo = 2026-Q4');

  d.querySelector('#lista-centros input[value="CEDIS"]').checked = true;
  d.getElementById('btn-cargar-centros').click(); await esperar(300);
  const llamada = w.__llamadas.filter((l) => l.nombre === 'obtener_resultados_periodo').pop();
  assert(llamada && llamada.args.p_periodo === '2026-Q4', 'el reporte pide p_periodo=2026-Q4');
  assert(d.getElementById('resumen-periodo').textContent.includes('2026-Q4'), 'el resumen muestra el periodo 2026-Q4');

  const sel = d.getElementById('selector-periodo');
  sel.value = '2026-Q3'; sel.dispatchEvent(new w.Event('change')); await esperar(300);
  const llamada2 = w.__llamadas.filter((l) => l.nombre === 'obtener_resultados_periodo').pop();
  assert(llamada2.args.p_periodo === '2026-Q3', 'al cambiar el selector recarga con 2026-Q3');
  assert(w.estado.periodo === '2026-Q3', 'estado.periodo sigue al selector');
}

async function reportesSinDatosOSinMigracion() {
  console.log('\n--- admin-reportes: sin respuestas / sin migración 16 ---');
  const hoy = new Date(); const q = hoy.getFullYear() + '-Q' + (Math.floor(hoy.getMonth() / 3) + 1);
  const w1 = cargar('admin-reportes.html', '{ data: [], error: null }'); await esperar(250);
  assert(w1.document.getElementById('selector-periodo').value === q, 'sin respuestas: usa el trimestre actual (' + q + ')');
  assert(w1.document.querySelector('#selector-periodo option').textContent.includes('sin respuestas'), 'y lo indica como "sin respuestas"');
  const w2 = cargar('admin-reportes.html', "{ data: null, error: { message: 'function not found' } }"); await esperar(250);
  assert(w2.document.getElementById('selector-periodo').value === q, 'si la función no existe, no se rompe y usa el trimestre actual');
}

async function analisis() {
  console.log('\n--- admin-analisis: ya no pide un periodo vacío ---');
  const w = cargar('admin-analisis.html', DOS_TRIMESTRES); await esperar(400);
  const d = w.document;
  assert(Array.from(d.querySelectorAll('#selector-periodo option')).map((o) => o.value).join(',') === '2026-Q4,2026-Q3', 'el selector lista 2026-Q4 y 2026-Q3');
  const primera = w.__llamadas.find((l) => l.nombre === 'obtener_resultados_periodo');
  assert(primera && primera.args.p_periodo === '2026-Q4', 'primera carga pide 2026-Q4 (antes pedía "")');
  const sel = d.getElementById('selector-periodo');
  sel.value = '2026-Q3'; sel.dispatchEvent(new w.Event('change')); await esperar(300);
  const ultima = w.__llamadas.filter((l) => l.nombre === 'obtener_resultados_periodo').pop();
  assert(ultima.args.p_periodo === '2026-Q3', 'al cambiar el selector pide 2026-Q3');
}

await reportes(); await reportesSinDatosOSinMigracion(); await analisis();
console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
process.exit(fallidas ? 1 : 0);
