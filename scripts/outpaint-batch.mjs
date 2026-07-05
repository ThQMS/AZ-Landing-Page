// Lote de outpainting via Replicate (usa outpaint.mjs). Gera web 16:9 (2560w) e
// celular 9:16 (1620w) a partir da ORIGINAL de cada foto, salvando nas melhoradas.
import { outpaint } from './outpaint.mjs';
import sharp from 'sharp';
import fs from 'node:fs';

const TMP = process.env.OP_TMP || '.';
const MOB_BIAS = 0.4;

// [pasta, base, web?, mob?]
const JOBS = [
  ['Images_Sala_Estar/melhoradas', 'sala_04', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_05', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_06', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_07', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_08', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_09', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_10', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_11', true, true],
  ['Images_Sala_Estar/melhoradas', 'sala_12', false, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_01', true, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_02', true, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_03', true, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_04', true, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_05', true, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_06', true, true],
  ['Images_Sala_Jantar/melhoradas', 'jantar_07', true, true],
  ['Images_Quarto/melhoradas', 'quarto_01', true, true],
  ['Images_Quarto/melhoradas', 'quarto_02', true, true],
  ['Images_Quarto/melhoradas', 'quarto_03', true, true],
  ['Images_Quarto/melhoradas', 'quarto_04', true, true],
  ['Images_Quarto/melhoradas', 'quarto_05', true, true],
  ['Images_Office/melhoradas', 'office_01', true, true],
  ['Images_Office/melhoradas', 'office_02', true, true],
  ['Images_Office/melhoradas', 'office_03', true, true],
  ['Images_Office/melhoradas', 'office_04', true, true],
  ['Images_Office/melhoradas', 'office_05', true, true],
  ['Images_Externas/melhoradas', 'externa_01', false, true],
  ['Images_Externas/melhoradas', 'externa_02', false, true],
  ['Images_Externas/melhoradas', 'externa_03', false, true],
  ['Images_Externas/melhoradas', 'externa_04', false, true],
  ['Images_Externas/melhoradas', 'externa_05', false, true],
  ['Images_Externas/melhoradas', 'externa_06', false, true],
  ['Images_Externas/melhoradas', 'externa_07', false, true],
];

async function withRetry(fn, label) {
  for (let i = 0; i < 2; i++) {
    try { return await fn(); }
    catch (e) { console.log(`  ! ${label} tentativa ${i + 1} falhou: ${e.message}`); if (i === 1) throw e; }
  }
}

const only = process.argv[2]; // opcional: filtra por prefixo (ex.: "jantar")
const jobs = only ? JOBS.filter(j => j[1].startsWith(only)) : JOBS;
const failures = [];
let n = 0;
for (const [dir, base, web, mob] of jobs) {
  n++;
  const srcJpg = `${dir}/${base}.jpg`;
  const tmp = `${TMP}/__orig_${base}.jpg`;
  fs.copyFileSync(srcJpg, tmp); // congela a original antes de sobrescrever a web
  console.log(`[${n}/${jobs.length}] ${base} ${web ? 'web' : ''}${mob ? ' mob' : ''}`);
  try {
    if (mob) { const r = await withRetry(() => outpaint(tmp, '9:16', `${dir}/${base}-m.jpg`, MOB_BIAS, 1620), `${base} mob`); console.log(`   mob ok ${r.width}x${r.height} ${r.kb}KB`); }
    if (web) { const r = await withRetry(() => outpaint(tmp, '16:9', `${dir}/${base}.jpg`, 0.5, 2560), `${base} web`); console.log(`   web ok ${r.width}x${r.height} ${r.kb}KB`); }
  } catch (e) {
    console.log(`   XX ${base} FALHOU: ${e.message}`);
    failures.push(base);
  } finally { try { fs.unlinkSync(tmp); } catch {} }
}
console.log(`\n=== FIM. ${jobs.length - failures.length}/${jobs.length} ok. Falhas: ${failures.join(', ') || 'nenhuma'} ===`);
