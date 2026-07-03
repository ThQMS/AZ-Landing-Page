// =====================================================================
// make-carousel-variants.mjs
// Gera variantes responsivas (srcset) das fotos do carrossel usando `sharp`.
//
// Para cada foto "base" em Images_<Ambiente>/melhoradas/*.jpg gera:
//   nome-640.jpg, nome-1280.jpg, nome-1600.jpg   (por LARGURA, JPEG q86)
// O arquivo original permanece como o maior candidato (rotulo 2560w no app).
//
// - Nunca faz upscale: pula qualquer largura-alvo >= largura nativa.
// - Idempotente: ignora arquivos que ja sao variantes (sufixo -NNN.jpg).
//
// COMO USAR (na raiz do projeto):
//   npm install sharp        (uma vez; sharp usa libvips, nao o GDI+ do Windows)
//   node scripts/make-carousel-variants.mjs
// O app.jsx monta o srcset sozinho (buildSrcSet) — nenhum dado manual por foto.
// =====================================================================

import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const WIDTHS = [640, 1280, 1600];
const QUALITY = 86;
const DIRS = ['Images_Quarto/melhoradas', 'Images_Office/melhoradas'];

for (const dir of DIRS) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    continue;
  }
  const bases = files.filter(
    (f) => /\.jpe?g$/i.test(f) && !/-\d+\.jpe?g$/i.test(f)
  );
  console.log(`[${dir}] ${bases.length} fotos base`);
  for (const file of bases) {
    const inPath = path.join(dir, file);
    const base = file.replace(/\.jpe?g$/i, '');
    const meta = await sharp(inPath).metadata();
    for (const w of WIDTHS) {
      if (w >= meta.width) continue; // nunca faz upscale
      const out = path.join(dir, `${base}-${w}.jpg`);
      await sharp(inPath)
        .resize({ width: w, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(out);
      console.log(`  ${base}-${w}.jpg`);
    }
  }
}
console.log('OK');
