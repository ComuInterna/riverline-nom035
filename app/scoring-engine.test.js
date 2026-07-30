/**
 * scoring-engine.test.js
 * ---------------------------------------------------------------------
 * Pruebas del motor de calificación. Se ejecutan con Node nativo (sin
 * frameworks) mediante: node scoring-engine.test.js
 * ---------------------------------------------------------------------
 */
import { calificarEncuesta, calificarReactivo, determinarNivelRiesgo } from './scoring-engine.js';
import catalogo, { reactivos } from './catalogo-nom035-guia3.js';

let pasadas = 0;
let fallidas = 0;

function assertEqual(actual, esperado, mensaje) {
  const iguales = JSON.stringify(actual) === JSON.stringify(esperado);
  if (iguales) {
    pasadas++;
    console.log(`  ✔ ${mensaje}`);
  } else {
    fallidas++;
    console.error(`  ✘ ${mensaje}`);
    console.error(`     esperado: ${JSON.stringify(esperado)}`);
    console.error(`     obtenido: ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn, mensaje) {
  try {
    fn();
    fallidas++;
    console.error(`  ✘ ${mensaje} (no lanzó error)`);
  } catch (e) {
    pasadas++;
    console.log(`  ✔ ${mensaje}`);
  }
}

// ---------------------------------------------------------------------
console.log('\n1) calificarReactivo — inversión de escala (Tabla 5)');
// No invertido: Siempre(0)=4 ... Nunca(4)=0
assertEqual(calificarReactivo(0, false), 4, 'No invertido, Siempre(idx 0) → 4');
assertEqual(calificarReactivo(4, false), 0, 'No invertido, Nunca(idx 4) → 0');
assertEqual(calificarReactivo(2, false), 2, 'No invertido, Algunas veces(idx 2) → 2');
// Invertido: Siempre(0)=0 ... Nunca(4)=4
assertEqual(calificarReactivo(0, true), 0, 'Invertido, Siempre(idx 0) → 0');
assertEqual(calificarReactivo(4, true), 4, 'Invertido, Nunca(idx 4) → 4');
assertThrows(() => calificarReactivo(5, false), 'Rechaza índice fuera de rango (5)');
assertThrows(() => calificarReactivo(-1, true), 'Rechaza índice fuera de rango (-1)');

// ---------------------------------------------------------------------
console.log('\n2) determinarNivelRiesgo — límites compartidos (Cfinal)');
assertEqual(determinarNivelRiesgo(0, catalogo.rangoGlobal), 'nulo', 'Cfinal=0 → nulo');
assertEqual(determinarNivelRiesgo(49, catalogo.rangoGlobal), 'nulo', 'Cfinal=49 → nulo');
assertEqual(determinarNivelRiesgo(50, catalogo.rangoGlobal), 'bajo', 'Cfinal=50 (límite compartido) → bajo');
assertEqual(determinarNivelRiesgo(75, catalogo.rangoGlobal), 'medio', 'Cfinal=75 (límite compartido) → medio');
assertEqual(determinarNivelRiesgo(99, catalogo.rangoGlobal), 'alto', 'Cfinal=99 (límite compartido) → alto');
assertEqual(determinarNivelRiesgo(140, catalogo.rangoGlobal), 'muy_alto', 'Cfinal=140 (límite compartido) → muy_alto');
assertEqual(determinarNivelRiesgo(500, catalogo.rangoGlobal), 'muy_alto', 'Cfinal=500 → muy_alto');

// ---------------------------------------------------------------------
console.log('\n3) Integridad del catálogo (72 reactivos, cobertura completa)');
assertEqual(reactivos.length, 72, 'El catálogo contiene exactamente 72 reactivos');
const numeros = reactivos.map((r) => r.numero).sort((a, b) => a - b);
const esperadoSecuencial = Array.from({ length: 72 }, (_, i) => i + 1);
assertEqual(numeros, esperadoSecuencial, 'Los reactivos cubren 1..72 sin huecos ni duplicados');

// ---------------------------------------------------------------------
console.log('\n4) calificarEncuesta — colaborador base (no atiende clientes, no es jefe)');
{
  // Responde "Nunca" (índice 4) a todo. 72 - 4 (clientes) - 4 (jefe) = 64 reactivos aplicables.
  const reactivosAplicables = reactivos.filter(
    (r) => !r.requiere_atencion_clientes && !r.requiere_ser_jefe
  );
  const respuestas = reactivosAplicables.map((r) => ({ reactivo_id: r.id, indice: 4 }));

  const resultado = calificarEncuesta(
    { respuestas, atiendeClientes: false, esJefe: false },
    catalogo
  );

  assertEqual(resultado.totalReactivosAplicados, 64, 'Colaborador base: 64 reactivos aplicables');

  // Con "Nunca" en todo: reactivos NO invertidos (Siempre=4..Nunca=0) dan 0;
  // reactivos invertidos (Siempre=0..Nunca=4) dan 4.
  const invertidosAplicables = reactivosAplicables.filter((r) => r.es_invertido).length;
  const esperado = invertidosAplicables * 4; // los no invertidos aportan 0
  assertEqual(resultado.global.puntaje, esperado, `Cfinal esperado con "Nunca" en todo = ${esperado}`);
}

// ---------------------------------------------------------------------
console.log('\n5) calificarEncuesta — validaciones de integridad');
{
  const algunas = reactivos.slice(0, 5).map((r) => ({ reactivo_id: r.id, indice: 2 }));
  assertThrows(
    () => calificarEncuesta({ respuestas: algunas, atiendeClientes: false, esJefe: false }, catalogo),
    'Rechaza encuesta con reactivos faltantes'
  );
}
{
  // esJefe=false pero se envía respuesta para R69 (requiere ser jefe) → debe rechazar
  const reactivosBase = reactivos.filter((r) => !r.requiere_atencion_clientes && !r.requiere_ser_jefe);
  const respuestas = reactivosBase.map((r) => ({ reactivo_id: r.id, indice: 3 }));
  respuestas.push({ reactivo_id: 'R69', indice: 3 });
  assertThrows(
    () => calificarEncuesta({ respuestas, atiendeClientes: false, esJefe: false }, catalogo),
    'Rechaza respuesta a reactivo condicional (R69) cuando esJefe=false'
  );
}

// ---------------------------------------------------------------------
console.log('\n6) calificarEncuesta — colaborador completo (atiende clientes y es jefe)');
{
  const respuestas = reactivos.map((r) => ({ reactivo_id: r.id, indice: 0 })); // todos "Siempre"
  const resultado = calificarEncuesta(
    { respuestas, atiendeClientes: true, esJefe: true },
    catalogo
  );
  assertEqual(resultado.totalReactivosAplicados, 72, 'Colaborador completo: 72 reactivos aplicables');

  // Con "Siempre" (idx 0) en todo: no invertidos dan 4, invertidos dan 0.
  const noInvertidos = reactivos.filter((r) => !r.es_invertido).length;
  const esperado = noInvertidos * 4;
  assertEqual(resultado.global.puntaje, esperado, `Cfinal esperado con "Siempre" en todo = ${esperado}`);

  // Verificar que las 5 categorías y 10 dominios oficiales están presentes en el resultado.
  assertEqual(resultado.porCategoria.length, 5, 'Se calculan las 5 categorías oficiales');
  assertEqual(resultado.porDominio.length, 10, 'Se calculan los 10 dominios oficiales');
}

// ---------------------------------------------------------------------
console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
if (fallidas > 0) process.exit(1);
