// Regenera só a amostra de LATÃO (a original é um disco sobre fundo branco, destoa).
// Gera uma textura de latão escovado preenchendo TODO o quadro 3:4, na paleta champagne,
// e escreve assets/swatches/latao-polido-{640,1040}.jpg (+ fallback), igual às outras.
// Rodar: node scripts/gen-latao.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const MODEL = 'black-forest-labs/flux-1.1-pro';
const TOKEN = process.env.REPLICATE_API_TOKEN
  || (fs.existsSync('.replicate_token') ? fs.readFileSync('.replicate_token', 'utf8').trim() : '');
if (!TOKEN) { console.error('faltando REPLICATE_API_TOKEN ou .replicate_token'); process.exit(1); }

const PROMPT = 'top-down flat lay, a single sheet of brushed polished brass metal filling the '
  + 'entire frame edge to edge, warm champagne gold tone, fine horizontal brushed satin texture, '
  + 'soft even studio reflection with a gentle gradient, no background, no white border, no disc, '
  + 'no object, seamless surface, high-detail macro, photorealistic, no text, no labels, no props, '
  + 'no hands, editorial luxury catalog photography';

const OUT = 'assets/swatches';
const WIDTHS = [640, 1040];
const AR = 3 / 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
      body: JSON.stringify({ input: {
        prompt: PROMPT, aspect_ratio: '3:4', output_format: 'jpg',
        safety_tolerance: 6, prompt_upsampling: true,
      } }),
    });
    if (r.status === 429) {
      const wait = (Number(r.headers.get('retry-after')) || 12) + 2;
      console.log(`  429, aguardando ${wait}s...`); await sleep(wait * 1000); continue;
    }
    const j = await r.json();
    if (j.error) throw new Error('predict: ' + JSON.stringify(j.error));
    if (j.status !== 'succeeded') throw new Error('status ' + j.status + ' ' + JSON.stringify(j));
    const out = Array.isArray(j.output) ? j.output[0] : j.output;
    const img = await fetch(out);
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error('excedidas as tentativas (429)');
}

const raw = await generate();
for (const w of WIDTHS) {
  const h = Math.round(w / AR);
  await sharp(raw).resize(w, h, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true }).toFile(`${OUT}/latao-polido-${w}.jpg`);
}
fs.copyFileSync(`${OUT}/latao-polido-${WIDTHS.at(-1)}.jpg`, `${OUT}/latao-polido.jpg`);
console.log('ok latao-polido (regenerado, 3:4 cheio)');
