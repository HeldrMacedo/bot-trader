# Autenticação e Proteção de Rotas

## Visão Geral

O sistema usa **JWT (HS256, 8h de validade)** com dupla camada de proteção:

1. **Server-side** — `src/middleware.ts` intercepta toda requisição antes de chegar ao Next.js
2. **Client-side** — `(withSidebar)/layout.js` redireciona se `getUser()` retornar falso

### Fluxo de autenticação

```
Usuário acessa /bottrader
        │
        ▼
  middleware.ts
  ┌─────────────────────────────┐
  │ Cookie auth_token presente? │
  │   Não → redirect /login     │
  │   Sim → jwtVerify(token)    │
  │     Erro → delete cookie    │
  │             redirect /login │
  │     OK → NextResponse.next()│
  └─────────────────────────────┘
        │
        ▼
  (withSidebar)/layout.js
  ┌─────────────────────────────┐
  │ getUser() → /api/check-token│
  │   null → router.replace     │
  │           (/login)          │
  │   user → render sidebar     │
  └─────────────────────────────┘
```

---

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/middleware.ts` | Proteção server-side via cookie `auth_token` |
| `src/app/api/login/route.js` | Autentica e seta o cookie HttpOnly |
| `src/app/api/logout/route.ts` | Limpa o cookie `auth_token` |
| `src/app/services/userService.js` | `checkToken`, `userLogin`, `logout` |
| `src/app/(withSidebar)/layout.js` | Segunda barreira client-side |
| `src/app/lib/auth.js` | `signToken` / `verifyToken` (Node.js runtime) |

---

## Cookie `auth_token`

| Propriedade | Valor |
|-------------|-------|
| `HttpOnly` | `true` — inacessível via JavaScript |
| `Secure` | `true` em produção |
| `SameSite` | `Lax` — proteção CSRF básica |
| `Path` | `/` |
| `Max-Age` | `28800` (8 horas) |

> O cookie é definido pelo `POST /api/login` e removido pelo `POST /api/logout`.

---

## Rotas Públicas (sem autenticação)

As rotas abaixo são explicitamente liberadas no middleware:

```
/login
/api/login
/api/register
/api/forgot-password
/api/reset-password
/api/logout
```

Ativos estáticos (`_next/static`, `_next/image`, `favicon.ico`, `icons/`, `images/`) também são excluídos via `matcher` no middleware.

---

## Rotas Protegidas

Todas as rotas **não listadas acima** exigem autenticação. Os módulos sob `(withSidebar)` incluem:

- `/home`
- `/bear-bot-ultra`
- `/bear-bot-ultra-2`
- `/bear-bot-differ`
- `/bottrader`
- `/profile`
- `/operations`
- `/users`
- `/history`
- `/reports`

---

## Função `logout`

Use sempre `logout()` de `userService.js` — ela limpa `localStorage` **e** invalida o cookie:

```javascript
import { logout } from '@/app/services/userService';

// Em qualquer componente:
await logout();
router.push('/login');
```

**Não use** `localStorage.removeItem('access_token')` diretamente — o cookie não seria limpo e o middleware ainda concederia acesso na próxima requisição.

---

## JWT e Edge Runtime

O middleware roda no **Edge Runtime** do Next.js, que não suporta `jsonwebtoken` (Node.js nativo).
Por isso usa-se [`jose`](https://github.com/panva/jose) para verificação de JWT no middleware.

O `src/app/lib/auth.js` continua usando `jsonwebtoken` em rotas de API (Node.js runtime normal).

---

## Testes

```bash
npm test                                    # todos os testes
npx vitest run src/__tests__/middleware.test.ts   # middleware
npx vitest run src/__tests__/userService.test.ts  # userService
```

Cobertura dos testes:
- Rotas públicas são liberadas sem cookie
- Rotas protegidas redirecionam sem cookie
- Redirecionamento com token inválido/expirado
- Cookie `auth_token` apagado em token expirado
- Acesso liberado com token válido
- `logout()` limpa localStorage e chama `/api/logout`
- `checkToken()` remove chave correta (`access_token`) em falha
