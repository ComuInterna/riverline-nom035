import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const htmlOriginal = fs.readFileSync('./admin-historico.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>', '');
fs.writeFileSync('./admin-historico.test-copy.html', html);

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
    url: 'https://example.com/admin-historico.html',
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
  // 1) Datos demo y orden cronologico
  // -------------------------------------------------------------
  const historico = window.estado.historico;
  assert(historico.length === 5, `Historico demo tiene 5 aplicaciones (obtuvo ${historico.length})`);
  const masReciente = historico.find((h) => h.periodo === '2026-Q3');
  assert(masReciente.global.puntaje === 111 && masReciente.global.nivel_riesgo === 'alto', 'El periodo mas reciente (2026-Q3) coincide con los Modulos 6 y 7 (111, alto)');

  const ordenado = window.ordenarHistoricoCronologico(historico);
  assert(ordenado[0].periodo === '2025-Q3' && ordenado[ordenado.length - 1].periodo === '2026-Q3', 'ordenarHistoricoCronologico ordena correctamente de mas antiguo a mas reciente');

  // -------------------------------------------------------------
  // 2) Serie temporal
  // -------------------------------------------------------------
  const serie = window.construirSerieTemporal(historico);
  assert(serie.labels.length === 5 && serie.valores.length === 5, 'Serie temporal tiene 5 puntos');
  assert(serie.labels[0] === '2025-Q3' && serie.labels[4] === '2026-Q3', 'Serie temporal esta en orden cronologico');
  assert(serie.valores[4] === 111, 'Ultimo valor de la serie = 111 (Cfinal mas reciente)');

  // -------------------------------------------------------------
  // 3) Tendencia global (compara las 2 aplicaciones mas recientes)
  // -------------------------------------------------------------
  const tendencia = window.calcularTendenciaGlobal(historico);
  assert(tendencia.disponible === true, 'Tendencia global disponible con 5 periodos');
  assert(tendencia.periodoAnterior === '2026-Q2' && tendencia.periodoActual === '2026-Q3', 'Tendencia compara exactamente los 2 periodos mas recientes');
  assert(tendencia.diferencia === 111 - 115, `Diferencia calculada correctamente (obtuvo ${tendencia.diferencia}, esperado ${111 - 115})`);
  assert(tendencia.tendencia === 'mejora', 'Una reduccion de Cfinal se clasifica como "mejora" (menos riesgo)');

  // Caso borde: con un solo periodo, no debe haber tendencia disponible
  const tendenciaUnPeriodo = window.calcularTendenciaGlobal([historico[0]]);
  assert(tendenciaUnPeriodo.disponible === false, 'Con un solo periodo, la tendencia se marca como no disponible (no se inventa)');

  // -------------------------------------------------------------
  // 4) Comparativo entre periodos especificos
  // -------------------------------------------------------------
  const comparativo = window.compararPeriodos(historico, '2025-Q3', '2026-Q3');
  assert(comparativo !== null, 'compararPeriodos encuentra ambos periodos validos');
  assert(comparativo.diferenciaGlobal === 111 - 132, `Diferencia global 2025-Q3 -> 2026-Q3 correcta (obtuvo ${comparativo.diferenciaGlobal})`);
  assert(comparativo.tendenciaGlobal === 'mejora', 'La tendencia global de 2025-Q3 a 2026-Q3 es "mejora" (132 -> 111)');
  assert(comparativo.categorias.length === 5, `Comparativo incluye las 5 categorias (obtuvo ${comparativo.categorias.length})`);

  const orgTiempo = comparativo.categorias.find((c) => c.categoria_id === 'CAT_ORG_TIEMPO');
  assert(orgTiempo.nivelA === 'muy_alto' && orgTiempo.nivelB === 'muy_alto', 'CAT_ORG_TIEMPO sigue en muy_alto en ambos periodos (sin cambio de nivel)');
  assert(orgTiempo.cambioDeNivel === false, 'cambioDeNivel = false cuando el nivel no varia, aunque el puntaje si (12 -> 10)');

  const ambiente = comparativo.categorias.find((c) => c.categoria_id === 'CAT_AMBIENTE');
  assert(ambiente.nivelA === 'medio' && ambiente.nivelB === 'bajo' && ambiente.cambioDeNivel === true, 'CAT_AMBIENTE sí cambia de nivel (medio -> bajo) y se marca correctamente');

  // Periodo inexistente: debe regresar null explicitamente, nunca inventar datos
  const comparativoInvalido = window.compararPeriodos(historico, '2025-Q3', '2099-Q1');
  assert(comparativoInvalido === null, 'compararPeriodos regresa null si un periodo no existe en el historico (no inventa datos)');

  // -------------------------------------------------------------
  // 5) Render en el DOM
  // -------------------------------------------------------------
  const kpiTexto = doc.getElementById('kpi-tendencia').textContent;
  assert(kpiTexto.includes('111'), 'UI: KPI de tendencia muestra el puntaje mas reciente (111)');
  assert(kpiTexto.includes('2026-Q2'), 'UI: KPI de tendencia menciona el periodo anterior de comparacion');

  const selA = doc.getElementById('selector-periodo-a');
  const selB = doc.getElementById('selector-periodo-b');
  assert(selA.value === '2025-Q3', 'Selector A inicia en el periodo mas antiguo por defecto');
  assert(selB.value === '2026-Q3', 'Selector B inicia en el periodo mas reciente por defecto');

  const comparativoTexto = doc.getElementById('contenedor-comparativo').textContent;
  assert(comparativoTexto.includes('132') && comparativoTexto.includes('111'), 'UI: tabla comparativa muestra los puntajes globales de ambos periodos por default');

  // Cambiar selector B a un periodo intermedio y verificar que el comparativo se actualiza
  selB.value = '2026-Q1';
  selB.dispatchEvent(new window.Event('change'));
  await esperar(20);
  const comparativoTexto2 = doc.getElementById('contenedor-comparativo').textContent;
  assert(comparativoTexto2.includes('118'), 'UI: al cambiar el selector B a 2026-Q1, la tabla se actualiza con su puntaje (118)');
  assert(!comparativoTexto2.includes('111 ('), 'UI: el puntaje del periodo B anterior (111) ya no aparece como columna B tras el cambio');

  const tablaAplicacionesTexto = doc.getElementById('contenedor-aplicaciones').textContent;
  assert(tablaAplicacionesTexto.indexOf('2026-Q3') < tablaAplicacionesTexto.indexOf('2025-Q3'), 'UI: tabla de aplicaciones muestra el periodo mas reciente primero');
  assert((tablaAplicacionesTexto.match(/2026-Q1|2026-Q2|2026-Q3|2025-Q3|2025-Q4/g) || []).length === 5, 'UI: tabla de aplicaciones incluye las 5 aplicaciones del historico');

  console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
  process.exit(fallidas > 0 ? 1 : 0);
}

correr().catch((e) => {
  console.error('\u2718 ERROR INESPERADO:', e.stack || e.message);
  process.exit(1);
});
