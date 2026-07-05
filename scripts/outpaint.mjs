// =====================================================================
// outpaint.mjs — expande fotos p/ 16:9 (web) e 9:16 (celular) via
// Replicate FLUX.1 Fill [pro] (outpainting). O Flux preenche só as BORDAS;
// a original em alta resolução é recomposta no centro (mantém nitidez).
//
// Uso:
//   node scripts/outpaint.mjs <src.jpg> <aspect: 16:9|9:16> <out.jpg> [topBiasPct]
//   token lido de .replicate_token
// =====================================================================
import sharp from 'sharp';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const TOKEN = fs.readFileSync('.replicate_token', 'utf8').trim();
const MODEL = 'black-forest-labs/flux-fill-pro';
const MODEL_LONG = 1440;            // resolução de trabalho no modelo (~2MP)
const PROMPT = '';                  // vazio = continuação pura da cena
const FEATHER = 6;                  // suaviza a emenda da máscara (px, escala modelo)

async function uploadFile(buf, name) {
  const fd = new FormData();
  fd.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: fd,
  });
  if (!r.ok) throw new Error(`upload ${name}: ${r.status} ${await r.text()}`);
  return (await r.json()).urls.get;
}

async function predict(imageUrl, maskUrl) {
  const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify({ input: {
      image: imageUrl, mask: maskUrl, prompt: PROMPT,
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

export async function outpaint(srcPath, aspectStr, outPath, topBiasPct = 0.5, finalWidth = 2560) {
  const [aw, ah] = aspectStr.split(':').map(Number);
  const targetAR = aw / ah;
  const meta = await sharp(srcPath).metadata();
  const ow = meta.width, oh = meta.height;
  const srcAR = ow / oh;

  // canvas alvo em resolução CHEIA (mantém a original no tamanho original)
  let fullW, fullH;
  if (targetAR > srcAR) { fullH = oh; fullW = Math.round(oh * targetAR); } // extend lados
  else { fullW = ow; fullH = Math.round(ow / targetAR); }                  // extend topo/base
  const offX = Math.round((fullW - ow) * 0.5);
  const offY = Math.round((fullH - oh) * topBiasPct);

  // canvas em resolução de MODELO
  const scale = MODEL_LONG / Math.max(fullW, fullH);
  const mW = Math.round(fullW * scale), mH = Math.round(fullH * scale);
  const mOw = Math.round(ow * scale), mOh = Math.round(oh * scale);
  const mOffX = Math.round(offX * scale), mOffY = Math.round(offY * scale);

  const smallOrig = await sharp(srcPath).resize(mOw, mOh).png().toBuffer();
  const canvas = await sharp({ create: { width: mW, height: mH, channels: 3, background: { r: 128, g: 128, b: 128 } } })
    .composite([{ input: smallOrig, left: mOffX, top: mOffY }]).png().toBuffer();

  // máscara: branco = preencher (bordas); preto = manter (original). feather nas bordas do retângulo preto.
  const maskSvg = Buffer.from(
    `<svg width='${mW}' height='${mH}'><rect width='${mW}' height='${mH}' fill='white'/>` +
    `<rect x='${mOffX + FEATHER}' y='${mOffY + FEATHER}' width='${mOw - 2 * FEATHER}' height='${mOh - 2 * FEATHER}' rx='2' fill='black'/></svg>`);
  const mask = await sharp(maskSvg).blur(FEATHER / 2).png().toBuffer();

  const imgUrl = await uploadFile(canvas, 'img.png');
  const maskUrl = await uploadFile(mask, 'mask.png');
  const filled = await predict(imgUrl, maskUrl); // mW x mH
  const fmeta = await sharp(filled).metadata();
  if (process.env.OP_DEBUG) console.error(`DBG full=${fullW}x${fullH} model=${mW}x${mH} filled=${fmeta.width}x${fmeta.height} off=${offX},${offY} orig=${ow}x${oh}`);

  // upscale do resultado p/ resolução cheia (RGB) + recompõe a ORIGINAL nítida no centro
  const filledFull = await sharp(filled).resize(fullW, fullH, { fit: 'fill' }).removeAlpha().png().toBuffer();
  // máscara de alfa da original (feather p/ emenda suave), tamanho forçado = ow x oh
  const featherFull = Math.max(2, Math.round(FEATHER / scale));
  const origMask = await sharp(Buffer.from(
    `<svg width='${ow}' height='${oh}'><rect width='${ow}' height='${oh}' fill='black'/>` +
    `<rect x='${featherFull}' y='${featherFull}' width='${ow - 2 * featherFull}' height='${oh - 2 * featherFull}' rx='2' fill='white'/></svg>`))
    .resize(ow, oh, { fit: 'fill' }).blur(featherFull / 2).toColourspace('b-w').toBuffer();
  const origRGBA = await sharp(srcPath).resize(ow, oh, { fit: 'fill' }).ensureAlpha()
    .composite([{ input: origMask, blend: 'dest-in' }]).png().toBuffer();
  if (process.env.OP_DEBUG) {
    const rm = await sharp(origRGBA).metadata(); const bm = await sharp(filledFull).metadata();
    console.error(`DBG2 origRGBA=${rm.width}x${rm.height}ch${rm.channels} base=${bm.width}x${bm.height} placeAt=${offX},${offY}`);
  }
  const composedBuf = await sharp(filledFull)
    .composite([{ input: origRGBA, left: offX, top: offY }]).png().toBuffer();
  const composed = await sharp(composedBuf)
    .resize({ width: finalWidth, withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  fs.writeFileSync(outPath, composed);
  const fm = await sharp(outPath).metadata();
  return { outPath, width: fm.width, height: fm.height, kb: Math.round(fs.statSync(outPath).size / 1024) };
}

// runner CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [src, aspect, out, bias] = process.argv.slice(2);
  outpaint(src, aspect, out, bias ? Number(bias) : 0.5)
    .then((r) => console.log('OK', JSON.stringify(r)))
    .catch((e) => { console.error('ERR', e.message); process.exit(1); });
}
