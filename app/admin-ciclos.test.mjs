import { JSDOM } from 'jsdom';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('/home/claude/proj/riverline-nom035/app/');
const XLSX = require('xlsx');
let ok = 0, fail = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ✔', n); } else { fail++; console.log('  ✘ FALLÓ:', n); } };

let html = fs.readFileSync('/home/claude/proj/riverline-nom035/app/admin-ciclos.html', 'utf-8')
  .replace('https://beywoewggsbtrmjilcyg.supabase.co', 'https://TU-PROYECTO.supabase.co')
  .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '')
  .replace('<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>', '');
const errs = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/admin-ciclos.html', pretendToBeVisual: true,
  beforeParse(w) { w.XLSX = XLSX; w.addEventListener('error', e => errs.push(e.message)); } });
await new Promise(r => setTimeout(r, 300));
const d = dom.window.document;

console.log('\n--- Render demo ---');
t('sin errores de script', errs.length === 0);
t('muestra ciclo actual', d.getElementById('panel-actual').textContent.includes('Ciclo demo 2026'));
t('lista un ciclo cerrado', d.getElementById('lista-cerrados').textContent.includes('Piloto 2025'));

console.log('\n--- Cerrar ciclo (confirmación escrita) ---');
d.getElementById('btn-cerrar-ciclo').click();
const conf = d.getElementById('modal-confirmar');
t('modal abre con botón deshabilitado', conf && conf.disabled);
const inp = d.getElementById('confirmar-texto');
inp.value = 'cerrar'; inp.dispatchEvent(new dom.window.Event('input'));
t('escribir "cerrar" habilita el botón', !conf.disabled);
d.getElementById('nombre-cierra').value = 'Ciclo demo 2026';
d.getElementById('nombre-siguiente').value = 'Ciclo demo 2027';
conf.click();
await new Promise(r => setTimeout(r, 200));
t('modal se cierra', !d.getElementById('modal-fondo'));
t('nuevo ciclo actual', d.getElementById('panel-actual').textContent.includes('Ciclo demo 2027'));
t('el anterior pasa a cerrados', d.getElementById('lista-cerrados').textContent.includes('Ciclo demo 2026'));

console.log('\n--- Eliminar exige escribir el nombre ---');
d.querySelector('[data-accion="eliminar"]').click();
const conf2 = d.getElementById('modal-confirmar');
t('botón eliminar deshabilitado al abrir', conf2.disabled);
const inp2 = d.getElementById('confirmar-texto');
inp2.value = 'otro nombre'; inp2.dispatchEvent(new dom.window.Event('input'));
t('nombre incorrecto no habilita', conf2.disabled);
d.getElementById('modal-cancelar').click();
t('cancelar cierra sin eliminar', !d.getElementById('modal-fondo') && d.querySelectorAll('[data-accion="eliminar"]').length === 2);

console.log('\n--- Expediente con salida REAL del RPC (Postgres) ---');
const exp = JSON.parse(fs.readFileSync('/tmp/exp.json', 'utf-8'));
const libro = dom.window.construirLibroExpediente(exp, { nombre: 'Piloto 2026' });
t('4 hojas', libro.SheetNames.length === 4 && libro.SheetNames.join('|') === 'Resumen|Seguimiento|Guía I individual|Guías II-III (anónimo)');
const seg = XLSX.utils.sheet_to_json(libro.Sheets['Seguimiento']);
t('seguimiento: 7 filas con estatus legibles', seg.length === 7 && seg.some(r => r['Guía II'] === 'Contestó') && seg.some(r => r['Guía I'] === 'No aplica'));
const g1 = XLSX.utils.sheet_to_json(libro.Sheets['Guía I individual']);
t('Guía I individual: 1 fila', g1.length === 1 && g1[0]['Requiere atención clínica'] === 'No');
const an = XLSX.utils.sheet_to_json(libro.Sheets['Guías II-III (anónimo)']);
t('anónimo: Guía II / CEDIS / 6 respuestas', an.length === 1 && an[0]['Guía'] === 'Guía II' && an[0]['Respuestas'] === 6 && an[0]['Bajo'] === 6);
const res = XLSX.utils.sheet_to_json(libro.Sheets['Resumen'], { header: 1 });
t('resumen: cabecera con nombre del ciclo', res.some(r => r[0] === 'Ciclo' && r[1] === 'Piloto 2026'));

console.log('\n--- Mínimo de 5 respuestas ---');
const expPoco = JSON.parse(JSON.stringify(exp));
expPoco.anonimas_agregado[0].detalle_visible = false; expPoco.anonimas_agregado[0].respuestas = 3; expPoco.anonimas_agregado[0].dominios = [];
const an2 = XLSX.utils.sheet_to_json(dom.window.construirLibroExpediente(expPoco, {}).Sheets['Guías II-III (anónimo)']);
t('con <5 respuestas se oculta el detalle', an2.length === 1 && String(an2[0]['Nota']).includes('detalle oculto') && an2[0]['Dominio'] === '');

console.log('\n--- Lista real del RPC pinta sin errores ---');
dom.window.estado.ciclos = JSON.parse(fs.readFileSync('/tmp/ciclos.json', 'utf-8'));
dom.window.eval('renderTodo()');
t('render con datos reales', d.getElementById('lista-cerrados').textContent.includes('Piloto 2026') && d.getElementById('panel-actual').textContent.includes('Ciclo 2027'));

console.log(`\n${ok} pruebas pasadas, ${fail} fallidas.`);
process.exit(fail ? 1 : 0);
