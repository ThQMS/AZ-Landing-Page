# AZ Representações — Guia do Projeto

Landing page institucional de **página única** para representante comercial de mobiliário de alto padrão. Estética "galeria noturna" (paleta escura, luxo).

## Arquitetura

- **HTML + app compilado:** o `index.html` tem todo o CSS (no `<style>`) e o markup. O app React fica em **`app.jsx`** (fonte editável) e é **pré-compilado** para `app.js` (minificado), carregado via `<script src="app.js">`. **Não há mais Babel no navegador.**
- **Via CDN:** React 18 (produção min), ReactDOM e **Lenis** (smooth scroll). O Babel foi removido (o JSX é compilado localmente com esbuild).
- **Tema claro/escuro:** o `<html>` abre com `data-theme="light"` (claro é o PADRÃO). O modo claro **inverte as variáveis de cor** (ex.: `--cream` vira escuro `#1d1726`). ⚠️ Ver "Gotchas".
- **Onde editar:**
  - **CSS / markup / tags `<head>`** → `index.html`.
  - **App React (componentes, lógica, dados do carrossel)** → `app.jsx`, e depois **recompilar** com `npm run build` (gera `app.js`). Nunca editar `app.js` à mão.
  - Não existe mais `index_carrossel.html` (versão em dev, já promovida) nem `bundle.html`.

## Estrutura de arquivos
```
index.html                    → HTML + CSS + <script src="app.js">
app.jsx                       → FONTE do app React (editar aqui)
app.js                        → compilado/minificado (gerado; não editar)
package.json                  → script de build (esbuild)
Images_Office/melhoradas/     → 5 fotos do office (usadas no site)
Images_Office/*.jpeg          → originais WhatsApp (backup, não usadas)
Images_Quarto/melhoradas/     → 5 fotos do quarto (usadas)
Images_Quarto/*.jpeg          → originais WhatsApp (backup)
assets/                       → image.png (bg), logo-az-purple.png
assets/logos/                 → 7 logos das fábricas usados no site (adm, bux, century, iummi, pv, schuster, tumar)
README.md                     → documentação funcional do projeto
```
> A pasta `fwdlogosfbricas/` (28 MB de material bruto das fábricas) foi **removida** do repo em 2026-07-02 — só os 7 logos usados foram movidos p/ `assets/logos/`. Os brutos seguem no histórico do Git.

## Estética (tokens)
- Fontes: `--display` (Bodoni Moda, serifada), `--serif` (Cormorant Garamond), `--sans` (Manrope).
- Cores: champagne `#b8a082` (metais/detalhes), plum/creme escuros. Use as vars `--champagne`, `--cream`, `--cream-2/3`, `--ink-*`.
- Animações suaves com `cubic-bezier(0.16, 1, 0.3, 1)`; usar classe `reveal` (fade-in no scroll via IntersectionObserver).

## Carrossel de ambientes (seção `#colecao`)
- Dados em `CATEGORIES` (array no JSX). Cada categoria: `{ n, name, desc, shots: [...] }`.
- Cada `shot`: `{ format, src, caption, pos?, fit? }`.
  - **`src`** aponta pra `Images_<Ambiente>/melhoradas/...`. Sem `src` → renderiza `.img-placeholder`.
  - **`pos`** (opcional): ajusta o enquadramento no modo tela cheia. Ex.: `pos: 'center 22%'` (mostra mais o topo). Usar em fotos verticais que cortam parte importante.
  - **`fit: 'contain'`** (opcional): mostra a foto INTEIRA (não corta), preenchendo as laterais com um fundo desfocado da própria imagem. Bom pra fotos muito verticais.
- **Layout estilo Sierra:** cada ambiente é um painel em **tela cheia** (`.carousel` = 100vw full-bleed × 100vh), imagem `object-fit: cover`, título sobreposto (`.carousel-title`), setas SVG chevron, dots, e `.carousel-scrim` (degradê pra legibilidade).
- **Transição:** crossfade (fade + leve zoom), não deslize. Componente `Carousel` usa `.carousel-slide.active` (opacity).

## Comportamentos especiais
- **Navbar transparente sobre as fotos** (`over-media`): a navbar detecta (via scroll) quando um painel `.carousel` está atrás dela e fica transparente com scrim; volta ao sólido no resto. Animado.
- **Snap suave:** ao parar de rolar dentro de `#colecao`, o Lenis assenta no painel mais próximo (`lenis.scrollTo`, duração ~1.15s). Evita "meia seção".

## ⚠️ Gotchas (erros que já custaram tempo)
1. **Modo claro inverte cores:** o texto do carrossel (`.carousel-num/name/desc`) usa **cores claras FIXAS em hex** (`#f4efe4` etc.), NÃO `var(--cream)` — senão some no modo claro.
2. **Especificidade da navbar:** a regra `[data-theme="light"] .nav.over-media` PRECISA vir DEPOIS de `[data-theme="light"] .nav.scrolled` no CSS pra vencer o desempate.
3. **Full-bleed:** painéis usam `width:100vw; margin-left:calc(50% - 50vw)`. O `<html>`/`<body>` tem `overflow-x:hidden` (necessário).

## Como testar visualmente (IMPORTANTE)
Chrome headless **trava** ao carregar o CDN (React/Babel/fontes) — rede instável. Para conferir layout:
1. Montar um **HTML estático de teste** na raiz (mantém caminhos relativos das imagens) replicando só o CSS + markup do trecho.
2. Screenshot via Chrome headless: `C:\Program Files\Google\Chrome\Application\chrome.exe --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1600,900 --virtual-time-budget=5000 --screenshot=out.png file:///...`.
3. Usar `Start-Process ... -PassThru` + `WaitForExit(16000)` + `Kill()` (ele não encerra sozinho).
4. Apagar o HTML de teste depois.

## Pipeline de imagens (fotos são WhatsApp comprimidas ~1600px; cliente NÃO tem as originais das fábricas)
1. Melhorar no **Upscayl** (grátis, 4x — Standard ou UltraSharp).
2. Reduzir p/ **2560px** no lado maior + **JPEG q86** (via System.Drawing no PowerShell) → salvar em `Images_<Ambiente>/melhoradas/` com o MESMO nome-base do `src`.
3. Apontar (ou já está apontado) os `src` do carrossel pra essa pasta.

## Build (compilar o app React)
- Fonte: `app.jsx` → compilado para `app.js` com **esbuild**.
- **Recompilar após editar `app.jsx`:** `npm run build` (ou `npm run watch` p/ recompilar automático ao salvar).
- 1ª vez numa máquina nova: `npm install` (instala o esbuild em `node_modules/`, que é gitignored).
- **Deploy:** publicar `index.html` + `app.js` + as pastas de imagens/assets. O `app.jsx` é só fonte (não é servido).

## Performance (feito / pendente)
- ✅ React em produção (min), preconnect unpkg, `prefers-reduced-motion`, pausa do canvas quando aba oculta.
- ✅ **Babel removido do navegador** — JSX pré-compilado (`app.jsx` → `app.js`). Deixou de baixar ~2,8 MB do Babel e de compilar no cliente a cada carregamento.

## Convenções de trabalho
- Preservar a estética atual em qualquer mudança.
- Antes de apagar imagens: as `melhoradas/` são as ÚNICAS cópias web; originais WhatsApp são backup leve. Nada disso está no Git.
