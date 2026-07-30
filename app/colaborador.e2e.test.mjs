import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

// Genera la copia de prueba (sin CDNs externas) a partir del archivo real,
// para no depender de un archivo intermedio creado a mano.
const htmlOriginal = fs.readFileSync('./colaborador.html', 'utf-8');
const html = htmlOriginal
  .replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '')
  .replace('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script>window.supabase = { createClient: function(){ return {}; } };</script>')
  .replace('<script type="module">', '<script>');
fs.writeFileSync('./colaborador.test-copy.html', html);

function crearVentana() {
  const store = new Map();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => console.error('[jsdomError]', e.message));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: undefined,
    url: 'https://example.com/colaborador.html',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  return window;
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(doc, codigo) {
  doc.getElementById('input-codigo').value = codigo;
  doc.getElementById('btn-entrar').click();
  await esperar(200);
}

async function responderTodo(doc, respuestaSiNo, maxPasos = 300) {
  let pasos = 0;
  const encabezadosVistos = new Set();
  while (pasos < maxPasos) {
    pasos++;
    if (doc.getElementById('btn-enviar')) break;

    const encabezado = doc.querySelector('.seccion-encabezado');
    if (encabezado) encabezadosVistos.add(encabezado.textContent);

    const opciones = doc.querySelectorAll('.opcion');
    if (opciones.length === 0) throw new Error(`Paso ${pasos}: sin opciones para responder`);
    const esSiNo = doc.querySelector('.pregunta-si-no');
    let elegida;
    if (esSiNo) {
      elegida = [...opciones].find((o) => o.querySelector('input').value === respuestaSiNo);
    } else {
      elegida = opciones[0];
    }
    elegida.click();
    await esperar(5);
    const btnSig = doc.getElementById('btn-siguiente');
    if (btnSig.disabled) throw new Error(`Paso ${pasos}: Siguiente deshabilitado tras responder`);
    btnSig.click();
    await esperar(5);
  }
  if (pasos >= maxPasos) throw new Error('Posible loop infinito en la encuesta');
  return { pasos, encabezadosVistos };
}

