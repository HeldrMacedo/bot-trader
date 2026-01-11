This is a [Next.js](https://nextjs.org) projectbootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app)..

## Getting Started

First, run the development server::

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Migração Bot Strategy (2025)

O módulo `bot-ia` foi migrado para `src/app/(withSidebar)/bot-strategy` com as seguintes alterações arquiteturais:

### 1. Arquitetura
- Migração de Vanilla JS para **Next.js/React com TypeScript**.
- Estrutura baseada em componentes reutilizáveis (`components/`).

### 2. Funcionalidades
- **Remoção de Créditos**: Acesso irrestrito a todas as funcionalidades.
- **Seletor de Volatilidade**: Integrado à sidebar esquerda, com carregamento dinâmico via `DerivService`.
- **Autenticação Simplificada**: Utiliza o token global da aplicação (`deriv_accounts` / `activeToken`), sem login separado.
- **Configuração Modular**: Abas separadas para Trade, Gestão e Controller.

### 3. Inicialização
- Verificação automática de tokens ao carregar.
- Redirecionamento/Alerta caso nenhuma conta esteja configurada.
- Indicador visual de carregamento.

### 4. Componentes Chave
- `BotStrategyPage`: Container principal e gerenciamento de estado.
- `VolatilitySelector`: Busca e seleção de ativos.
- `TradeConfig`, `ManagementConfig`, `ControllerConfig`: Painéis de configuração.
- `BotDashboard`: Visualização de logs e status (preparado para expansão com gráficos).
