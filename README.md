# Two Brothers Social

Agendador interno (feed, Reels, stories) + respostas automáticas de DM para Instagram e Facebook.
Substitui o mLabs. Clientes e contas já vêm cadastrados (migrados do mLabs).

## Rodar

```bash
cp .env.example .env   # preencha
npm install
npm run build && npm start
```

O agendador roda dentro do servidor (a cada 30s publica o que venceu). Mantenha **um único processo** rodando 24h
(VPS, Railway, Render ou Fly com disco persistente para `data/`).

## Configuração da Meta

1. developers.facebook.com → criar app tipo **Business**, vinculado ao seu Business Portfolio (verifique o Business).
2. Adicionar produtos: **Facebook Login for Business**, **Instagram** (API com login do Facebook) e **Webhooks**.
3. Em Login: URI de redirecionamento = `PUBLIC_BASE_URL/api/meta/callback`.
4. Em Webhooks → Instagram: callback = `PUBLIC_BASE_URL/api/webhooks/meta`, token = `META_VERIFY_TOKEN`,
   assinar o campo `messages`.
5. Preencher `META_APP_ID` e `META_APP_SECRET` no `.env`.
6. Clientes dão acesso às páginas/Instagram pelo seu Business Manager (ou você faz login com um usuário que administra as páginas).
7. No painel → **Contas** → "Conectar com a Meta" → vincular cada conta ao seu cliente.

Permissões usadas: `pages_show_list, pages_read_engagement, pages_manage_posts, pages_messaging,
instagram_basic, instagram_content_publish, instagram_manage_messages, business_management`.

## Limites conhecidos

- A mídia precisa estar numa URL pública: `PUBLIC_BASE_URL` tem que ser acessível pela internet (HTTPS).
- Story: só foto/vídeo; stickers, música e links não vão pela API.
- DM: só responde dentro de 24h após a mensagem do usuário.
- Carrossel e TikTok: ainda não implementados.
- Mídia fica em `data/uploads` (faça backup de `data/`).
