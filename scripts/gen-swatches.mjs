import sharp from 'sharp';
import fs from 'node:fs';

const MODEL = 'black-forest-labs/flux-1.1-pro';
const TOKEN = process.env.REPLICATE_API_TOKEN
  || (fs.existsSync('.replicate_token') ? fs.readFileSync('.replicate_token', 'utf8').trim() : '');
if (!TOKEN) { console.error('faltando REPLICATE_API_TOKEN ou .replicate_token'); process.exit(1); }

const OUTDIR = 'assets/swatches';
fs.mkdirSync(OUTDIR, { recursive: true });

const BASE = 'top-down flat lay, a single material swatch filling the entire frame, '
  + 'soft even studio lighting, high-detail macro texture, photorealistic, seamless, '
  + 'no text, no labels, no props, no hands, editorial luxury catalog photography';

const SWATCHES = [
  { file: 'linho',    prompt: 'natural linen fabric, warm greige oatmeal tone, visible woven threads, matte finish' },
  { file: 'couro',    prompt: 'full-grain aniline leather, warm cognac tan color, natural grain with subtle soft sheen' },
  { file: 'veludo',   prompt: 'plush velvet fabric, deep plum aubergine purple color, soft dense pile with gentle sheen' },
  { file: 'nogueira', prompt: 'walnut wood veneer, rich warm brown, elegant straight grain, satin finish' },
  { file: 'marmore',  prompt: 'polished marble slab, warm cream ivory with subtle soft grey and gold veining' },
  { file: 'latao',    prompt: 'brushed brass metal sheet, warm champagne gold, fine horizontal brushed texture, soft reflection' },
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function generate(prompt) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
      body: JSON.stringify({ input: {
        prompt: `${prompt}, ${BASE}`,
        aspect_ratio: '1:1',
        output_format: 'jpg',
        safety_tolerance: 6,
        prompt_upsampling: true,
      } }),
    });
    if (r.status === 429) {
      const wait = (Number(r.headers.get('retry-after')) || 12) + 2;
      console.log(`  429, aguardando ${wait}s...`);
      await sleep(wait * 1000);
      continue;
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

for (let i = 0; i < SWATCHES.length; i++) {
  const s = SWATCHES[i];
  const raw = await generate(s.prompt);
  await sharp(raw).resize(720, 720, { fit: 'cover' }).jpeg({ quality: 85, mozjpeg: true })
    .toFile(`${OUTDIR}/${s.file}.jpg`);
  console.log('ok', s.file);
  if (i < SWATCHES.length - 1) await sleep(11000); // respeita ~6 req/min
}
console.log('DONE', SWATCHES.length, 'swatches ->', OUTDIR);
