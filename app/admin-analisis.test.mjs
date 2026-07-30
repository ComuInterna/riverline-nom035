import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const htmlOriginal = fs.readFileSync('./admin-analisis.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>', '');
fs.writeFileSync('./admin-analisis.test-copy.html', html);

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
    url: 'https://example.com/admin-analisis.html',
    pretendToBeVisual: true,
    virtualConsole,
  });
  return dom.window;
}

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function correr() {
  const window = crearVentana();
  await esperar(250);
  const doc = window.document;

  // -------------------------------------------------------------
  // 1) Funciones puras: normalizacion y nivel por limite
  // -------------------------------------------------------------
  assert(window.normalizarContraMuyAlto(10, 20) === 50, 'normalizarContraMuyAlto(10,20) = 50%');
  assert(window.normalizarContraMuyAlto(30, 20) === 150, 'normalizarContraMuyAlto(30,20) = 150% (por encima del umbral)');
  assert(window.normalizarContraMuyAlto(5, 0) === 0, 'normalizarContraMuyAlto con limite 0 no explota, regresa 0');

  const rangosPrueba = [
    { nivel: 'nulo', limite_superior: 10 }, { nivel: 'bajo', limite_superior: 20 },
    { nivel: 'medio', limite_superior: 30 }, { nivel: 'alto', limite_superior: 40 },
    { nivel: 'muy_alto', limite_superior: null },
  ];
  assert(window.determinarNivelPorLimite(5, rangosPrueba) === 'nulo', 'determinarNivelPorLimite(5) = nulo');
  assert(window.determinarNivelPorLimite(10, rangosPrueba) === 'bajo', 'determinarNivelPorLimite(10, limite compartido) = bajo');
  assert(window.determinarNivelPorLimite(999, rangosPrueba) === 'muy_alto', 'determinarNivelPorLimite(999) = muy_alto');

  // -------------------------------------------------------------
  // 2) Ranking de dominios: orden por severidad (nivel, luego %)
  // -------------------------------------------------------------
  const ranking = window.__ultimoRanking;
  assert(ranking.length === 10, `Ranking incluye los 10 dominios (obtuvo ${ranking.length})`);
  for (let i = 0; i < ranking.length - 1; i++) {
    const a = ranking[i], b = ranking[i + 1];
    const ordenA = { nulo: 0, bajo: 1, medio: 2, alto: 3, muy_alto: 4 }[a.nivel_riesgo];
    const ordenB = { nulo: 0, bajo: 1, medio: 2, alto: 3, muy_alto: 4 }[b.nivel_riesgo];
    const ok = ordenA > ordenB || (ordenA === ordenB && a.porcentaje >= b.porcentaje);
    assert(ok, `Ranking posicion ${i}->${i + 1}: ${a.nombre} (${a.nivel_riesgo}) no debe ir despues de ${b.nombre} (${b.nivel_riesgo})`);
  }
  assert(ranking[0].nivel_riesgo === 'muy_alto', 'El primer lugar del ranking es un dominio muy_alto');

  // DOM_JORNADA (puntaje 5, umbral muy_alto=6) y DOM_VIOLENCIA (18 vs 16) son muy_alto en el demo.
  const nombresMuyAlto = ranking.filter((d) => d.nivel_riesgo === 'muy_alto').map((d) => d.dominio_id);
  assert(nombresMuyAlto.includes('DOM_JORNADA') && nombresMuyAlto.includes('DOM_VIOLENCIA'), 'Los 2 dominios muy_alto del demo aparecen clasificados correctamente');

  // -------------------------------------------------------------
  // 3) Radar: porcentaje calculado contra el umbral muy_alto de cada categoria
  // -------------------------------------------------------------
  const radar = window.__ultimoRadar;
  assert(radar.length === 5, `Radar incluye las 5 categorias (obtuvo ${radar.length})`);
  const catAmbiente = radar.find((c) => c.categoria_id === 'CAT_AMBIENTE');
  // puntaje=6, limite muy_alto=14 -> 6/14*100 = 42.86 -> redondeado 43
  assert(catAmbiente.porcentaje === Math.round((6 / 14) * 100), `Radar CAT_AMBIENTE % correcto (obtuvo ${catAmbiente.porcentaje})`);

  // -------------------------------------------------------------
  // 4) Plan de accion: solo refleja datos reales, nunca inventa
  // -------------------------------------------------------------
  const plan = window.__ultimoPlan;
  assert(plan.nivelGlobal === 'alto', 'Plan: nivel global tomado de los resultados reales (alto)');

  const dominiosPrioritariosIds = plan.dominiosPrioritarios.map((d) => d.dominio_id);
  const esperadosPrioritarios = ranking.filter((d) => ['alto', 'muy_alto'].includes(d.nivel_riesgo)).map((d) => d.dominio_id);
  assert(
    JSON.stringify(dominiosPrioritariosIds.sort()) === JSON.stringify(esperadosPrioritarios.sort()),
    `Dominios prioritarios = exactamente los alto/muy_alto reales (${dominiosPrioritariosIds.length} de ${esperadosPrioritarios.length})`
  );
  assert(!dominiosPrioritariosIds.includes('DOM_CONDICIONES'), 'Un dominio "bajo" (Condiciones) NO aparece como prioritario');

  const fortalezasIds = plan.fortalezas.map((d) => d.dominio_id);
  assert(fortalezasIds.every((id) => {
    const d = ranking.find((r) => r.dominio_id === id);
    return d.nivel_riesgo === 'nulo' || d.nivel_riesgo === 'bajo';
  }), 'Todas las fortalezas listadas son dominios nulo/bajo reales');
  assert(!fortalezasIds.includes('DOM_VIOLENCIA'), 'Un dominio muy_alto (Violencia) NO aparece como fortaleza');

  // -------------------------------------------------------------
  // 5) Heatmap: respeta el minimo de N (Ventas tiene n=2, debe verse "insuficiente")
  // -------------------------------------------------------------
  const heatmap = window.__ultimoHeatmap;
  const ventas = heatmap.find((f) => f.departamento === 'Ventas');
  assert(ventas.n === 2, 'Ventas tiene n=2 en el dataset demo');
  assert(ventas.celdas.every((c) => c.suficiente === false && c.nivel_riesgo === null), 'Todas las celdas de Ventas se marcan como muestra insuficiente (n < minimo)');
  const produccion = heatmap.find((f) => f.departamento === 'Produccion');
  assert(produccion.celdas.every((c) => c.suficiente === true), 'Produccion (n suficiente) muestra sus niveles de riesgo normalmente');

  // -------------------------------------------------------------
  // 6) Render en el DOM: gauge, texto del plan, heatmap
  // -------------------------------------------------------------
  const gaugeTexto = doc.getElementById('gauge-global').textContent;
  assert(gaugeTexto.includes('111'), 'Gauge muestra el puntaje global (111)');
  assert(gaugeTexto.includes('Alto'), 'Gauge muestra la etiqueta de nivel (Alto)');

  const planTexto = doc.getElementById('contenedor-plan').textContent;
  assert(planTexto.includes('Se requiere realizar un analisis de cada categoria y dominio'), 'El texto oficial del nivel "alto" aparece verbatim en el plan');
  assert(planTexto.includes('Jornada de trabajo'), 'El dominio critico "Jornada de trabajo" aparece nombrado en el plan');
  assert(planTexto.includes('Violencia'), 'El dominio critico "Violencia" aparece nombrado en el plan');

  const heatmapTexto = doc.getElementById('contenedor-heatmap').textContent;
  assert(heatmapTexto.includes('Muestra insuficiente'), 'El heatmap muestra "Muestra insuficiente" para Ventas');
  assert((heatmapTexto.match(/Muestra insuficiente/g) || []).length === 5, 'Exactamente 5 celdas (una por categoria) marcadas insuficientes para Ventas');

  const rankingTexto = doc.getElementById('lista-ranking').textContent;
  assert(rankingTexto.indexOf('Jornada de trabajo') < rankingTexto.indexOf('Ambiente') || !rankingTexto.includes('Ambiente'), 'En el texto renderizado, un dominio muy_alto aparece antes que uno de menor severidad');

  console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
  process.exit(fallidas > 0 ? 1 : 0);
}

correr().catch((e) => {
  console.error('\u2718 ERROR INESPERADO:', e.stack || e.message);
  process.exit(1);
});
