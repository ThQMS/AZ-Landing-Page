// Remove a marca d'água "✦" (IA) de veludo / couro-natural / jacquard.
// Clone-stamp: copia um retalho de textura logo ACIMA da marca (preserva colunas/veios
// verticais), com alpha suavizado (oval borrada via dest-in) pra não deixar emenda dura.
// Depois recorta 3:4 (cover) e regrava -640/-1040/fallback, igual ao prep-swatches.
// Rodar: node scripts/remove-watermarks.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'Carrosel_Mostruario_Melhorado/upscayl_png_ultrasharp-4x_4x';
const OUT = 'assets/swatches';
const WIDTHS = [640, 1040];
const AR = 3 / 4;

// cx,cy = centro da marca no PNG de origem; w,h = caixa a cobrir (com folga).
const JOBS = [
  { slug: 'veludo',        file: 'WhatsApp Image - Veludo.png',        cx: 2960, cy: 4260, w: 440, h: 480 },
  { slug: 'couro-natural', file: 'WhatsApp Image - Couro Natural.png', cx: 2900, cy: 4560, w: 460, h: 500 },
  { slug: 'jacquard',      file: 'WhatsApp Image - Jacquard.png',      cx: 2905, cy: 4560, w: 460, h: 500 },
];

for (const j of JOBS) {
  const input = `${SRC}/${j.file}`;
  const meta = await sharp(input).metadata();
  const left = Math.round(j.cx - j.w / 2);
  const top = Math.round(j.cy - j.h / 2);
  const patchTop = top - j.h; // retalho imediatamente acima (mesma coluna de textura)
  if (patchTop < 0) throw new Error(`${j.slug}: sem espaço acima p/ o retalho`);

  const patch = await sharp(input)
    .extract({ left, top: patchTop, width: j.w, height: j.h })
    .toBuffer();

  // máscara alfa: oval branca borrada (opaca no centro, esvai nas bordas)
  const mask = Buffer.from(
    `<svg width="${j.w}" height="${j.h}"><ellipse cx="${j.w / 2}" cy="${j.h / 2}" `
    + `rx="${j.w / 2 - 8}" ry="${j.h / 2 - 8}" fill="#fff"/></svg>`);
  const feather = await sharp(mask).blur(26).toBuffer();
  const patchFeathered = await sharp(patch).ensureAlpha()
    .composite([{ input: feather, blend: 'dest-in' }]).png().toBuffer();

  const cleaned = await sharp(input)
    .composite([{ input: patchFeathered, left, top }])
    .toBuffer();

  for (const w of WIDTHS) {
    const h = Math.round(w / AR);
    await sharp(cleaned).resize(w, h, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 86, mozjpeg: true }).toFile(`${OUT}/${j.slug}-${w}.jpg`);
  }
  fs.copyFileSync(`${OUT}/${j.slug}-${WIDTHS.at(-1)}.jpg`, `${OUT}/${j.slug}.jpg`);
  console.log(`  ✓ ${j.slug} — marca removida e reprocessada`);
}
console.log('DONE');
