# Deriv OAuth 2.0 & WebSocket Connection

A plataforma agora utiliza o novo fluxo de autenticação OAuth 2.0 (PKCE) da Deriv em substituição aos tokens legados, e uma única conexão WebSocket unificada para coleta de dados de mercado (Ticks) e negociação.

## Arquitetura de Autenticação (OAuth 2.0 PKCE)

A classe `DerivService.tsx` gerencia todo o fluxo:
1. **Gerenciamento de PKCE:** Gera um `code_verifier`, cria o `code_challenge` via `SHA-256`, e cria um `state` aleatório para evitar CSRF.
2. **Redirecionamento:** O usuário é enviado para `auth.deriv.com` com o `client_id` (OAuth). A URL usa a interface `URL` nativa do JavaScript para evitar erros de encoding que disparam os sistemas de segurança (WAF Cloudflare) da Deriv.
3. **Callback (`/home?code=...`):** A URL de retorno é capturada e os parâmetros são enviados via requisição POST ao backend próprio `/api/deriv-auth`.
4. **Token Exchange:** A rota do backend realiza a troca do `code` pelo `access_token` usando o `code_verifier` original, e retorna as contas vinculadas àquele token.

> [!WARNING]
> Diferenciação crucial:
> - **`client_id` (Alfanumérico):** Usado APENAS na URL de login (`auth.deriv.com`) para o protocolo OAuth 2.0. Armazenado na env `NEXT_PUBLIC_DERIV_CLIENT_ID`.
> - **`app_id` (Numérico, ex: 67957):** Usado APENAS na conexão WebSocket (`ws.derivws.com`) para identificação da plataforma legada de dados. Armazenado na env `NEXT_PUBLIC_APPID`.

## WebSocket (OTP & Legacy Data)

### Autenticação via WebSocket
Após possuir um `access_token` OAuth, não enviamos ele via texto puro. A conexão em si é feita da seguinte forma:
1. O backend (`/api/deriv-otp`) pede um OTP (One Time Password/Token WebSocket) à Deriv passando o `access_token` e o id da conta. (ex: { accessToken: "ory_at_63CAj_wLYflelzTmH3w7FTHzwhbLDULxb__Blcpe8-M.dU5BX1Xll7H423gfTEhcwS9sxhFL05HS7L2KzS4Vvw8", accountId: "DOT92728917" }).
2. A Deriv retorna uma URL de WebSocket temporária e segura (ex: `wss://api.derivws.com/trading/v1/options/ws/demo?otp=ohN1Op3N`).
3. O `DerivService.tsx` conecta-se usando esta URL e já está automaticamente logado no websocket de negociação.

### Consumo de Ticks (Market Data)
Os componentes visuais ou de backend que precisem de histórico ou ticks em tempo real não abrem seus próprios WebSockets. Eles devem:
1. Obter a instância global: `const deriv = DerivService.getInstance()`.
2. Consultar o histórico: `deriv.getHistoricalTicks(symbol, limit)`. Este comando envia o padrão da API `ticks_history` (`adjust_start_time=1`, `end="latest"`, `style="ticks"`).
3. Inscrever-se para novos ticks: `deriv.subscribe({ ticks: symbol })`.
4. Ouvir os ticks em tempo real no event observer global: `deriv.observerInstance.on("deriv.tick", (data) => { ... })`.

Isso garante que toda a aplicação use a MESMA conexão para coletar dados, economizando banda, evitando limites de API (rate limit) da Deriv, e reaproveitando a mesma sessão de negociação.
