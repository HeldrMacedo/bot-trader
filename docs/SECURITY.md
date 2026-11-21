# Segurança

## Segredos

- Nunca versionar: `.env`, tokens Deriv (`activeToken`, OAuth), JWT, senhas, dumps de `localStorage`.
- Docs e testes usam valores obviamente fictícios. `docsHarness.test.ts` falha se um doc vivo contiver um JWT, um token OAuth da Deriv ou um `activeToken` preenchido.
- Incidente registrado: `localstorage.md` e `docs/localStorage.md` continham tokens reais e foram removidos do working tree. **O histórico do git ainda os contém** — ver [dívida técnica](exec-plans/tech-debt-tracker.md) (revogar tokens e, se o repo for compartilhado, reescrever histórico).

## Autenticação

- JWT HS256, 8h, cookie HttpOnly `auth_token` + `localStorage.access_token`.
- Server: `src/middleware.ts` (Edge, `jose`). Client: `(withSidebar)/layout.js`. API: `jsonwebtoken` (Node).
- Rotas públicas: `/login`, `/img`, `/api/login`, `/api/register`, `/api/forgot-password`, `/api/reset-password`, `/api/logout`. Detalhes em [AUTH_ROUTES.md](AUTH_ROUTES.md).
- Senhas com `bcrypt` (login, reset, profile).
- Rate limit: `src/app/lib/rateLimiter.js`, janela deslizante em memória, **instância única** (15 min / 5 tentativas por padrão). Não vale para múltiplas réplicas.

## Deriv

- `NEXT_PUBLIC_APPID` é público por design. Tokens de trading só trafegam via OTP (`/api/deriv-otp`) e ficam na conta do usuário em `localStorage`.
- Tokens no `localStorage` são legíveis por qualquer XSS: não adicionar HTML não sanitizado nem scripts de terceiros.

## Checklist de mudança

- [ ] Nova rota API: está protegida pelo middleware ou deliberadamente pública e listada em `PUBLIC_PATHS`?
- [ ] Entrada validada na fronteira?
- [ ] Nenhum segredo em log, doc, teste ou fixture?
