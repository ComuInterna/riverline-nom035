import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const htmlOriginal = fs.readFileSync('./colaborador.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script type="module">', '<script>')
  .replace("const SUPABASE_URL = 'https://beywoewggsbtrmjilcyg.supabase.co';", "const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';");
fs.writeFileSync('./colaborador.test-copy.html', html);

function crearVentana() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => console.error('[jsdomError]', e.message));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: undefined,
    url: 'https://example.com/colaborador.html',
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

async function login(doc, codigo) {
  doc.getElementById('input-codigo').value = codigo;
  doc.getElementById('btn-entrar').click();
  await esperar(200);
}

async function responderTodoHastaRevision(doc, maxPasos = 300) {
  let pasos = 0;
  while (!doc.getElementById('btn-enviar') && pasos < maxPasos) {
    pasos++;
    const opciones = doc.querySelectorAll('.opcion');
    if (opciones.length === 0) throw new Error(`Paso ${pasos}: sin opciones para responder`);
    opciones[opciones.length - 1].click();
    await esperar(5);
    const btn = doc.getElementById('btn-siguiente');
    if (btn.disabled) throw new Error(`Paso ${pasos}: Siguiente deshabilitado tras responder`);
    btn.click();
    await esperar(5);
  }
  if (pasos >= maxPasos) throw new Error('Posible loop infinito');
  return pasos;
}

