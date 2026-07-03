# Setup do domínio próprio — GitHub Pages

**Status: PENDENTE** — registrar um domínio NOVO (do zero) e apontar pro site.

Hospedagem: **GitHub Pages** (repo `ThQMS/AZ-Landing-Page`, branch `main`, raiz) — já pronta.
Decisão (2026-07-03): o cliente pediu pra registrarmos um **domínio novo** (não usar o `azrep.com.br` do e-mail).

---

## 1. Escolher e registrar o domínio (Registro.br)
`.com.br` é o indicado (empresa BR). Registrar em **registro.br** (oficial, ~R$40/ano).

**Nomes disponíveis conferidos em 2026-07-03** (`azrepresentacoes.com.br` está OCUPADO):
- ✅ `azrepresentacao.com.br` (mais fiel à marca — singular)
- ✅ `azmobiliario.com.br`
- ✅ `azliving.com.br`
- ✅ `azreps.com.br`

Passos:
1. registro.br → busca o nome → "Registrar".
2. Login com **CPF/CNPJ**. ⚠️ Registrar no **CNPJ do cliente** (o domínio tem que ser do cliente).
3. Pagar (~R$40/ano).

> Definir o nome final e substituir `<SEU-DOMINIO>` abaixo por ele (ex.: `azrepresentacao.com.br`).

---

## 2. Apontar o DNS (no painel do Registro.br)
Domínio novo, sem e-mail → sem risco de derrubar nada. Adicionar:
- **Registros A** (`@` / raiz) → os 4 IPs do GitHub Pages:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- **Registro CNAME** (`www`) → `thqms.github.io`

Conferir propagação: `nslookup <SEU-DOMINIO>` → tem que retornar os 4 IPs.
(IPs verificados: docs oficiais do GitHub + DNS ao vivo de `thqms.github.io`. Não precisa de Cloudflare.)

---

## 3. Quando o DNS propagar — fazer NUM COMMIT SÓ

### (a) Criar o arquivo `CNAME` na raiz do repositório
Conteúdo (uma linha, sem `http`, sem `www`, sem barra):
```
<SEU-DOMINIO>
```

### (b) Atualizar as URLs de preview (Open Graph) no `index.html`
Trocar `https://thqms.github.io/AZ-Landing-Page` → `https://<SEU-DOMINIO>`:

| Tag | Para |
|---|---|
| `og:url` | `https://<SEU-DOMINIO>/` |
| `og:image` | `https://<SEU-DOMINIO>/assets/logo-az-purple.png` |
| `twitter:image` | `https://<SEU-DOMINIO>/assets/logo-az-purple.png` |

(atualizar também o comentário acima das tags OG.) Depois: `git add -A && commit && push`.

### (c) No GitHub (interface web)
1. Repo → **Settings → Pages → Custom domain** → `<SEU-DOMINIO>` → **Save**.
2. Aguardar a verificação ficar verde.
3. Marcar **Enforce HTTPS** (certificado SSL grátis do GitHub).

---

## Resultado — URL final
Com o domínio próprio, o site é servido na **raiz** (o `/AZ-Landing-Page` some):
```
https://<SEU-DOMINIO>
```
`www.<SEU-DOMINIO>` também funciona (redireciona pro principal), tudo com HTTPS.

## ⚠️ Ordem importa
Só fazer o passo 3 DEPOIS do DNS propagar. Se colocar o domínio no GitHub antes,
o endereço atual (`thqms.github.io/AZ-Landing-Page`) redireciona pra um domínio
que ainda não resolve → site fora do ar até propagar.
