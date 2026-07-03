# Setup do domínio próprio — azrep.com.br

**Status: PENDENTE** — aguardando a empresa do domínio confirmar que configurou o DNS.

Hospedagem: **GitHub Pages** (repo `ThQMS/AZ-Landing-Page`, branch `main`, raiz).
Domínio: **azrep.com.br** (mesmo do e-mail `atendimento@azrep.com.br`).

---

## 1. O que a empresa do domínio precisa configurar (DNS)
Verificado em 2026-07-03 (docs oficiais do GitHub + DNS ao vivo de `thqms.github.io`):

- **Registros A** para `azrep.com.br` → os 4 IPs do GitHub Pages:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- **Registro CNAME** para `www.azrep.com.br` → `thqms.github.io`

### Como conferir se o DNS já propagou (antes de fazer os passos abaixo)
```
nslookup azrep.com.br
```
Só seguir quando retornar os 4 IPs `185.199.108–111.153`.

---

## 2. Quando o DNS estiver confirmado — fazer NUM COMMIT SÓ

### (a) Criar o arquivo `CNAME` na raiz do repositório
Conteúdo (exatamente uma linha, sem `http`, sem `www`, sem barra):
```
azrep.com.br
```

### (b) Atualizar as URLs de preview (Open Graph) no `index.html`
Trocar `https://thqms.github.io/AZ-Landing-Page` → `https://azrep.com.br` nestas tags do `<head>`:

| Tag | De | Para |
|---|---|---|
| `og:url` | `https://thqms.github.io/AZ-Landing-Page/` | `https://azrep.com.br/` |
| `og:image` | `https://thqms.github.io/AZ-Landing-Page/assets/logo-az-purple.png` | `https://azrep.com.br/assets/logo-az-purple.png` |
| `twitter:image` | `https://thqms.github.io/AZ-Landing-Page/assets/logo-az-purple.png` | `https://azrep.com.br/assets/logo-az-purple.png` |

(o comentário acima das tags OG também menciona a base antiga — atualizar junto.)

Depois: `git add -A && git commit && git push`.

### (c) No GitHub (interface web)
1. Repo → **Settings → Pages → Custom domain** → digitar `azrep.com.br` → **Save**.
   - (isso também cria/valida o `CNAME`; se já commitei o arquivo, ele só reconhece.)
2. Aguardar a verificação do DNS ficar verde.
3. Marcar **Enforce HTTPS** (o GitHub emite o certificado SSL grátis — sem Cloudflare).

---

## ⚠️ NÃO fazer nada disso ANTES do DNS estar pronto
Se colocar o domínio no GitHub antes do DNS resolver, o endereço atual
(`thqms.github.io/AZ-Landing-Page`) passa a redirecionar pra um domínio que
ainda não funciona → **site fora do ar** até propagar. Ordem: DNS primeiro,
depois passos 2(a/b/c).

## Não precisa de Cloudflare
O GitHub Pages faz tudo (domínio próprio + HTTPS grátis). Cloudflare seria só
uma camada opcional, não é necessário.
