import { XMarkIcon } from "@heroicons/react/16/solid";
import { useState } from "react";

interface HelpManualModalProps {
  onClose: () => void;
}

export default function HelpManualModal({ onClose }: HelpManualModalProps) {
  const [search, setSearch] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0d0a18] border border-gray-700 rounded-lg overflow-hidden flex flex-col"
        style={{ height: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-700 bg-[#13111c] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Manual de Instruções — IA Trader</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar no manual..."
            className="w-full bg-[#0b0913] border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 custom-scrollbar text-sm text-gray-300">
          <ManualSections search={search.toLowerCase().trim()} />
        </div>
      </div>
    </div>
  );
}

/* ───────── helpers ───────── */

function Section({ title, children, highlight, warning }: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  warning?: boolean;
}) {
  const border = warning
    ? 'border-yellow-700/50 bg-yellow-900/10'
    : highlight
    ? 'border-blue-700/50 bg-blue-900/10'
    : 'border-gray-800 bg-[#13111c]';
  return (
    <div className={`border rounded-lg p-4 space-y-2 ${border}`}>
      <h3 className="text-white font-semibold text-sm">{title}</h3>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0b0913] border border-gray-700 rounded p-3 text-xs text-blue-300 font-mono whitespace-pre-wrap leading-relaxed">
      {children}
    </pre>
  );
}