async function escenario1_perfilBase() {
  console.log('\n--- Escenario 1: perfil base (No/No), resume desde buffer a medias ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '1001');
  if (!doc.querySelector('.screen-bienvenida')) throw new Error('No llegó a bienvenida');
  console.log('✔ Login → bienvenida');

  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  for (let i = 0; i < 5; i++) {
    const opciones = doc.querySelectorAll('.opcion');
    opciones[opciones.length - 1].click();
    await esperar(5);
    doc.getElementById('btn-siguiente').click();
    await esperar(5);
  }
  const bufferGuardado = window.localStorage.getItem('nom035_buffer_1001');
  if (!bufferGuardado) throw new Error('No se guardó el buffer tras responder 5 reactivos');
  const parsed = JSON.parse(bufferGuardado);
  if (Object.keys(parsed.respuestas).length !== 5) {
    throw new Error(`El buffer debería tener 5 respuestas, tiene ${Object.keys(parsed.respuestas).length}`);
  }
  console.log('✔ Buffer guardado con 5 respuestas tras "cerrar" a medias');

  const window2 = crearVentana();
  window2.localStorage.setItem('nom035_buffer_1001', bufferGuardado);
  await esperar(200);
  const doc2 = window2.document;
  await login(doc2, '1001');
  if (!doc2.querySelector('.reactivo-texto') && !doc2.querySelector('.pregunta-si-no')) {
    throw new Error('Tras reingresar con buffer existente, no fue directo a la encuesta');
  }
  console.log('✔ Reingreso con buffer existente → retoma la encuesta directamente (sin repetir bienvenida)');

  const { pasos, encabezadosVistos } = await responderTodo(doc2, 'no');
  console.log(`✔ Resto de la encuesta completada (${pasos} pasos adicionales de UI)`);

  const seVioClientes = [...encabezadosVistos].some((t) => t.includes('atención a clientes'));
  const seVioJefe = [...encabezadosVistos].some((t) => t.includes('personas que supervisa'));
  if (seVioClientes) throw new Error('La sección de clientes NO debía aparecer (se respondió "No")');
  if (seVioJefe) throw new Error('La sección de jefe NO debía aparecer (se respondió "No")');
  console.log('✔ Secciones condicionales correctamente omitidas (perfil base = 64 reactivos)');

  const textoRevision = doc2.querySelector('.subtitulo').textContent;
  if (!textoRevision.includes('Contestaste todos los reactivos')) {
    throw new Error('Revisión no indica encuesta completa: ' + textoRevision);
  }

  doc2.getElementById('btn-enviar').click();
  await esperar(1200);
  if (!doc2.querySelector('.screen-gracias')) throw new Error('No llegó a pantalla de gracias');
  if (window2.localStorage.getItem('nom035_buffer_1001') !== null) {
    throw new Error('El buffer no se borró tras finalizar');
  }
  console.log('✔ Envío exitoso, pantalla de gracias, buffer borrado');
}

async function escenario2_perfilCompleto() {
  console.log('\n--- Escenario 2: perfil completo (Sí atiende clientes, Sí es jefe) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '1002');
  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  const { pasos, encabezadosVistos } = await responderTodo(doc, 'si');
  const vioClientes = [...encabezadosVistos].some((t) => t.includes('atención a clientes'));
  const vioJefe = [...encabezadosVistos].some((t) => t.includes('personas que supervisa'));
  if (!vioClientes) throw new Error('No apareció la sección condicional de clientes (65-68) al responder "Sí"');
  if (!vioJefe) throw new Error('No apareció la sección condicional de jefe (69-72) al responder "Sí"');
  console.log(`✔ Ambas secciones condicionales aparecieron (${pasos} pasos de UI, perfil completo = 72 reactivos)`);

  const textoRevision = doc.querySelector('.subtitulo').textContent;
  if (!textoRevision.includes('Contestaste todos los reactivos')) {
    throw new Error('Revisión no indica encuesta completa: ' + textoRevision);
  }
  console.log('✔ Encuesta completa (72 reactivos)');
}

async function escenario3_codigoInvalido() {
  console.log('\n--- Escenario 3: código inválido ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '9999-no-existe');
  const error = doc.getElementById('error-login');
  if (!error.classList.contains('visible')) throw new Error('No se mostró error con código inexistente');
  console.log('✔ Código inexistente → muestra error, no avanza');
}

async function escenario4_accesibilidad() {
  console.log('\n--- Escenario 4: accesibilidad de las preguntas (AA) ---');
  const window = crearVentana();
  await esperar(200);
  const doc = window.document;

  await login(doc, '1001');
  doc.getElementById('btn-comenzar').click();
  await esperar(50);

  // La primera pantalla de la encuesta es un reactivo de escala (5 opciones);
  // la pregunta Sí/No aparece mas adelante, tras responder los 64 reactivos base.
  const fieldsetReactivo = doc.querySelector('fieldset.opciones');
  if (!fieldsetReactivo) throw new Error('El reactivo no usa <fieldset> — sin agrupacion semantica para lectores de pantalla');
  const legendReactivo = fieldsetReactivo.querySelector('legend');
  if (!legendReactivo || !legendReactivo.textContent.trim()) throw new Error('El fieldset no tiene <legend> con el texto del reactivo');
  console.log('✔ Cada reactivo usa <fieldset>/<legend> (agrupacion semantica correcta)');

  const radiosReactivo = fieldsetReactivo.querySelectorAll('input[type="radio"]');
  if (radiosReactivo.length !== 5) throw new Error(`Un reactivo de escala deberia tener 5 opciones, encontro ${radiosReactivo.length}`);
  if (!radiosReactivo[0].name.startsWith('reactivo-')) throw new Error('El name del radio de un reactivo no sigue el patron esperado "reactivo-N"');
  const nombreUnico = new Set([...radiosReactivo].map((r) => r.name)).size === 1;
  if (!nombreUnico) throw new Error('Los 5 radios de un mismo reactivo no comparten "name" — el teclado no los agruparia');
  console.log('✔ Cada reactivo de escala tiene 5 radios nativos agrupados por "name" (navegables con flechas del teclado)');

  // Responder por teclado: marcar "checked" y disparar 'change', como lo
  // haria un navegador real al usar flechas + espacio, sin usar .click().
  radiosReactivo[0].checked = true;
  radiosReactivo[0].dispatchEvent(new window.Event('change', { bubbles: true }));
  await esperar(20);
  const btnSiguiente1 = doc.getElementById('btn-siguiente');
  if (btnSiguiente1.disabled) throw new Error('Marcar un radio via "change" (simulando teclado) no habilito "Siguiente"');
  console.log('✔ Responder por teclado (evento "change" nativo, sin mouse) habilita "Siguiente"');

  const decorativo = fieldsetReactivo.querySelector('.radio-visual');
  if (decorativo.getAttribute('aria-hidden') !== 'true') throw new Error('El indicador visual decorativo deberia tener aria-hidden="true"');
  console.log('✔ El indicador visual decorativo esta marcado aria-hidden (no genera ruido para lectores de pantalla)');

  // Avanzar hasta llegar a una pregunta Sí/No (aparece tras los 64 reactivos base)
  // respondiendo "Nunca" a todo, para verificar el mismo patron ahi.
  let pasos = 0;
  while (!doc.querySelector('.pregunta-si-no') && pasos < 100) {
    pasos++;
    const opciones = doc.querySelectorAll('.opcion');
    opciones[opciones.length - 1].click();
    await esperar(5);
    doc.getElementById('btn-siguiente').click();
    await esperar(5);
  }
  const fieldsetSiNo = doc.querySelector('fieldset.opciones');
  if (!doc.querySelector('.pregunta-si-no') || !fieldsetSiNo) throw new Error('No se alcanzo una pregunta Sí/No tras recorrer la encuesta');
  const radiosSiNo = fieldsetSiNo.querySelectorAll('input[type="radio"]');
  if (radiosSiNo.length !== 2) throw new Error(`La pregunta Sí/No deberia tener 2 opciones, encontro ${radiosSiNo.length}`);
  if (radiosSiNo[0].name !== radiosSiNo[1].name) throw new Error('Los radios Sí/No no comparten "name"');
  console.log('✔ La pregunta Sí/No tambien usa 2 radios nativos agrupados por "name"');
}

async function correrTodo() {
  await escenario1_perfilBase();
  await escenario2_perfilCompleto();
  await escenario3_codigoInvalido();
  await escenario4_accesibilidad();
  console.log('\nTODAS LAS PRUEBAS E2E PASARON.');
  process.exit(0);
}

correrTodo().catch((e) => {
  console.error('✘ FALLÓ:', e.message);
  process.exit(1);
});
