import { calificarGuia1 } from './scoring-engine-guia1.js';

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}
function assertThrows(fn, msg) {
  try { fn(); fallidas++; console.error('  \u2718 ' + msg + ' (no lanzó error)'); }
  catch (e) { pasadas++; console.log('  \u2714 ' + msg); }
}

console.log('\n1) Sección I = "No" -> termina, sin atención clínica');
{
  const r = calificarGuia1({ GR1_1: false });
  assert(r.seccion1EventoTraumatico === false, 'seccion1EventoTraumatico = false');
  assert(r.seccion2AlgunSi === null && r.seccion3ConteoSi === null && r.seccion4ConteoSi === null, 'Secciones II-IV quedan null (nunca se preguntaron)');
  assert(r.requiereAtencionClinica === false, 'requiereAtencionClinica = false');
  assert(r.criteriosDisparados.length === 0, 'Sin criterios disparados');
}

console.log('\n2) Sección I = "No" pero llegan respuestas sobrantes de otras secciones -> rechazar');
assertThrows(
  () => calificarGuia1({ GR1_1: false, GR1_2: true }),
  'Rechaza respuestas de la Sección II cuando la Sección I fue "No"'
);

console.log('\n3) Sección I = "Sí", pero sin síntomas en II/III/IV -> NO requiere atención');
{
  const respuestas = { GR1_1: true, GR1_2: false, GR1_3: false };
  for (const id of ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10']) respuestas[id] = false;
  for (const id of ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15']) respuestas[id] = false;
  const r = calificarGuia1(respuestas);
  assert(r.seccion1EventoTraumatico === true, 'seccion1EventoTraumatico = true');
  assert(r.seccion2AlgunSi === false, 'seccion2AlgunSi = false (ningún Sí)');
  assert(r.seccion3ConteoSi === 0 && r.seccion4ConteoSi === 0, 'Conteos de III y IV en 0');
  assert(r.requiereAtencionClinica === false, 'requiereAtencionClinica = false (ningún criterio se cumple)');
}

console.log('\n4) Criterio 1: UN solo "Sí" en Sección II ya activa atención clínica');
{
  const respuestas = { GR1_1: true, GR1_2: true, GR1_3: false };
  for (const id of ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10']) respuestas[id] = false;
  for (const id of ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15']) respuestas[id] = false;
  const r = calificarGuia1(respuestas);
  assert(r.requiereAtencionClinica === true, 'requiereAtencionClinica = true con solo 1 Sí en Sección II');
  assert(r.criteriosDisparados.includes('seccion_2_algun_si'), 'Criterio "seccion_2_algun_si" reportado');
  assert(r.criteriosDisparados.length === 1, 'Solo se dispara ese criterio, no los otros dos');
}

console.log('\n5) Criterio 2: Sección III con exactamente 2 "Sí" NO activa (umbral es 3 o más)');
{
  const respuestas = { GR1_1: true, GR1_2: false, GR1_3: false };
  const s3 = ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10'];
  s3.forEach((id, i) => { respuestas[id] = i < 2; }); // 2 en Sí
  for (const id of ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15']) respuestas[id] = false;
  const r = calificarGuia1(respuestas);
  assert(r.seccion3ConteoSi === 2, 'Conteo de Sección III = 2');
  assert(r.requiereAtencionClinica === false, 'Con solo 2 "Sí" en Sección III, NO se activa (umbral es 3)');
}

console.log('\n6) Criterio 2: Sección III con exactamente 3 "Sí" SÍ activa (umbral exacto)');
{
  const respuestas = { GR1_1: true, GR1_2: false, GR1_3: false };
  const s3 = ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10'];
  s3.forEach((id, i) => { respuestas[id] = i < 3; }); // exactamente 3 en Sí
  for (const id of ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15']) respuestas[id] = false;
  const r = calificarGuia1(respuestas);
  assert(r.seccion3ConteoSi === 3, 'Conteo de Sección III = 3');
  assert(r.requiereAtencionClinica === true, 'Con exactamente 3 "Sí" en Sección III, SÍ se activa');
  assert(r.criteriosDisparados.length === 1 && r.criteriosDisparados[0] === 'seccion_3_tres_o_mas_si', 'Solo el criterio de Sección III se dispara');
}

console.log('\n7) Criterio 3: Sección IV con exactamente 1 "Sí" NO activa (umbral es 2 o más)');
{
  const respuestas = { GR1_1: true, GR1_2: false, GR1_3: false };
  for (const id of ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10']) respuestas[id] = false;
  const s4 = ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15'];
  s4.forEach((id, i) => { respuestas[id] = i < 1; });
  const r = calificarGuia1(respuestas);
  assert(r.seccion4ConteoSi === 1, 'Conteo de Sección IV = 1');
  assert(r.requiereAtencionClinica === false, 'Con solo 1 "Sí" en Sección IV, NO se activa (umbral es 2)');
}

console.log('\n8) Criterio 3: Sección IV con exactamente 2 "Sí" SÍ activa (umbral exacto)');
{
  const respuestas = { GR1_1: true, GR1_2: false, GR1_3: false };
  for (const id of ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10']) respuestas[id] = false;
  const s4 = ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15'];
  s4.forEach((id, i) => { respuestas[id] = i < 2; });
  const r = calificarGuia1(respuestas);
  assert(r.seccion4ConteoSi === 2, 'Conteo de Sección IV = 2');
  assert(r.requiereAtencionClinica === true, 'Con exactamente 2 "Sí" en Sección IV, SÍ se activa');
}

console.log('\n9) Múltiples criterios pueden dispararse a la vez');
{
  const respuestas = { GR1_1: true, GR1_2: true, GR1_3: true };
  const s3 = ['GR1_4','GR1_5','GR1_6','GR1_7','GR1_8','GR1_9','GR1_10'];
  s3.forEach((id) => { respuestas[id] = true; }); // 7 en Sí
  const s4 = ['GR1_11','GR1_12','GR1_13','GR1_14','GR1_15'];
  s4.forEach((id) => { respuestas[id] = true; }); // 5 en Sí
  const r = calificarGuia1(respuestas);
  assert(r.criteriosDisparados.length === 3, `Los 3 criterios se disparan a la vez (obtuvo ${r.criteriosDisparados.length})`);
  assert(r.requiereAtencionClinica === true, 'requiereAtencionClinica = true');
}

console.log('\n10) Validaciones: faltan respuestas requeridas');
assertThrows(() => calificarGuia1({}), 'Rechaza objeto vacío (falta Sección I)');
assertThrows(() => calificarGuia1({ GR1_1: true, GR1_2: true }), 'Rechaza cuando Sección I="Sí" mas faltan reactivos de II/III/IV');

console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
if (fallidas > 0) process.exit(1);
