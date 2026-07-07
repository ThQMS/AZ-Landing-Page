# Guia — Mostruário interativo (carrossel de amostras)

Direção escolhida (2026-07-06) para o slot da foto na seção **Sobre**: em vez de uma
foto estática do mostruário, um **carrossel de amostras de materiais** (tecido, couro,
madeira, pedra, metal) — "mostruário vivo". Ainda é **protótipo isolado**; o `index.html`
não foi alterado. Só integrar no `app.jsx` quando aprovado.

> Contexto de como chegamos aqui: a foto do mostruário parecia "distante"/genérica e não
> "casava" com a estética. Testamos (e descartamos) color grade frio via IA e recortes mais
> fechados. A ideia do cliente foi transformar a própria imagem num mostruário interativo.

## Arquivos
```
mostruario.html                 → protótipo do carrossel (standalone, dentro de um mock do Sobre)
scripts/gen-swatches.mjs        → gera as texturas das amostras via Replicate (flux-1.1-pro)
assets/swatches/*.jpg           → 6 texturas 720×720 (linho, couro, veludo, nogueira, marmore, latao)
```

## Amostras (geradas por IA)
- Modelo **`black-forest-labs/flux-1.1-pro`** (texto→imagem), 1:1, prompts de "flat lay top-down,
  macro, luz de estúdio, sem texto/props". Cores escolhidas pra **harmonizar com a paleta**:
  veludo = plum (`#3d1f4a`), latão = champagne (`#b8a082`), linho/greige, couro cognac,
  nogueira, mármore creme com veios dourados.
- Token: `REPLICATE_API_TOKEN` (env) com fallback pra `.replicate_token` (gitignored). **Não hardcodar.**
- ⚠️ **Rate limit**: com < US$5 de crédito, a Replicate limita a **6 req/min (burst 1)**. O script já
  faz retry no 429 (usa `retry-after`) e espaça ~11s entre chamadas.
- Rodar: `node scripts/gen-swatches.mjs` (regenera as 6). Editar cores/materiais no array `SWATCHES`.

## Dados (estrutura no `mostruario.html`)
Array `MATERIALS`: `{ file, name, type, maker }`. Trocar/adicionar amostras aqui.
- ⚠️ **`maker` (fábrica) é ILUSTRATIVO/placeholder** — a textura é gerada por IA, não é o produto
  real da fábrica. Pro site de verdade, isso deve refletir fotos/dados reais de cada fábrica
  (ADM, Bux, Century, Iummi, Ponto Vírgula, Schuster, Tumar).

## Comportamento do carrossel
- Ocupa **o mesmo slot da foto**: retrato **3:4**, `width: min(100%, 520px)`, alinhado à direita
  do texto (`justify-self: end`); no mobile empilha e centraliza.
- **Crossfade** (`opacity`, `.active`) + **ken-burns** sutil (img `scale(1.08)→1` em 6s) — mesma
  linguagem do carrossel do `#colecao`.
- **Autoplay** ~3,8s, **pausa no hover** e retoma ao sair. Setas chevron + dots champagne.
- Legenda sobreposta: nome (fonte display), tipo (tag topo), fábrica (champagne), contador `01 / 06`.

## ⚠️ Gotchas
1. **Colapso de largura (o bug que escondeu o carrossel):** a caixa do carrossel só tem filhos
   `position: absolute` → largura de conteúdo = 0. Num **grid item**, `margin-left: auto` desliga o
   stretch e a caixa encolhe pra **0px** (com `aspect-ratio`, 0 de altura também = invisível). A
   `<img>` da foto original não sofria porque imagem tem largura intrínseca. **Solução:** dar largura
   explícita (`width: min(100%, 520px)` + `justify-self: end`), nunca depender de conteúdo absoluto.
2. **Tema claro/escuro:** a legenda usa **hex claro fixo** (`#f4efe4`, `#cbb593`), não `var(--cream)`,
   senão some no modo claro (mesmo gotcha do carrossel principal). Manter isso na integração.

## Integração futura (quando aprovado) — não feito ainda
- No `app.jsx`, trocar a `<img className="sobre-media">` por um componente `<SwatchCarousel>`
  (mesma lógica do `Carousel` existente: `.active` + crossfade). Respeitar tema claro/escuro.
- Recompilar (`npm run build`) e **incrementar `?v=N`** do `app.js` no `index.html` (cache-busting).
- Gerar variantes srcset das amostras se forem exibidas grandes (hoje 720px basta pro slot).

## Pendências / decisões em aberto
- Atribuição real **material → fábrica** (hoje placeholder).
- Talvez **mais amostras** pra dar variedade; talvez faixa de miniaturas embaixo.
- Confirmar visual no **modo claro** do site (protótipo está no escuro).