function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="text-gray-200 font-semibold text-xs mt-2">{children}</h4>;
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-300 pl-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function OL({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-300 pl-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ol>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-300 leading-relaxed">{children}</p>;
}

/* ───────── content ───────── */

const SECTIONS: Array<{ id: string; title: string; highlight?: boolean; warning?: boolean; content: React.ReactNode }> = [
  {
    id: 'visao-geral',
    title: '🎯 Visão Geral do Sistema',
    content: (
      <>
        <P>O <strong>IA Trader</strong> é uma plataforma de trading automatizado que utiliza Inteligência Artificial (Gemini) para interpretar suas estratégias escritas em linguagem natural e executar trades na plataforma Deriv.</P>
        <P><strong>Novidade:</strong> Sistema de <strong>Filtro de Risco Algorítmico com IA</strong> que analisa o mercado em tempo real e ajusta os parâmetros de risco automaticamente.</P>
      </>
    ),
  },
  {
    id: 'filtro-risco',
    title: '🛡️ Sistema de Filtro de Risco com IA',
    highlight: true,
    content: (
      <>
        <P>O Filtro de Risco utiliza IA para analisar o comportamento do mercado e ajustar automaticamente os parâmetros de risco.</P>
        <H4>📊 Como Funciona:</H4>
        <UL items={[
          <><strong>Análise Algorítmica:</strong> A IA analisa os últimos dígitos usando Entropia de Shannon e Momentum</>,
          <><strong>Análise Periódica:</strong> Configurável a cada N ticks (padrão: 50 ticks)</>,
          <><strong>Ajuste Automático:</strong> Parâmetros de risco ajustados dinamicamente</>,
          <><strong>Fallback Inteligente:</strong> Se a IA falhar, assume "mercado estável" sem cobrar créditos</>,
        ]} />
        <H4>🎯 Status de Risco:</H4>
        <Code>{'🟢 NORMAL:   Mercado estável, parâmetros padrão\n🟡 ATENÇÃO:  Volatilidade moderada, parâmetros ajustados\n🔴 CRÍTICO:  Alta volatilidade, parâmetros restritivos'}</Code>
        <H4>⚙️ Como Ativar:</H4>
        <OL items={[
          'Clique no botão "Filtro de Risco" no painel de controle',
          'Configure o intervalo de análise (recomendado: 50 ticks)',
          'O sistema começará a analisar automaticamente',
          'Acompanhe o status em tempo real no visor',
        ]} />
        <P><strong>💡 Dica:</strong> Funciona melhor em mercados voláteis como Volatility 75 e Volatility 100.</P>
      </>
    ),
  },
  {
    id: 'gale',
    title: '🎲 Sistema de Gale Automático',
    content: (
      <>
        <P>O Gale (Martingale) permite recuperação automática de perdas através do ajuste inteligente do valor das próximas entradas.</P>
        <H4>⚙️ Configuração do Multiplicador:</H4>
        <Code>{'Multiplicador 0.0:   Gale desativado\nMultiplicador 1.0:   Recuperação exata (recomendado)\nMultiplicador < 1.0: Modo conservador (ex: 0.8 = 80%)\nMultiplicador > 1.0: Modo agressivo  (ex: 1.5 = 150%)'}</Code>
        <H4>📐 Exemplo:</H4>
        <Code>{'Perda: $1.00 | Payout: 95% | Multiplicador: 1.0\nPróximo trade: $2.11 (recupera $1.00 + lucro de $1.00)'}</Code>
        <P><strong>⚠️ Atenção:</strong> Use o Gale com cautela. Defina sempre um Stop Loss adequado.</P>
      </>
    ),
  },
  {
    id: 'delay',
    title: '⏱️ Sistema de Tempo de Delay (Cooldown)',
    content: (
      <>
        <P>O Tempo de Delay adiciona ticks extras após a duração do contrato para evitar trades sobrepostos.</P>
        <UL items={[
          <><strong>Valor Padrão:</strong> 3 ticks</>,
          <><strong>Mínimo:</strong> 1 tick</>,
          <><strong>Recomendado:</strong> 3-5 ticks para contratos de dígitos</>,
        ]} />
        <P>Se você configurar duração de 5 ticks e delay de 3 ticks, o sistema aguardará 8 ticks no total antes de permitir um novo trade.</P>
      </>
    ),
  },
  {
    id: 'extracao-digitos',
    title: '🐛 Correção Importante: Extração de Dígitos',
    highlight: true,
    content: (
      <>
        <P>O sistema detecta automaticamente a quantidade de casas decimais do ativo e extrai o dígito correto.</P>
        <Code>{'Exemplo: 545.340\n❌ Antes: Sistema analisava o dígito 4\n✅ Agora:  Sistema analisa corretamente o dígito 0'}</Code>
        <UL items={[
          <><strong>2 casas decimais</strong> (ex: R_100): Dígito correto ✅</>,
          <><strong>3 casas decimais</strong> (ex: R_25): Dígito 0 em ".340" ✅</>,
          <><strong>5 casas decimais</strong> (ex: Forex): Dígito 6 em "1.23456" ✅</>,
        ]} />
      </>
    ),
  },
  {
    id: 'ia-regras',
    title: '🤖 Sistema de Criação de Regras com IA',
    content: (
      <>
        <P>A IA interpreta suas estratégias e as converte em regras executáveis.</P>
        <H4>📝 Exemplos por Categoria:</H4>
        <div className="space-y-2">
          {[
            { label: 'Dígitos', items: ['"Se o último dígito for par"', '"Quando o último dígito for maior que 5"', '"Se os últimos 5 dígitos for menor que 3"', '"Quando apareceu 3 dígitos ímpares seguidos"'] },
            { label: 'Preços', items: ['"Se o preço subir 0.5%"', '"Quando o preço cair mais que 1%"', '"Se o preço estiver acima da média dos últimos 10 ticks"'] },
            { label: 'Indicadores Técnicos', items: ['"Se RSI estiver acima de 70"', '"Quando RSI for menor que 30"', '"Se SMA de 20 períodos > SMA de 80"'] },
            { label: 'Padrões XO', items: ['"Padrão dos dígitos XXOX"', '"Padrão dos dígitos XOXO"', '"Padrão dos dígitos XXXO"', '"Padrão dos dígitos OXXX"'] },
          ].map(cat => (
            <div key={cat.label} className="bg-[#0b0913] rounded p-2 border border-gray-800">
              <div className="text-xs font-semibold text-gray-200 mb-1">{cat.label}:</div>
              <UL items={cat.items.map(s => <span className="text-blue-400 font-mono">{s}</span>)} />
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'referencia-regras',
    title: '📚 Referência Completa de Tipos de Regras',
    content: (
      <>
        <P>Lista completa de TODOS os tipos de regras que a IA entende:</P>
        <div className="space-y-3">
          {[
            {
              num: '1', title: 'ÚLTIMOS DÍGITOS',
              desc: 'Compara os últimos N dígitos com um valor usando operadores.',
              code: '* ultimos 3 digitos < 5\n* 6 ultimos digitos > 2\n* ultimos 4 digitos igual a 7\n* ultimos 5 digitos menor ou igual a 1',
            },
            {
              num: '2', title: 'REPETIÇÃO DE DÍGITOS',
              desc: 'Detecta quando os últimos N dígitos se repetem (são todos iguais).',
              code: '* ultimos 2 digitos se repetir\n* ultimos 3 digitos repetirem\n* quando os ultimos 4 digitos forem iguais',
            },
            {
              num: '3', title: 'PADRÃO DE DÍGITOS (XO)',
              desc: 'Detecta padrões usando X (iguais) e O (diferentes).',
              code: '* padrão dos dígitos XXOX\n* padrão dos dígitos XOXO\n* padrão dos dígitos XXXO\n* padrão dos dígitos OXXX\n* padrão dos dígitos XXXXOO',
            },
            {
              num: '4', title: 'RSI (Índice de Força Relativa)',
              desc: 'Analisa o RSI com operadores. Padrão: período 14.',
              code: '* rsi > 70\n* rsi < 30\n* rsi(20) >= 65\n* rsi entre 40 e 60',
            },
            {
              num: '5', title: 'SMA (Média Móvel Simples)',
              desc: 'Compara SMAs entre si ou com o preço.',
              code: '* sma(14) > sma(30)\n* preco acima da sma(14)\n* sma(10) cruzou sma(20)',
            },
            {
              num: '6', title: 'SUPORTE E RESISTÊNCIA',
              desc: 'Detecta quando o preço toca ou quebra níveis.',
              code: '* ultimo tick < suporte\n* ultimo tick > resistencia\n* atingir suporte 1.1800\n* quebrar resistencia 15000',
            },
            {
              num: '7', title: 'MOVIMENTAÇÃO DE PREÇO',
              desc: 'Detecta movimentos percentuais ou em pontos.',
              code: '* preco subiu 0.5%\n* preco caiu 2%\n* preco subiu 1.5% no periodo de 30\n* preco subiu 10 pontos',
            },
            {
              num: '8', title: 'SEQUÊNCIA',
              desc: 'Detecta X ticks/velas consecutivos subindo ou descendo.',
              code: '* 5 ticks consecutivos subindo\n* 3 velas seguidas descendo\n* 4 movimentos consecutivos para baixo',
            },
            {
              num: '9', title: 'PERCENTUAL DE DÍGITOS',
              desc: 'Analisa % de dígitos que atendem condição. Período padrão: 25.',
              code: '* percentual dos digitos inferiores a 4 > 40%\n* percentual dos digitos pares >= 30%\n* percentual dos digitos impares maior ou igual a 40%\n* percentual dos digitos igual a 7 > 10% no periodo de 100',
            },
            {
              num: '10', title: 'PREVISÃO DINÂMICA',
              desc: 'Especifica o contrato (over/under/match/differ) com número.',
              code: '* Entrar over 2 quando os 2 ultimos digitos <= 2\n* Entrar under 7 quando os 2 ultimos digitos >= 7\n* Entrar match 3 quando ultimo digito = 3\n* Entrar differ do ultimo digito',
            },
            {
              num: '11', title: 'ENTRADAS DUPLAS (BOTH MODE) 🆕',
              desc: 'Execute 2 trades simultâneos especificando ambos os contratos na mesma regra.',
              code: '* Entrar over 1 e under 8 quando ultimo digito <= 1\n* Entrar match 3 e differ 7 quando ultimos 2 digitos >= 5\n* Over 2 e under 7 quando os 3 ultimos digitos < 3',
            },
            {
              num: '12', title: 'CONDIÇÕES COM "OU" ⚠️',
              desc: 'Para condições "OU", use grupos separados com asterisco (*).',
              code: '❌ ERRADO:  ultimos 3 digitos <= 2 ou >= 7\n\n✅ CORRETO:\n* ultimos 3 digitos <= 2\n* ultimos 3 digitos >= 7',
            },
            {
              num: '13', title: 'DÍGITOS x E o (PERDA E GANHO)',
              desc: '"x" = dígitos perdedores | "o" = dígitos vencedores (variam por contrato).',
              code: 'Over 4:  x=0,1,2,3,4 (perda) | o=5,6,7,8,9 (ganho)\nOdd:     x=0,2,4,6,8 (perda) | o=1,3,5,7,9 (ganho)\nMatch 3: x=0,1,2,4..9 (perda) | o=3 (ganho)\n\n* Entrar Over 4 quando 5 últimos dígitos = x\n* Match 3 quando padrão x-o-x',
            },
            {
              num: '14', title: 'ÚLTIMOS X DÍGITOS = (LISTA PERMITIDA) 🆕',
              desc: 'Verifica se TODOS os últimos N dígitos estão em uma lista permitida.',
              code: '* Entrar quando os ultimos 3 digitos = (2,4,7,6,9)\n* Quando os ultimos 5 digitos forem (1,3,5,7,9)\n* Se os ultimos 2 digitos = (0,2,4,6,8)\n\n✅ 2,4,7 — todos na lista\n❌ 2,4,1 — o 1 NÃO está na lista',
            },
          ].map(rule => (
            <div key={rule.num} className="border border-gray-800 rounded p-3 bg-[#0b0913] space-y-1">
              <div className="text-xs font-semibold text-gray-200">{rule.num}. {rule.title}</div>
              <P>{rule.desc}</P>
              <Code>{rule.code}</Code>
            </div>
          ))}
        </div>
        <H4>💡 Operadores Suportados:</H4>
        <Code>{'> maior que   |  < menor que   |  = igual a\n>= maior ou igual  |  <= menor ou igual  |  != diferente de'}</Code>
      </>
    ),
  },
  {
    id: 'padroes-xo',
    title: '🎯 Padrões de Dígitos Avançados (XO)',
    content: (
      <>
        <P>X = dígitos que se repetem no padrão — O = dígitos diferentes.</P>
        <H4>Básicos (4 dígitos):</H4>
        <Code>{'XXOX — 3 iguais, 1 diferente, volta: 5-5-2-5\nXOXO — Alternado:                 4-7-4-7\nXXXO — 3 iguais seguidos + 1 dif: 6-6-6-2\nOXXX — 1 diferente + 3 iguais:   3-7-7-7'}</Code>
        <H4>Intermediários (5 dígitos):</H4>
        <Code>{'XOXOX — Alternado c/ 3 dígitos:  2-8-2-4-2\nOXOXO — Alternado, início dif.:  7-3-7-1-7\nXXOOX — 2 iguais, 2 dif., igual: 4-4-8-1-4'}</Code>
        <H4>Avançados (6+ dígitos):</H4>
        <Code>{'XXXXOO — 4 iguais + 2 diferentes: 7-7-7-7-3-1\nOOXXXX — 2 diferentes + 4 iguais: 5-9-2-2-2-2\nXOXOXO — Alternado longo:          1-6-1-8-1-4'}</Code>
        <H4>💡 Dicas:</H4>
        <UL items={[
          'Comece com padrões simples (4-5 dígitos)',
          'Teste em modo simulação primeiro',
          'Combine com outras regras para maior precisão',
        ]} />
      </>
    ),
  },
  {
    id: 'grupos-regras',
    title: '🔗 Sistema de Grupos de Regras',
    content: (
      <>
        <H4>🟢 Regras AND (todas devem ser atendidas):</H4>
        <P>Separe condições com vírgula(,) — todas devem ser verdadeiras ao mesmo tempo.</P>
        <Code>{'* Se o último dígito for par, RSI estiver acima de 70, preço subir 0.3%'}</Code>
        <H4>🔵 Regras OR (pelo menos uma):</H4>
        <P>Use Enter / novo asterisco (*) para criar um novo grupo independente.</P>
        <Code>{'* Se o último dígito for 0\n* Se RSI > 80'}</Code>
        <H4>🔄 Grupos Mistos:</H4>
        <Code>{'* Se o dígito for par, RSI > 70\n* Se o preço subir 10%'}</Code>
      </>
    ),
  },
  {
    id: 'tipos-contratos',
    title: '⚙️ Configurações de Trade',
    content: (
      <>
        <H4>📋 Tipos de Contratos:</H4>
        <UL items={[
          <><strong>Over/Under:</strong> Aposta se o último dígito será maior ou menor que um valor.</>,
          <><strong>Differ/Match:</strong> Aposta se o último dígito será diferente ou igual a um valor.</>,
          <><strong>Even/Odd:</strong> Aposta se o último dígito será par ou ímpar.</>,
          <><strong>Call/Put:</strong> Aposta na direção do preço (subir ou descer).</>,
        ]} />
        <H4>🎯 Modo "Ambos":</H4>
        <P>Quando "Ambos" é selecionado, você pode:</P>
        <P><strong>1. Regras específicas:</strong></P>
        <Code>{'* Entrar em Over quando o ultimo digito > 5\n* Entrar em Under quando percentual abaixo de 3 > 70%'}</Code>
        <P><strong>2. Trades simultâneos:</strong> sem especificar contrato nas regras, ambos são executados ao mesmo tempo.</P>
        <H4>⏱️ Durações:</H4>
        <UL items={['1 a 10 ticks', '15 segundos a 5 minutos']} />
        <H4>💰 Gestão de Risco:</H4>
        <UL items={[
          <><strong>Valor de Entrada:</strong> valor fixo por trade</>,
          <><strong>Stop Loss:</strong> para após X negativo atingido</>,
          <><strong>Meta:</strong> para após X positivo atingido</>,
          <><strong>Ajuste de Gale:</strong> multiplicador para recuperação (0.0–5.0, padrão: 1.0)</>,
          <><strong>Tempo Delay:</strong> ticks extras após o contrato (padrão: 3)</>,
          <><strong>Vitórias/Perdas Reais e Simuladas:</strong> troca de modo automaticamente</>,
          <><strong>Limite de Trades:</strong> máximo de trades (0 = ilimitado)</>,
        ]} />
      </>
    ),
  },
  {
    id: 'modos-trading',
    title: '🔄 Modos de Trading',
    content: (
      <>
        <div className="space-y-2">
          {[
            { badge: '🟡', name: 'SIMULAÇÃO', desc: 'Testa estratégias sem risco real. Usa dados de mercado reais mas não executa trades de verdade.' },
            { badge: '🟢', name: 'VIRTUAL', desc: 'Executa trades reais na conta demo da Deriv. Usa dinheiro virtual para testes realistas.' },
            { badge: '🔴', name: 'REAL', desc: 'Executa trades com dinheiro real. Use apenas após testar completamente sua estratégia.' },
          ].map(m => (
            <div key={m.name} className="flex gap-2 items-start bg-[#0b0913] border border-gray-800 rounded p-2">
              <span className="text-sm">{m.badge}</span>
              <div><span className="text-xs font-bold text-white">{m.name}</span><p className="text-xs text-gray-400">{m.desc}</p></div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'como-usar',
    title: '🎮 Como Usar o Sistema',
    content: (
      <>
        <div className="space-y-2">
          {[
            { step: '1️⃣', title: 'Configuração Inicial', items: ['Escolha o símbolo (ex: Volatility 75)', 'Defina o tipo de contrato', 'Configure duração, valor, stop loss etc.'] },
            { step: '2️⃣', title: 'Criação da Estratégia', items: ['Escreva sua estratégia em linguagem natural', 'Use palavras-chave como "Se", "Quando", "Maior", "Menor"', 'Seja específico com valores e condições'] },
            { step: '3️⃣', title: 'Teste e Monitoramento', items: ['Clique em "Iniciar Monitoramento"', 'Observe as regras sendo avaliadas em tempo real', 'Acompanhe os resultados nas mensagens'] },
          ].map(s => (
            <div key={s.step} className="bg-[#0b0913] border border-gray-800 rounded p-3">
              <div className="text-xs font-semibold text-white mb-1">{s.step} {s.title}</div>
              <UL items={s.items} />
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'novidades',
    title: '🆕 Funcionalidades Recentes',
    highlight: true,
    content: (
      <>
        <H4>Dígitos Isolados:</H4>
        <Code>{'* Entrar quando 4 digitos isolados > 6\n* Entrar quando o digito acima de 7 >= 5 isolados'}</Code>
        <P>O sistema conta quantos dígitos atenderam à condição mas zera se dois seguidos atenderem.</P>

        <H4>Definição de Contratos nas Regras:</H4>
        <Code>{'* Entrar Over 2 quando 4 digitos isolados > 6\n* Entrar Odd quando o digito acima de 7 >= 5 isolados\n* Entrar Match 3 se o ultimo digito for 3'}</Code>

        <H4>Ativação de Grupos:</H4>
        <P>Controle quando cada grupo deve ser ativado: Início, Após Win ou Após Loss. Use o botão ▼ ao lado de cada grupo na aba Configuração.</P>
        <Code>{'Estratégia de recuperação:\n1. Grupo conservador → marcar "Início" e "Após Win"\n2. Grupo agressivo  → marcar APENAS "Após Loss"'}</Code>

        <H4>Previsão Dinâmica de Probabilidade:</H4>
        <Code>{'* Entrar quando o ultimo digito = maior chance\n* Entrar quando o ultimo digito = menor chance'}</Code>
      </>
    ),
  },
  {
    id: 'modo-avancado',
    title: '🧠 Modo Avançado (linguagem natural)',
    highlight: true,
    content: (
      <>
        <P>O <strong>Modo Avançado</strong> permite expressar estratégias complexas em linguagem natural para a IA. Um motor dedicado avalia as regras a cada tick e executa trades automaticamente.</P>

        <H4>Por que usar o Modo Avançado?</H4>
        <P>O modo Estratégia padrão suporta tipos fixos de regra (percentual, padrão XO, RSI, etc.). O Modo Avançado permite lógica que não é possível no modo padrão:</P>
        <UL items={[
          '"Conte os últimos 10 dígitos e aposte no mais frequente"',
          '"Só opere se os 2 últimos dígitos forem diferentes"',
          '"Se o dígito 9 não apareceu nos últimos 10 ticks, aposte nele"',
          '"Se o mesmo dígito repetiu 4 vezes, aposte em DIFERENTE"',
        ]} />

        <H4>Como Funciona:</H4>
        <OL items={[
          'Selecione a aba "Avançado" no chat',
          'Descreva sua estratégia em linguagem natural',
          'A IA gera as regras no formato json',
          'As regras aparecem no painel "Regras em Tempo Real"',
          'Clique em INICIAR — o motor avalia a cada tick',
          'Quando as condições batem, o trade é executado automaticamente',
        ]} />

        <H4>Facts Disponíveis (dados em tempo real):</H4>
        <div className="space-y-2">
          <div className="bg-[#0b0913] rounded p-2 border border-gray-800">
            <div className="text-xs font-semibold text-gray-200 mb-1">Simples:</div>
            <Code>{'lastDigit         → Último dígito (0-9)\nsecondLastDigit    → Penúltimo dígito (0-9)\ntwoLastDifferent   → 2 últimos são diferentes? (true/false)\nconsecutiveSame    → Quantos iguais consecutivos no final\ntickCount          → Total de ticks acumulados'}</Code>
          </div>
          <div className="bg-[#0b0913] rounded p-2 border border-gray-800">
            <div className="text-xs font-semibold text-gray-200 mb-1">Com parâmetros (n, digit):</div>
            <Code>{'digitCount(n, digit)      → Contagem de dígito nos últimos N ticks\nmostFrequentDigit(n)     → Dígito mais frequente nos últimos N\nmostFrequentCount(n)     → Quantas vezes o mais frequente apareceu\ndigitNotInLastN(n, digit) → Dígito ausente nos últimos N? (true/false)'}</Code>
          </div>
        </div>

        <H4>Tipos de Contrato Suportados:</H4>
        <Code>{'DIGITMATCH  → Próximo dígito IGUAL a prediction\nDIGITDIFF   → Próximo dígito DIFERENTE de prediction\nDIGITOVER   → Próximo dígito MAIOR que prediction\nDIGITUNDER  → Próximo dígito MENOR que prediction\nDIGITEVEN   → Próximo dígito PAR\nDIGITODD    → Próximo dígito ÍMPAR\nCALL        → Preço SOBE\nPUT         → Preço CAI'}</Code>

        <H4>Predição Dinâmica:</H4>
        <P>Quando a predição depende dos ticks (ex: "apostar no mais frequente"), a IA usa <code className="text-blue-400">predictionFact</code> em vez de um número fixo. Facts suportados: <code className="text-blue-400">mostFrequentDigit</code>, <code className="text-blue-400">lastDigit</code>, <code className="text-blue-400">secondLastDigit</code>.</P>

        <H4>Operadores:</H4>
        <Code>{'equal (=)    notEqual (≠)    lessThan (<)    lessThanInclusive (≤)\ngreaterThan (>)    greaterThanInclusive (≥)    in (∈)    notIn (∉)'}</Code>

        <H4>Visualização em Tempo Real:</H4>
        <P>No painel "Regras em Tempo Real", cada condição mostra:</P>
        <Code>{'⚪ Aguardando (regras carregadas, bot não iniciado)\n🟢 Condição satisfeita (atual: valor do fact)\n🔴 Condição não satisfeita (atual: valor do fact)'}</Code>

        <H4>Comportamento durante execução:</H4>
        <UL items={[
          <><strong>Cooldown:</strong> Após um trade, o motor ignora os próximos 3 ticks</>,
          <><strong>Aguardando resultado:</strong> Não dispara novo trade até receber resultado do anterior</>,
          <><strong>Buffer:</strong> Mantém histórico de até 200 ticks para análise</>,
        ]} />

        <H4>O que NÃO é suportado no Modo Avançado:</H4>
        <UL items={[
          'RSI, SMA, Bandas de Bollinger ou indicadores técnicos de preço',
          'Análise de tendência ou suporte/resistência',
          'Estratégias baseadas no valor absoluto do preço (apenas último dígito)',
          'Histórico além dos últimos 200 ticks',
        ]} />
      </>
    ),
  },
  {
    id: 'boas-praticas',
    title: '📝 Como Escrever Boas Regras',
    content: (
      <>
        <Code>{'Regra Simples:         "Se o último dígito for 7"\nCom Indicador:         "Quando RSI for menor que 30 e o preço subir 0.2%"\nCom Padrão de Dígito:  "Se o padrão dos dígitos for XXOX"'}</Code>
        <H4>✅ Boas Práticas:</H4>
        <UL items={[
          'Use frases diretas e objetivas',
          'Mencione valores exatos (ex: "maior que 5", "menor que 0.5%")',
          'Use vírgulas para conectar condições AND',
          'Use asterisco (*) + nova linha para condições OR',
        ]} />
        <H4>❌ O que Evitar:</H4>
        <UL items={[
          '"Preço está bom" — muito ambíguo',
          '"Se subir muito" — sem valor específico',
          'Erros de digitação — verifique a ortografia',
        ]} />
      </>
    ),
  },
  {
    id: 'troubleshooting',
    title: '❓ Troubleshooting Comum',
    content: (
      <>
        <div className="space-y-3">
          {[
            {
              prob: 'A regra não está sendo acionada.',
              causes: ['A condição é muito restritiva ou nunca ocorre', 'Erro de digitação ou sintaxe na regra', 'O mercado não apresenta as condições necessárias'],
              sol: ['Simplifique a regra ou use condições mais amplas', 'Revise a escrita cuidadosamente', 'Consulte o histórico de trades'],
            },
            {
              prob: 'Gale não está funcionando.',
              causes: ['Multiplicador de Gale está em 0.0 (desativado)', 'Saldo insuficiente', 'Stop Loss foi atingido'],
              sol: ['Verifique se o Ajuste de Gale está > 0.0', 'Certifique-se de ter saldo suficiente'],
            },
            {
              prob: 'Trades com valores incorretos.',
              causes: ['Configurações de Valor de Entrada ou Stop Loss incorretas'],
              sol: ['Revise as configurações de gestão de risco'],
            },
            {
              prob: 'Filtro de Risco não ativando.',
              causes: ['Intervalo de análise muito alto', 'Não há ticks suficientes'],
              sol: ['Reduza o intervalo para 30-50 ticks', 'Aguarde o sistema coletar mais ticks', 'O fallback automático será usado se houver erro'],
            },
            {
              prob: 'Não consigo trocar de conta.',
              causes: ['Token expirado', 'Conta não adicionada durante OAuth'],
              sol: ['Faça logout e login novamente', 'Verifique o status do token (ícone 🟢/🟡)'],
            },
          ].map(item => (
            <div key={item.prob} className="border border-gray-800 rounded p-3 bg-[#0b0913] space-y-1">
              <div className="text-xs font-semibold text-white">{item.prob}</div>
              <div className="text-xs text-gray-500 font-medium">Causas:</div>
              <UL items={item.causes} />
              <div className="text-xs text-gray-500 font-medium mt-1">Solução:</div>
              <UL items={item.sol} />
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'avisos',
    title: '⚠️ Avisos Importantes',
    warning: true,
    content: (
      <UL items={[
        'Trading envolve riscos. Nunca invista mais do que pode perder.',
        'Teste sempre em modo simulação primeiro.',
        'A IA interpreta estratégias, mas você é responsável pelos resultados.',
        'Monitore sempre seus trades ativamente.',
      ]} />
    ),
  },
];

function ManualSections({ search }: { search: string }) {
  const filtered = search
    ? SECTIONS.filter(s => {
        const title = s.title.toLowerCase();
        return title.includes(search);
      })
    : SECTIONS;

  if (filtered.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-10">Nenhuma seção encontrada para "{search}".</p>;
  }

  return (
    <>
      {filtered.map(s => (
        <Section key={s.id} title={s.title} highlight={s.highlight} warning={s.warning}>
          {s.content}
        </Section>
      ))}
    </>
  );
}