async function escenario1() {
  console.log('\n--- Escenario 1: solo Guía III (1001) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '1001');
  assert(!!doc.querySelector('.screen-bienvenida'), 'Con una sola guía pendiente, va directo a bienvenida (sin menú)');

  doc.getElementById('btn-comenzar').click();
  await esperar(50);
  const pasos = await responderTodoHastaRevision(doc);
  assert(pasos > 0, `Encuesta recorrida (${pasos} pasos)`);
  assert(doc.querySelector('.subtitulo').textContent.includes('Contestaste todos'), 'Revisión indica encuesta completa');

  doc.getElementById('btn-enviar').click();
  await esperar(1000);
  assert(!!doc.querySelector('.screen-gracias'), 'Llega a pantalla de gracias');
  assert(!doc.getElementById('btn-continuar'), 'Sin más pendientes, no muestra botón "Continuar"');
  assert(doc.querySelector('.titulo').textContent.includes('Gracias por participar'), 'Mensaje final de agradecimiento (sin pendientes)');
}

async function escenario2() {
  console.log('\n--- Escenario 2: solo Guía II (1002) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '1002');
  assert(!!doc.querySelector('.screen-bienvenida'), 'Va directo a bienvenida');

  doc.getElementById('btn-comenzar').click();
  await esperar(50);
  const primerTexto = doc.querySelector('legend.reactivo-texto').textContent;
  assert(primerTexto === 'Mi trabajo me exige hacer mucho esfuerzo físico', `Primer reactivo es el de Guía II, no Guía III (obtuvo: "${primerTexto}")`);

  const pasos = await responderTodoHastaRevision(doc);
  assert(pasos > 0, `Encuesta Guía II recorrida (${pasos} pasos, 40 reactivos base sin clientes/jefe)`);

  doc.getElementById('btn-enviar').click();
  await esperar(1000);
  assert(!!doc.querySelector('.screen-gracias'), 'Llega a gracias tras completar Guía II');
}

async function escenario3() {
  console.log('\n--- Escenario 3: combo Guía III + Guía I (1003) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '1003');
  const opciones = doc.querySelectorAll('.opcion-guia');
  assert(opciones.length === 2, `Con 2 guías pendientes, muestra menú con 2 opciones (obtuvo ${opciones.length})`);
  assert(doc.body.textContent.includes('Cuestionario de bienestar'), 'El menú incluye la Guía I ("Cuestionario de bienestar")');
  assert(doc.body.textContent.includes('Cuestionario general'), 'El menú incluye la Guía III ("Cuestionario general")');

  const botonGuia1 = [...opciones].find((b) => b.dataset.guia === 'guia_1');
  botonGuia1.click();
  await esperar(50);
  assert(doc.getElementById('pill-confidencial').classList.contains('no-anonima'), 'Al entrar a Guía I, el indicador cambia a "no anónima"');
  assert(doc.body.textContent.includes('Con tu nombre'), 'El pill muestra "Con tu nombre" para Guía I');
  assert(doc.body.textContent.includes('registradas junto con tu nombre'), 'La bienvenida de Guía I avisa explícitamente que SÍ se identifica');

  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  let radios = doc.querySelectorAll('input[name="reactivo-1"]');
  assert(radios.length === 2, 'El primer reactivo de Guía I tiene 2 opciones (Sí/No)');
  const radioSi = [...radios].find((r) => r.value === 'si');
  radioSi.checked = true;
  radioSi.dispatchEvent(new window.Event('change', { bubbles: true }));
  await esperar(20);
  doc.getElementById('btn-siguiente').click();
  await esperar(20);

  assert(!doc.getElementById('btn-enviar'), 'Tras responder "Sí" al reactivo 1, continúa con más preguntas (no salta a revisión)');
  assert(doc.querySelector('.seccion-encabezado').textContent.includes('Recuerdos persistentes'), 'Muestra la Sección 2 (Recuerdos persistentes)');

  const pasosGuia1 = await responderTodoHastaRevision(doc);
  assert(pasosGuia1 === 14, `Restan 14 pasos más tras el primero (15 reactivos en total, obtuvo ${pasosGuia1 + 1})`);

  doc.getElementById('btn-enviar').click();
  await esperar(1000);
  assert(!!doc.getElementById('btn-continuar'), 'Tras completar Guía I, como falta Guía III, muestra botón "Continuar"');
  assert(doc.querySelector('.subtitulo').textContent.includes('falta 1 encuesta'), 'Mensaje indica que falta 1 encuesta más');

  doc.getElementById('btn-continuar').click();
  await esperar(50);
  assert(!!doc.querySelector('.screen-bienvenida'), 'Con 1 sola guía restante, va directo a su bienvenida (sin volver al menú)');
  assert(doc.getElementById('pill-confidencial').classList.contains('no-anonima') === false, 'De vuelta en Guía III, el indicador vuelve a "anónima"');

  doc.getElementById('btn-comenzar').click();
  await esperar(50);
  await responderTodoHastaRevision(doc);
  doc.getElementById('btn-enviar').click();
  await esperar(1000);
  assert(!doc.getElementById('btn-continuar'), 'Tras completar ambas guías, ya no hay botón "Continuar"');
  assert(doc.querySelector('.titulo').textContent.includes('Gracias por participar'), 'Mensaje final tras completar ambas guías combinadas');
}

async function escenario3b() {
  console.log('\n--- Escenario 3b: Guía I con "No" en el reactivo 1 (termina de inmediato) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;
  await login(doc, '1003');

  const botonGuia1 = [...doc.querySelectorAll('.opcion-guia')].find((b) => b.dataset.guia === 'guia_1');
  botonGuia1.click();
  await esperar(50);
  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  const radios = doc.querySelectorAll('input[name="reactivo-1"]');
  const radioNo = [...radios].find((r) => r.value === 'no');
  radioNo.checked = true;
  radioNo.dispatchEvent(new window.Event('change', { bubbles: true }));
  await esperar(20);
  doc.getElementById('btn-siguiente').click();
  await esperar(20);

  assert(!!doc.getElementById('btn-enviar'), 'Tras responder "No" al reactivo 1, salta directo a revisión (sin más preguntas)');
  assert(doc.querySelector('.subtitulo').textContent.includes('Contestaste todo'), 'La revisión considera completa la encuesta con solo 1 reactivo');
}

async function escenario4() {
  console.log('\n--- Escenario 4: ya completó todo (1004) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;
  await login(doc, '1004');
  assert(!!doc.querySelector('.screen-gracias'), 'Va directo a pantalla de "nada pendiente"');
  assert(doc.querySelector('.titulo').textContent.includes('no tienes encuestas pendientes'), 'Mensaje correcto de nada pendiente');
}

async function escenario5() {
  console.log('\n--- Escenario 5: reanudar desde buffer (clave por guía) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;
  await login(doc, '1001');
  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  for (let i = 0; i < 4; i++) {
    const opciones = doc.querySelectorAll('.opcion');
    opciones[opciones.length - 1].click();
    await esperar(5);
    doc.getElementById('btn-siguiente').click();
    await esperar(5);
  }
  const claveEsperada = 'nom035_buffer_1001_guia_3';
  const bufferGuardado = window.localStorage.getItem(claveEsperada);
  assert(!!bufferGuardado, `Buffer guardado con clave namespaced por guía (${claveEsperada})`);
  assert(JSON.parse(bufferGuardado).respuestas && Object.keys(JSON.parse(bufferGuardado).respuestas).length === 4, 'Buffer contiene las 4 respuestas dadas');

  const window2 = crearVentana();
  window2.localStorage.setItem(claveEsperada, bufferGuardado);
  await esperar(200);
  const doc2 = window2.document;
  await login(doc2, '1001');
  assert(!doc2.querySelector('.screen-bienvenida'), 'Con buffer existente, NO vuelve a mostrar bienvenida');
  assert(!!doc2.querySelector('.reactivo-texto'), 'Retoma directo en la encuesta');
}

async function escenario6() {
  console.log('\n--- Escenario 6: accesibilidad conservada en el motor genérico ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;
  await login(doc, '1001');
  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  const fieldset = doc.querySelector('fieldset.opciones');
  assert(!!fieldset, 'El reactivo usa <fieldset>');
  assert(!!fieldset.querySelector('legend'), 'El fieldset tiene <legend>');
  const radios = fieldset.querySelectorAll('input[type="radio"]');
  assert(radios.length === 5, 'Reactivo Likert tiene 5 radios nativos');
  assert(new Set([...radios].map((r) => r.name)).size === 1, 'Los 5 radios comparten "name"');
  assert(fieldset.querySelector('.radio-visual').getAttribute('aria-hidden') === 'true', 'Indicador visual decorativo con aria-hidden');
}

async function correrTodo() {
  await escenario1();
  await escenario2();
  await escenario3();
  await escenario3b();
  await escenario4();
  await escenario5();
  await escenario6();
  console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
  process.exit(fallidas > 0 ? 1 : 0);
}

correrTodo().catch((e) => {
  console.error('\u2718 ERROR INESPERADO:', e.stack || e.message);
  process.exit(1);
});
