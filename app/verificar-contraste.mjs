// verificar-contraste.mjs
// ---------------------------------------------------------------------
// Calcula la razon de contraste WCAG 2.1 para cada par texto/fondo
// realmente usado en los 8 módulos, y falla si algo no cumple AA:
//   - Texto normal:            minimo 4.5:1
//   - Texto grande (>=18pt) o
//     componentes de interfaz: minimo 3:1
// ---------------------------------------------------------------------

function hexARgb(hex) {
  const limpio = hex.replace('#', '');
  const bigint = parseInt(limpio.length === 3
    ? limpio.split('').map((c) => c + c).join('')
    : limpio, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// Mezcla un color con alpha (ej. "22" hex = ~13.3%) sobre un fondo solido,
// tal como el navegador compone `background:${color}22` sobre lo que haya detras.
function mezclarConAlpha(colorHex, alphaHex, fondoHex) {
  const alpha = parseInt(alphaHex, 16) / 255;
  const c = hexARgb(colorHex);
  const f = hexARgb(fondoHex);
  return {
    r: c.r * alpha + f.r * (1 - alpha),
    g: c.g * alpha + f.g * (1 - alpha),
    b: c.b * alpha + f.b * (1 - alpha),
  };
}

function luminanciaRelativa({ r, g, b }) {
  const transformar = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [transformar(r), transformar(g), transformar(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function razonContraste(hexA, hexB) {
  const rgbA = typeof hexA === 'string' ? hexARgb(hexA) : hexA;
  const rgbB = typeof hexB === 'string' ? hexARgb(hexB) : hexB;
  const L1 = luminanciaRelativa(rgbA);
  const L2 = luminanciaRelativa(rgbB);
  const [claro, oscuro] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (claro + 0.05) / (oscuro + 0.05);
}

// ---------------------------------------------------------------------
// Paleta real usada en los 8 modulos (colaborador.html, admin-*.html)
// ---------------------------------------------------------------------
const PALETA_CLARA = {
  rojo: '#e50d2e', rojoOscuro: '#b80a24', negro: '#15161a',
  gris900: '#1f2128', gris700: '#4a4d57', gris500: '#666973',
  gris200: '#e7e8ec', gris100: '#f4f4f7', blanco: '#ffffff',
  nulo: '#1e864a', bajo: '#4a7431', medio: '#83641e', alto: '#b55a17', muyAlto: '#e50d2e',
};
const PALETA_OSCURA = {
  gris100: '#121317', gris200: '#26282f', blanco: '#1b1c22',
  negro: '#f2f2f4', gris900: '#eceef1', gris700: '#b7b9c2', gris500: '#848790',
  fondo: '#0c0d10',
};

const casos = [
  // --- Modo claro ---
  { nombre: 'Boton primario: texto blanco sobre rojo (#e50d2e)', fg: '#ffffff', bg: PALETA_CLARA.rojo, minimo: 4.5, tipo: 'texto normal (botones)' },
  { nombre: 'Boton primario hover: texto blanco sobre rojo oscuro', fg: '#ffffff', bg: PALETA_CLARA.rojoOscuro, minimo: 4.5, tipo: 'texto normal (botones)' },
  { nombre: 'Texto principal (gris-900) sobre blanco', fg: PALETA_CLARA.gris900, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal' },
  { nombre: 'Texto secundario (gris-700) sobre blanco', fg: PALETA_CLARA.gris700, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal' },
  { nombre: 'Texto muted (gris-500) sobre blanco — subtitulos/notas', fg: PALETA_CLARA.gris500, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal (¡frecuente en toda la app!)' },
  { nombre: 'Texto muted (gris-500) sobre gris-100 (fondo de pagina)', fg: PALETA_CLARA.gris500, bg: PALETA_CLARA.gris100, minimo: 4.5, tipo: 'texto normal' },

  // Colores de nivel de riesgo como TEXTO sobre blanco (badges, cifras, ranking)
  { nombre: 'Nivel "nulo" (#1f8a4c) como texto sobre blanco', fg: PALETA_CLARA.nulo, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal (badges)' },
  { nombre: 'Nivel "bajo" (#6fae4a) como texto sobre blanco', fg: PALETA_CLARA.bajo, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal (badges)' },
  { nombre: 'Nivel "medio" (#c99a2e) como texto sobre blanco', fg: PALETA_CLARA.medio, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal (badges)' },
  { nombre: 'Nivel "alto" (#e2711d) como texto sobre blanco', fg: PALETA_CLARA.alto, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal (badges)' },
  { nombre: 'Nivel "muy_alto" (#e50d2e) como texto sobre blanco', fg: PALETA_CLARA.muyAlto, bg: PALETA_CLARA.blanco, minimo: 4.5, tipo: 'texto normal (badges)' },

  // Colores de nivel sobre SU PROPIO fondo tenue (background: color+"22")
  { nombre: 'Nivel "bajo" texto sobre su propio fondo tenue (bajo22)', fg: PALETA_CLARA.bajo, bg: mezclarConAlpha(PALETA_CLARA.bajo, '22', PALETA_CLARA.blanco), minimo: 4.5, tipo: 'texto normal (badge tenue)' },
  { nombre: 'Nivel "medio" texto sobre su propio fondo tenue (medio22)', fg: PALETA_CLARA.medio, bg: mezclarConAlpha(PALETA_CLARA.medio, '22', PALETA_CLARA.blanco), minimo: 4.5, tipo: 'texto normal (badge tenue)' },

  // --- Modo oscuro ---
  { nombre: '[Oscuro] Texto principal sobre fondo de pagina', fg: PALETA_OSCURA.negro, bg: PALETA_OSCURA.fondo, minimo: 4.5, tipo: 'texto normal' },
  { nombre: '[Oscuro] Texto principal sobre panel/tarjeta', fg: PALETA_OSCURA.negro, bg: PALETA_OSCURA.blanco, minimo: 4.5, tipo: 'texto normal' },
  { nombre: '[Oscuro] Texto secundario (gris-700) sobre panel', fg: PALETA_OSCURA.gris700, bg: PALETA_OSCURA.blanco, minimo: 4.5, tipo: 'texto normal' },
  { nombre: '[Oscuro] Texto muted (gris-500) sobre panel', fg: PALETA_OSCURA.gris500, bg: PALETA_OSCURA.blanco, minimo: 4.5, tipo: 'texto normal' },
];

let pasadas = 0, fallidas = 0;
console.log('Auditoria de contraste WCAG 2.1 AA\n' + '='.repeat(60));
for (const caso of casos) {
  const ratio = razonContraste(caso.fg, caso.bg);
  const ok = ratio >= caso.minimo;
  if (ok) pasadas++; else fallidas++;
  const etiqueta = ok ? 'OK  ' : 'FALLA';
  console.log(`${etiqueta} ${ratio.toFixed(2)}:1 (min ${caso.minimo}:1) — ${caso.nombre} [${caso.tipo}]`);
}
console.log('='.repeat(60));
console.log(`${pasadas} casos cumplen AA, ${fallidas} no cumplen.\n`);
if (fallidas > 0) process.exit(1);
