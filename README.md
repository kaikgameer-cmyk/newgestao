# New Gestão

Aplicação web para controle financeiro de motoristas (New Gestão).

## Backend (Auth) — URLs obrigatórias

Se você clicar em um email de **definir senha / recuperação** e cair em uma página de “Publish or update…”, isso normalmente significa que o backend está **ignorando** o `redirect_to` por **Site URL** ou **Redirect URLs** incorretos.

Configure no painel do backend:

- **Site URL**: `https://newgestao.app`
- **Redirect URLs (allowlist)**:
  - `https://newgestao.app/*`
  - `https://newgestao.app/definir-senha`
  - `https://newgestao.app/login`

> Observação: este projeto força **sempre** links para `https://newgestao.app/definir-senha` e bloqueia envio se detectar `lovable.app`.

## Desenvolvimento

- Vite + React + TypeScript
- shadcn-ui + Tailwind CSS

### Rodar localmente

```sh
npm i
npm run dev
```

