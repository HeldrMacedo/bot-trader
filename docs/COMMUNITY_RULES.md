# Estratégias da Comunidade (Community Rules)

Funcionalidade que permite usuários compartilhar e reutilizar estratégias de trading diretamente no painel `trade-mind-pro`.

## Visão Geral

- Qualquer usuário autenticado pode **publicar** uma estratégia que funcionou para ele
- Todas as estratégias publicadas ficam visíveis para **todos** os usuários da plataforma
- Ao clicar em **Usar**, a regra é copiada direto para o campo de entrada do chat e o modo correto é selecionado automaticamente
- O autor de uma estratégia pode **excluí-la** a qualquer momento

## Acesso

No painel `trade-mind-pro`, abra o menu hambúrguer (≡) e clique em **🌐 Estratégias da Comunidade**.

## Banco de Dados

Modelo Prisma adicionado em `prisma/schema.prisma`:

```prisma
model SharedRule {
  id          Int      @id @default(autoincrement())
  title       String   @db.VarChar(200)
  ruleText    String   @db.Text
  isAdvanced  Boolean  @default(false)
  usageCount  Int      @default(0)
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Para aplicar o schema sem histórico de migrations:

```bash
npx prisma db push
```

## API — `/api/shared-rules`

### GET `/api/shared-rules`

Retorna todas as estratégias ordenadas por `usageCount DESC, createdAt DESC`.

**Resposta 200:**
```json
[
  {
    "id": 1,
    "title": "Dígito dominante com alternância",
    "ruleText": "Se digitCount(10, X) >= 4...",
    "isAdvanced": true,
    "usageCount": 12,
    "createdAt": "2026-04-20T10:00:00.000Z",
    "user": { "name": "João" }
  }
]
```

### POST `/api/shared-rules`

Cria uma nova estratégia. Requer autenticação via Bearer token.

**Headers:** `Authorization: Bearer <access_token>`

**Body:**
```json
{
  "title": "Nome da estratégia",
  "ruleText": "Texto completo da regra",
  "isAdvanced": true
}
```

**Validações:**
- `title` e `ruleText` são obrigatórios
- `title` máximo 200 caracteres

**Respostas:**
| Status | Motivo |
|--------|--------|
| 201 | Criado com sucesso |
| 400 | Campos obrigatórios ausentes ou título muito longo |
| 401 | Token ausente ou inválido |

### PATCH `/api/shared-rules`

Incrementa o contador de uso de uma estratégia.

**Body:** `{ "id": 42 }`

**Respostas:** `200 OK` | `400` se `id` inválido | `404` se não encontrado

### DELETE `/api/shared-rules`

Exclui uma estratégia. Requer autenticação — apenas o autor pode excluir.

**Headers:** `Authorization: Bearer <access_token>`

**Body:** `{ "id": 42 }`

**Respostas:**
| Status | Motivo |
|--------|--------|
| 200 | Excluído com sucesso |
| 400 | `id` inválido |
| 401 | Token ausente ou inválido |
| 403 | Usuário não é o autor |
| 404 | Estratégia não encontrada |

## Componente — `SharedRulesModal.tsx`

Localização: `src/app/(withSidebar)/trade-mind-pro/components/SharedRulesModal.tsx`

### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `onClose` | `() => void` | Fecha o modal |
| `onUseRule` | `(ruleText: string, isAdvanced: boolean) => void` | Aplica a regra no chat |
| `currentMode` | `'advanced' \| 'chat' \| 'config' \| 'strategy'` | Modo atual do chat |
| `currentInput` | `string` | Texto pré-preenchido no campo de compartilhamento |

### Abas

**Explorar** — lista todas as estratégias publicadas com:
- Filtro de busca por título ou texto da regra
- Badge de tipo (🧠 Avançado / Estratégia)
- Contador de usos
- Botão **Usar** — chama `PATCH` para incrementar uso, depois chama `onUseRule`
- Botão **✕** — visível para usuários logados, envia `DELETE` com Bearer token

**+ Compartilhar** — formulário com:
- Campo título (obrigatório, máx 200 chars)
- Seletor de tipo (Avançada)
- Textarea com a regra (obrigatório)
- Envia `POST` com Bearer token lido do `localStorage.access_token`

### Autenticação no cliente

O `currentUserId` é extraído do JWT armazenado em `localStorage.access_token` via `atob` do payload (sem verificação de assinatura — apenas para controle de UI). A verificação real de propriedade ocorre server-side no `DELETE`.

## Integração no AiChatPanel

Em `AiChatPanel.tsx`, o handler `onUseRule` faz:

```typescript
onUseRule={(ruleText, isAdvanced) => {
  setInput(ruleText);
  onModeChange(isAdvanced ? 'advanced' : 'strategy');
  setShowCommunityModal(false);
}}
```

Ou seja, a regra é inserida no campo de entrada, o modo é ajustado automaticamente e o modal é fechado.

## Testes

Os testes cobrem dois níveis:

### API — `src/__tests__/sharedRules.test.ts`

50 testes (node environment) cobrindo:
- GET: ordenação, inclusão do nome do usuário, tratamento de erros do Prisma
- POST: autenticação, validações de campo, criação com dados corretos
- PATCH: incremento de `usageCount`, id inválido, não encontrado
- DELETE: autenticação, verificação de propriedade (403 para não-autores), 404, sucesso
- `extractUserId`: token ausente, malformado, sem Bearer, payload correto

### Componente — `src/__tests__/sharedRulesModal.test.tsx`

46 testes (jsdom environment, React Testing Library) cobrindo:
- Carregamento inicial: spinner, lista de regras, badges, contadores
- Filtro de busca: filtragem por título e texto, estado vazio
- Botão Usar: chama PATCH + `onUseRule` com dados corretos
- Botão Excluir: requer token, chama DELETE, remove da lista, desabilitado durante operação
- Navegação entre abas: explorar ↔ compartilhar, input de busca visível/oculto
- Formulário de compartilhamento: validação de campos vazios, envio bem-sucedido, mensagens de erro, limpeza após sucesso
- Fechar modal: clique no backdrop, botão ✕, tecla Escape (via backdrop click)

Para rodar:
```bash
npx vitest run src/__tests__/sharedRules.test.ts
npx vitest run src/__tests__/sharedRulesModal.test.tsx
```
