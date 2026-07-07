// =====================================================================
// grade-mostruario.mjs — tratamento tonal "galeria noturna" na foto do
// mostruário (variante B · Médio, escolhida pelo cliente). Só ajuste de
// tom/contraste/vinheta — NÃO recolore (as cores reais das amostras ficam).
// Fonte = master limpo; saída = assets/mostruario.jpg + variantes srcset.
//
// Uso: node scripts/grade-mostruario.mjs
// =====================================================================
import sharp from 'sharp';

const MASTER = 'Imagem_Mostruario/mostruario_clean_master.png';
const OUT = 'assets/mostruario';

// Parâmetros da variante B
const MUL = [1.07, 1.0, 0.93];   // leve calor (mais R, menos B) por canal
const OFF = [-4, -3, -6];        // aprofunda um pouco as sombras
const BRIGHT = 0.90;
const SAT = 0.88;
const VIG = 0.5;                 // opacidade da vinheta radial
const BOT = 0.5;                 // opacidade do degradê inferior

const meta = await sharp(MASTER).metadata();
const W = meta.width, H = meta.height;

const scrim = Buffer.from(
  `<svg width='${W}' height='${H}'><defs>` +
  `<radialGradient id='v' cx='50%' cy='40%' r='75%'>` +
  `<stop offset='52%' stop-color='#07050a' stop-opacity='0'/>` +
  `<stop offset='100%' stop-color='#07050a' stop-opacity='${VIG}'/>` +
  `</radialGradient>` +
  `<linearGradient id='b' x1='0' y1='0' x2='0' y2='1'>` +
  `<stop offset='60%' stop-color='#07050a' stop-opacity='0'/>` +
  `<stop offset='100%' stop-color='#0b0810' stop-opacity='${BOT}'/>` +
  `</linearGradient></defs>` +
  `<rect width='${W}' height='${H}' fill='url(#v)'/>` +
  `<rect width='${W}' height='${H}' fill='url(#b)'/></svg>`);

const toned = await sharp(MASTER)
  .linear(MUL, OFF)
  .modulate({ brightness: BRIGHT, saturation: SAT })
  .toBuffer();

const graded = await sharp(toned)
  .composite([{ input: scrim, blend: 'over' }])
  .png().toBuffer();

for (const w of [1400, 960, 640]) {
  const suffix = w === 1400 ? '' : `-${w === 960 ? 960 : 640}`;
  await sharp(graded).resize(w).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}${suffix}.jpg`);
}
console.log('OK grade B ->', `${OUT}.jpg (+ -640/-960)`, `${W}x${H}`);
