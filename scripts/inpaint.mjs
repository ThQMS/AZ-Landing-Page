// =====================================================================
// inpaint.mjs — remove a marca d'água de IA (estrela + facho) da foto do
// mostruário via Replicate FLUX.1 Fill [pro] (inpainting). Máscara cobre
// SÓ a marca; o resto da foto continua pixel-perfect (composite dest-in).
//
// Uso:
//   node scripts/inpaint.mjs <src.png> <out.png>          (roda o inpaint)
//   MASK_PREVIEW=1 node scripts/inpaint.mjs <src.png> <preview.jpg>  (só overlay da máscara)
//   token lido de .replicate_token
// =====================================================================
import sharp from 'sharp';
import fs from 'node:fs';

const MODEL = 'black-forest-labs/flux-fill-pro';
const MODEL_LONG = 1440;   // res de trabalho no modelo
const FEATHER = 22;        // suaviza a emenda (px na escala do crop)

// Região de trabalho (full-res) que contém a marca, com contexto ao redor.
const CROP = { left: 2700, top: 3950, width: 884, height: 830 };

// Máscara em coords ORIGINAIS: polígono do cone/facho + elipse na estrela.
const POLY = [
  [2930, 4170], [3110, 4170], [3240, 4300], [3520, 4480],
  [3540, 4650], [3300, 4710], [3020, 4710], [2890, 4450], [2890, 4280],
];
const STAR = { cx: 3055, cy: 4290, r: 135 };

function toLocal([x, y]) { return [x - CROP.left, y - CROP.top]; }

async function uploadFile(buf, name, TOKEN) {
  const fd = new FormData();
  fd.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: fd,
  });
  if (!r.ok) throw new Error(`upload ${name}: ${r.status} ${await r.text()}`);
  return (await r.json()).urls.get;
}

async function predict(imageUrl, maskUrl, TOKEN) {
  const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify({ input: {
      image: imageUrl, mask: maskUrl, prompt: '',
      steps: 50, guidance: 60, output_format: 'png', safety_tolerance: 6,
    } }),
  });
  const j = await r.json();
  if (j.error) throw new Error('predict: ' + JSON.stringify(j.error));
  if (j.status !== 'succeeded') throw new Error('predict status ' + j.status + ' ' + JSON.stringify(j));
  const out = Array.isArray(j.output) ? j.output[0] : j.output;
  const img = await fetch(out);
  return Buffer.from(await img.arrayBuffer());
}

// SVG da máscara em coords locais do crop (branco = preencher).
function maskSvg(bg, fg) {
  const pts = POLY.map(toLocal).map(([x, y]) => `${x},${y}`).join(' ');
  const [scx, scy] = toLocal([STAR.cx, STAR.cy]);
  return Buffer.from(
    `<svg width='${CROP.width}' height='${CROP.height}'>` +
    `<rect width='${CROP.width}' height='${CROP.height}' fill='${bg}'/>` +
    `<polygon points='${pts}' fill='${fg}'/>` +
    `<ellipse cx='${scx}' cy='${scy}' rx='${STAR.r}' ry='${STAR.r}' fill='${fg}'/>` +
    `</svg>`);
}

const [src, out] = process.argv.slice(2);

if (process.env.MASK_PREVIEW) {
  // overlay vermelho semi-transparente da máscara sobre o crop, p/ conferência
  const crop = await sharp(src).extract(CROP).png().toBuffer();
  const overlay = await sharp(maskSvg('#00000000', '#ff000088')).resize(CROP.width, CROP.height).png().toBuffer();
  const comp = await sharp(crop).composite([{ input: overlay }]).png().toBuffer();
  await sharp(comp).resize(760).jpeg({ quality: 92 }).toFile(out);
  console.log('MASK_PREVIEW ->', out);
} else {
  const TOKEN = fs.readFileSync('.replicate_token', 'utf8').trim();
  const cropBuf = await sharp(src).extract(CROP).png().toBuffer();
  // máscara full-res do crop (feather) — usada tanto p/ modelo quanto p/ recompor
  const maskFull = await sharp(maskSvg('black', 'white')).resize(CROP.width, CROP.height).blur(FEATHER / 2).toColourspace('b-w').png().toBuffer();

  // upscale crop+máscara p/ res do modelo
  const scale = MODEL_LONG / Math.max(CROP.width, CROP.height);
  const mW = Math.round(CROP.width * scale), mH = Math.round(CROP.height * scale);
  const cropM = await sharp(cropBuf).resize(mW, mH).png().toBuffer();
  const maskM = await sharp(maskFull).resize(mW, mH).png().toBuffer();

  const imgUrl = await uploadFile(cropM, 'img.png', TOKEN);
  const maskUrl = await uploadFile(maskM, 'mask.png', TOKEN);
  const filled = await predict(imgUrl, maskUrl, TOKEN); // ~mW x mH

  // volta o resultado ao tamanho do crop e aplica a máscara como alfa (dest-in)
  const filledCrop = await sharp(filled).resize(CROP.width, CROP.height, { fit: 'fill' }).ensureAlpha()
    .composite([{ input: maskFull, blend: 'dest-in' }]).png().toBuffer();

  // recompõe só a área da marca sobre a original em full-res
  const composed = await sharp(src)
    .composite([{ input: filledCrop, left: CROP.left, top: CROP.top }])
    .png().toBuffer();
  fs.writeFileSync(out, composed);
  const m = await sharp(out).metadata();
  console.log('OK', out, m.width + 'x' + m.height);
}
