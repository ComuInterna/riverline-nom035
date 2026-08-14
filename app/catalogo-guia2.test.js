import { calificarEncuesta } from './scoring-engine.js';
import catalogo, { reactivos } from './catalogo-guia2.js';

let pasadas = 0, fallidas = 0;
function assert(cond, msg) {
  if (cond) { pasadas++; console.log('  \u2714 ' + msg); }
  else { fallidas++; console.error('  \u2718 ' + msg); }
}
function assertThrows(fn, msg) {
  try { fn(); fallidas++; console.error('  \u2718 ' + msg + ' (no lanzó error)'); }
  catch (e) { pasadas++; console.log('  \u2714 ' + msg); }
}

console.log('\n1) Integridad del catálogo Guía II (46 reactivos, sin huecos)');
assert(reactivos.length === 46, `El catálogo tiene exactamente 46 reactivos (obtuvo ${reactivos.length})`);
const numeros = reactivos.map((r) => r.numero).sort((a, b) => a - b);
assert(JSON.stringify(numeros) === JSON.stringify(Array.from({ length: 46 }, (_, i) => i + 1)), 'Los reactivos cubren 1..46 sin huecos ni duplicados');
assert(reactivos.filter((r) => r.requiere_atencion_clientes).length === 3, 'Exactamente 3 reactivos condicionales de "atención a clientes" (41-43)');
assert(reactivos.filter((r) => r.requiere_ser_jefe).length === 3, 'Exactamente 3 reactivos condicionales de "jefe" (44-46)');

console.log('\n2) Colaborador base (no atiende clientes, no es jefe) → 40 reactivos aplicables');
{
  const reactivosBase = reactivos.filter((r) => !r.requiere_atencion_clientes && !r.requiere_ser_jefe);
  assert(reactivosBase.length === 40, `40 reactivos base (obtuvo ${reactivosBase.length})`);

  const respuestas = reactivosBase.map((r) => ({ reactivo_id: r.id, indice: 4 })); // "Nunca" a todo
  const resultado = calificarEncuesta({ respuestas, atiendeClientes: false, esJefe: false }, catalogo);

  assert(resultado.totalReactivosAplicados === 40, 'totalReactivosAplicados = 40');
  const invertidosAplicables = reactivosBase.filter((r) => r.es_invertido).length;
  const esperado = invertidosAplicables * 4; // los no invertidos aportan 0 con "Nunca"
  assert(resultado.global.puntaje === esperado, `Cfinal esperado con "Nunca" en todo = ${esperado} (obtuvo ${resultado.global.puntaje})`);
  assert(resultado.porCategoria.length === 4, `Se calculan las 4 categorías oficiales de Guía II (obtuvo ${resultado.porCategoria.length})`);
  assert(resultado.porDominio.length === 8, `Se calculan los 8 dominios oficiales de Guía II (obtuvo ${resultado.porDominio.length})`);
}

console.log('\n3) Colaborador completo (atiende clientes y es jefe) → 46 reactivos aplicables');
{
  const respuestas = reactivos.map((r) => ({ reactivo_id: r.id, indice: 0 })); // "Siempre" a todo
  const resultado = calificarEncuesta({ respuestas, atiendeClientes: true, esJefe: true }, catalogo);
  assert(resultado.totalReactivosAplicados === 46, 'totalReactivosAplicados = 46');
  const noInvertidos = reactivos.filter((r) => !r.es_invertido).length;
  assert(resultado.global.puntaje === noInvertidos * 4, `Cfinal esperado con "Siempre" en todo = ${noInvertidos * 4}`);
}

console.log('\n4) Rangos de riesgo global (Guía II): límites oficiales exactos');
{
  const { determinarNivelRiesgo } = await import('./scoring-engine.js');
  assert(determinarNivelRiesgo(19, catalogo.rangoGlobal) === 'nulo', 'Cfinal=19 → nulo');
  assert(determinarNivelRiesgo(20, catalogo.rangoGlobal) === 'bajo', 'Cfinal=20 (límite compartido) → bajo');
  assert(determinarNivelRiesgo(45, catalogo.rangoGlobal) === 'medio', 'Cfinal=45 (límite compartido) → medio');
  assert(determinarNivelRiesgo(70, catalogo.rangoGlobal) === 'alto', 'Cfinal=70 (límite compartido) → alto');
  assert(determinarNivelRiesgo(90, catalogo.rangoGlobal) === 'muy_alto', 'Cfinal=90 (límite compartido) → muy_alto');
}

console.log('\n5) Validaciones: rechaza reactivos condicionales fuera de perfil');
{
  const reactivosBase = reactivos.filter((r) => !r.requiere_atencion_clientes && !r.requiere_ser_jefe);
  const respuestas = reactivosBase.map((r) => ({ reactivo_id: r.id, indice: 2 }));
  respuestas.push({ reactivo_id: 'G2_R44', indice: 2 }); // requiere ser jefe
  assertThrows(
    () => calificarEncuesta({ respuestas, atiendeClientes: false, esJefe: false }, catalogo),
    'Rechaza respuesta a reactivo condicional (G2_R44) cuando esJefe=false'
  );
}

console.log('\n6) Confirmar que Guía II y Guía III son catálogos independientes (IDs no colisionan)');
{
  const catalogoGuia3 = await import('./catalogo-nom035-guia3.js').catch(() => null);
  if (catalogoGuia3) {
    const idsGuia2 = new Set(reactivos.map((r) => r.id));
    const idsGuia3 = new Set(catalogoGuia3.reactivos.map((r) => r.id));
    const interseccion = [...idsGuia2].filter((id) => idsGuia3.has(id));
    assert(interseccion.length === 0, `Ningún ID de reactivo se comparte entre Guía II y Guía III (obtuvo ${interseccion.length} colisiones)`);
  } else {
    console.log('  (omitido: catalogo-nom035-guia3.js no está en este directorio)');
  }
}

console.log(`\n${pasadas} pruebas pasadas, ${fallidas} fallidas.`);
if (fallidas > 0) process.exit(1);
