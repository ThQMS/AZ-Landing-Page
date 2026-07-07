// Prepara as amostras do Mostruário (seção Sobre) a partir dos PNGs 4x da Upscayl.
// Corta cada foto para o slot RETRATO 3:4 (cover, centro), reduz e salva JPEG q86
// em assets/swatches/<slug>-640.jpg e -1040.jpg (+ <slug>.jpg = fallback = 1040).
// Larguras uniformes p/ todos (evita srcset apontando arquivo inexistente); as poucas
// fotos pequenas (Latão etc.) sofrem leve upscale — aceitável num swatch de textura.
//
// Rodar: node scripts/prep-swatches.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'Carrosel_Mostruario_Melhorado/upscayl_png_ultrasharp-4x_4x';
const OUT_DIR = 'assets/swatches';
const WIDTHS = [640, 1040];       // 1x e 2x do slot de 520px
const AR = 3 / 4;                 // retrato 3:4 (largura/altura)
const Q = 86;

// arquivo (sem extensão) -> slug kebab sem acento. Nome/tipo ficam no app.jsx.
const MAP = {
  'WhatsApp Image - Boucle': 'boucle',
  'WhatsApp Image - Camurça': 'camurca',
  'WhatsApp Image - Couro Natural': 'couro-natural',
  'WhatsApp Image - Jacquard': 'jacquard',
  'WhatsApp Image - Laca': 'laca',
  'WhatsApp Image - Latão Polido': 'latao-polido',
  'WhatsApp Image - Linho Sintético': 'linho-sintetico',
  'WhatsApp Image - Mármore Nuvolato': 'marmore-nuvolato',
  'WhatsApp Image - Mármore Travertino Romano': 'travertino-romano',
  'WhatsApp Image - Mármore Verde Guatemala': 'verde-guatemala',
  'WhatsApp Image - Nogueira': 'nogueira',
  'WhatsApp Image - Palha Sextavada Natural': 'palha-sextavada',
  'WhatsApp Image - Recouro': 'recouro',
  'WhatsApp Image - Veludo': 'veludo',
  'WhatsApp Image - Wengue': 'wengue',
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(SRC_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
let done = 0;
for (const file of files) {
  const stem = file.replace(/\.[^.]+$/, '');
  const slug = MAP[stem];
  if (!slug) { console.warn('  ? sem slug p/', file, '— pulado'); continue; }
  const input = path.join(SRC_DIR, file);
  for (const w of WIDTHS) {
    const h = Math.round(w / AR); // 640->853, 1040->1387
    await sharp(input)
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: Q, mozjpeg: true })
      .toFile(path.join(OUT_DIR, `${slug}-${w}.jpg`));
  }
  // fallback sem sufixo = a maior variante
  fs.copyFileSync(path.join(OUT_DIR, `${slug}-${WIDTHS.at(-1)}.jpg`), path.join(OUT_DIR, `${slug}.jpg`));
  done++;
  console.log(`  ✓ ${slug}`);
}
console.log(`\n${done} amostras geradas em ${OUT_DIR}/ (${WIDTHS.join('/')}w + fallback).`);
