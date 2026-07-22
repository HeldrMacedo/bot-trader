# Deriv OAuth 2.0 & WebSocket Connection

A plataforma utiliza o fluxo de autenticação OAuth 2.0 (PKCE) da Deriv e **dois canais WebSocket separados** no `DerivService`:

| Canal | URL | Auth | Uso |
|-------|-----|------|-----|
| **Market (público)** | `wss://api.derivws.com/trading/v1/options/ws/public` | Nenhuma | `ticks`, `ticks_history`, `active_symbols` |
| **Trading (conta)** | OTP de `POST .../accounts/{accountId}/otp` → `wss://api.derivws.com/trading/v1/options/ws/{demo\|real}?otp=...` | OTP (OAuth Bearer no REST) | `buy`, `proposal`, `balance`, `profit_table`, etc. |

> [!IMPORTANT]
> O endpoint legado `wss://ws.derivws.com/websockets/v3` **não deve ser usado para stream de ticks**. Em índices sintéticos (`R_*`, `RDBEAR`, `RDBULL`) ele responde `InvalidSymbol` em `ticks` e em `ticks_history` com `subscribe: 1`. Histórico one-shot ainda pode responder no legado, mas o gateway oficial de market data é o **public** acima.
>
> Doc oficial: [Getting started](https://developers.deriv.com/llms/getting-started.md) · [Ticks](https://developers.deriv.com/llms/ticks.md) · [Ticks history](https://developers.deriv.com/llms/ticks-history.md)

## Arquitetura de Autenticação (OAuth 2.0 PKCE)

A classe `DerivService.tsx` gerencia todo o fluxo:
1. **Gerenciamento de PKCE:** Gera um `code_verifier`, cria o `code_challenge` via `SHA-256`, e cria um `state` aleatório para evitar CSRF.
2. **Redirecionamento:** O usuário é enviado para `auth.deriv.com` com o `client_id` (OAuth). A URL usa a interface `URL` nativa do JavaScript para evitar erros de encoding que disparam os sistemas de segurança (WAF Cloudflare) da Deriv.
3. **Callback (`/home?code=...`):** A URL de retorno é capturada e os parâmetros são enviados via requisição POST ao backend próprio `/api/deriv-auth`.
4. **Token Exchange:** A rota do backend realiza a troca do `code` pelo `access_token` usando o `code_verifier` original, e retorna as contas vinculadas àquele token.

> [!WARNING]
> Diferenciação crucial:
> - **`client_id` (Alfanumérico):** Usado na URL de login (`auth.deriv.com`) para OAuth 2.0 e no header `Deriv-App-ID` das chamadas REST (OTP, contas). Env: `NEXT_PUBLIC_DERIV_CLIENT_ID`.
> - **`app_id` (Numérico, ex: 67957):** Ainda usado em fallbacks legados (`ws.derivws.com/websockets/v3` com token clássico / conexões temporárias). Env: `NEXT_PUBLIC_APPID`. **Não é necessário** no canal público de ticks.

## WebSocket

### 1. Market data (público — sem login)

Implementado em `DerivService.connectMarketWs()`:

```
wss://api.derivws.com/trading/v1/options/ws/public
```

- Sem `app_id` na query, sem OTP, sem `authorize`.
- Roteado automaticamente por `isMarketRequest()` para payloads com `ticks`, `ticks_history` ou `active_symbols`.
- Emite `market.open` ao conectar e `deriv.tick` / `deriv.history` via observer.
- Keepalive: `ping` a cada 25s; reconexão com backoff.

Payloads (iguais à API legada de ticks — **não** usam `underlying_symbol`):

```javascript
// Stream em tempo real
{ ticks: "R_100", subscribe: 1 }

// Histórico + stream (padrão do TicksTest / home)
{
  ticks_history: "R_100",
  adjust_start_time: 1,
  count: 100,
  end: "latest",
  style: "ticks",
  subscribe: 1
}
```

Resposta de tick (compatível com o código atual):

```json
{
  "msg_type": "tick",
  "tick": {
    "symbol": "R_100",
    "quote": 523.98,
    "epoch": 1784763360,
    "pip_size": 2
  },
  "subscription": { "id": "..." }
}
```

> Nota: em `proposal` / `buy` o campo de símbolo da API nova é `underlying_symbol`. Em **ticks** continua `ticks` / `ticks_history` e a resposta usa `tick.symbol`.

### 2. Trading autenticado (OTP)

Após possuir um `access_token` OAuth:
1. O backend (`/api/deriv-otp`) pede um OTP à Deriv com `access_token` + `accountId`.
2. A Deriv devolve uma URL temporária (ex: `wss://api.derivws.com/trading/v1/options/ws/demo?otp=...`).
3. O `DerivService` conecta nessa URL e a sessão de trade já fica autorizada (sem mensagem `{ authorize }` no fluxo OAuth).

### Consumo de Ticks (API da aplicação)

Os componentes **não** abrem WebSocket próprio. Usam o canal de mercado do singleton:

1. `const deriv = DerivService.getInstance()`
2. Histórico: `deriv.getHistoricalTicks(symbol, limit)` → `ticks_history`
3. Stream: `deriv.subscribe({ ticks: symbol })` ou `ticks_history` + `subscribe: 1`
4. Observer: `deriv.observerInstance.on("deriv.tick", (data) => { ... })`
5. Buffer síncrono (quando já populado): `deriv.getHistoricalTicksSync(symbol, count)`

Exemplo usado na home (`TicksTest`):

```javascript
// Após market.open (ou se isMarketConnected)
await deriv.send({
  ticks_history: symbol,
  adjust_start_time: 1,
  count: 100,
  end: "latest",
  style: "ticks",
  subscribe: 1,
});

deriv.observerInstance.on("deriv.tick", (data) => {
  const { symbol, quote } = data.tick;
  // ...
});
```

Isso concentra o stream de mercado num único socket público, reduz rate limit e evita misturar market data com o WS de trade (OTP expira / reconecta com conta diferente).

## CSP (`next.config.mjs`)

O `connect-src` deve permitir, entre outros:

- `wss://api.derivws.com` — market public + trading OTP
- `https://api.derivws.com` — REST (OTP, accounts; em geral via rotas `/api/*` do Next)
- `https://auth.deriv.com` — OAuth
- `wss://ws.derivws.com` / `wss://*.derivws.com` — fallbacks legados ainda presentes no código

## Referências internas

- Código: `src/app/services/DerivService.tsx` (`connectMarketWs`, `isMarketRequest`, `send`)
- UI de ticks: `src/app/(withSidebar)/home/components/TicksTest.tsx`
- OTP proxy: `src/app/api/deriv-otp/route.ts`
- Camada copy-trader (PAT/legado vs Options): `src/app/services/derivConfig.ts`
