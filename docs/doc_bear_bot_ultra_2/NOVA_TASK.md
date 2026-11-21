Fala! Quero acrescentar um módulo novo no Bear Bot Ultra 2. O nome é "Ranking de Padrões W/L por Volatilidade". Segue a lógica completa:

═══════════════════════════
1) A IDEIA EM UMA FRASE
═══════════════════════════
O bot pega os dígitos de CADA volatilidade e transforma cada dígito em W (win) ou L (loss) para CADA contrato que eu ativar (ex.: Over 1, Under 7 e Differ 5 ao mesmo tempo). Depois descobre quais padrões de W/L estão performando melhor, CRIA PADRÕES SOZINHO com base no histórico que vai acumulando e monta um ranking SEPARADO por volatilidade e por contrato. O ranking mostra se o padrão dá lucro de verdade (considerando payout, taxa natural do contrato e tamanho da amostra) e quantos loss seguidos ele toma.
No modo automático, ele opera na combinação volatilidade + contrato + padrão que estiver no topo. No modo manual, sou eu que escolho. E tudo pode rodar em conta REAL ou em PAPEL (simulado).

IMPORTANTE: a análise é INDEPENDENTE por volatilidade. Não é para somar tudo num ranking geral. Cada uma (R_100, R_75, R_50, R_25, R_10, RDBEAR, RDBULL) tem o seu próprio ranking e os seus próprios padrões, separados também por contrato.

═══════════════════════════
2) CONTRATOS: OVER, UNDER E DIFFER AO MESMO TEMPO (EDITÁVEL)
═══════════════════════════
Criar um painel "Contratos analisados" onde eu monto a lista de contratos que o bot vai usar:

[✔] OVER    dígito [ 1 ]
[✔] UNDER   dígito [ 7 ]
[  ] DIFFER  dígito [ 5 ]
[ + Adicionar contrato ]

- Cada linha tem: checkbox (liga/desliga), tipo (Over / Under / Differ) e dígito editável (0 a 9).
- Posso adicionar mais de um do mesmo tipo (ex.: Over 1 e Over 2 juntos). Limite sugerido: até 6 contratos ativos.
- Posso ligar só um, dois ou todos. O bot analisa SOMENTE os que estiverem marcados.
- Validar combinações impossíveis: Over 9 e Under 0 não existem na Deriv. Bloquear com aviso.
- Salvar essa lista nas configurações, para não perder ao recarregar.
- Contrato Combo, que já existe no bot, NÃO entra nesse módulo.

Como cada contrato gera um W/L diferente para o MESMO dígito, cada contrato tem a sua própria fita, o seu próprio ranking, os seus próprios padrões gerados e o seu próprio payout.

Ex.: saiu o dígito 3
- Over 1 → W (3 > 1)
- Under 7 → W (3 < 7)
- Differ 3 → L (3 = 3)
- Differ 5 → W (3 ≠ 5)

DIFFER, dígito fixo ou automático:
- Padrão: dígito fixo que eu escolho na linha.
- Opção [ Differ: testar todos os dígitos ]: o bot analisa Differ 0 até Differ 9 como 10 contratos separados e mostra no ranking qual dígito + padrão está melhor naquela volatilidade.

Taxas naturais teóricas de referência (o bot mede a real, ver item 8):
- Over 1 ≈ 80% / Over 2 ≈ 70% / Under 7 ≈ 70% / Under 8 ≈ 80% / Differ ≈ 90%

═══════════════════════════
3) CONVERSÃO DÍGITO → W / L
═══════════════════════════
Para cada contrato ativo, usar a função isWinCheck() que já existe:
- OVER X: dígito > X = W, senão L
- UNDER X: dígito < X = W, senão L
- DIFFER X: dígito ≠ X = W, dígito = X é L

Os dígitos de cada volatilidade viram uma sequência por contrato, tipo:
R_100 / Over 1:  W W L W W W L L W W ...
R_100 / Under 7: W L W W L W W W L W ...

═══════════════════════════
4) REGRA DE TAMANHO MÍNIMO DO PADRÃO
═══════════════════════════
NENHUM padrão pode ter menos de 4 resultados.
- Configuração "Tamanho mínimo do padrão": 4 ou 5 (padrão = 4).
- Configuração "Tamanho máximo do padrão": até 8.
- Motivo: padrões curtos como "L W" ou "W L" aparecem o tempo todo, acumulam muitas ocorrências e sempre ficam no topo do ranking, mesmo sem serem fortes. Isso deixa o ranking aleatório.
- Essa regra vale para TUDO: padrões da janela, padrões gerados, padrões manuais e importação de arquivo.
- No campo manual, se eu tentar cadastrar um padrão menor que o mínimo, o bot bloqueia e mostra: "Padrão muito curto. Mínimo de X resultados."

Exemplos VÁLIDOS: L W W L / W W L W L / L L W W W
Exemplos BLOQUEADOS: L W / W L / L L W

═══════════════════════════
5) JANELA DE ANÁLISE (CONFIGURÁVEL) E FONTES DOS PADRÕES
═══════════════════════════
JANELA:
- Campo editável "Janela de análise": de 120 a 500 dígitos. PADRÃO = 300.
- Motivo: em Over 1, por exemplo, o L sai só ~20% das vezes. Um padrão como L W W L aparece só ~3 vezes em 120 dígitos, mas ~8 vezes em 300. Com 3 ocorrências o ranking não é confiável.
- Quanto MAIOR a janela, mais confiável e mais lento para reagir. Quanto MENOR, mais rápido e menos confiável. Por isso é configurável: eu ajusto testando no papel.
- Se eu mudar a janela, recalcular o ranking na hora.

AS 3 FONTES DE PADRÕES:
A) PADRÕES DA JANELA (curto prazo)
O bot testa TODAS as combinações de W/L com 4 e 5 resultados (16 + 32 = 48 padrões) dentro da janela configurada de cada volatilidade, para cada contrato ativo, a cada tick.
(Se o mínimo estiver em 5, testa só os 32 de 5 resultados.)

B) PADRÕES GERADOS AUTOMATICAMENTE (longo prazo, ver item 6)
Padrões que o bot cria e aprova sozinho, com base no histórico que ele vai acumulando.

C) PADRÕES MANUAIS (eu cadastro)
Um campo onde eu digito padrões específicos (respeitando o mínimo) e escolho para qual contrato vale (um específico ou todos).

Os três entram no mesmo ranking, com uma etiqueta mostrando a origem: [janela] [gerado] [manual].
Cada padrão é um GATILHO: quando os últimos resultados formarem esse padrão NAQUELE contrato, a entrada é na próxima operação, com aquele contrato.
Obs.: o bot já tem uma parte chamada "padrão" (PatternState, patReps etc.). Esse módulo é outra coisa. Por favor, não misturar com o que já existe.

═══════════════════════════
6) BOTÃO "GERADOR DE PADRÕES" (CRIA PADRÕES SOZINHO)
═══════════════════════════
Um botão ON/OFF: [ GERAR PADRÕES AUTOMATICAMENTE ]

Quando LIGADO:
a) HISTÓRICO ACUMULADO
- O bot guarda os DÍGITOS crus de cada volatilidade conforme eles passam, num buffer SEPARADO da janela de análise (ex.: até 5.000 por volatilidade, configurável).
- Guardar o dígito cru, e não o W/L. Assim o mesmo histórico serve para todos os contratos, e se eu ligar um contrato novo ele já tem histórico para analisar na hora.
- Salvar esse histórico (localStorage/IndexedDB ou banco) para não perder quando eu atualizar a página ou fechar o bot.

b) GERAÇÃO
- A cada X ticks novos (ex.: a cada 50, configurável), o bot analisa o histórico acumulado de cada volatilidade, para cada contrato ativo.
- Testa todas as combinações de W/L de 4 até 8 resultados (16 + 32 + 64 + 128 + 256 = 496 padrões por volatilidade e por contrato). Nunca menos de 4.

c) APROVAÇÃO (o padrão só é aprovado se passar em TODOS os filtros, todos configuráveis)
- Tamanho mínimo de 4 (ou 5)
- Mínimo de ocorrências no histórico (ex.: 20)
- MARGEM REAL positiva (ver item 8): a assertividade segura precisa ficar ACIMA do ponto de empate do payout DAQUELE contrato
- VANTAGEM sobre a taxa natural do contrato (ver item 8) acima do mínimo configurado (ex.: +5 pontos)
- Loss máximo seguido dentro do aceitável e SEM estourar o gale configurado (ver item 9)
- CONSISTÊNCIA: também precisa estar bom na janela de análise atual. Um padrão que era bom horas atrás mas parou de funcionar agora não pode ser aprovado.
Motivo: com centenas de padrões testados, alguns vão parecer ótimos só por sorte. Esses filtros eliminam os falsos.

d) PERÍODO DE PROVA (antes de usar dinheiro real)
- Padrão recém-aprovado entra com status "EM PROVA" e opera só em PAPEL (simulado) por N entradas (ex.: 10, configurável).
- Se mantiver a margem real positiva durante a prova, passa para "ATIVO" e pode operar com dinheiro real.
- Se não mantiver, é reprovado e descartado.
- Opção para eu pular a prova manualmente em um padrão específico.

e) LISTA "PADRÕES GERADOS"
- Lista por volatilidade e por contrato com: padrão, tamanho, contrato, data/hora de criação, status, ocorrências, assertividade bruta, assertividade segura, vantagem, margem real, loss máx. seguido e resultado (real e papel, ver item 10).
- Status possíveis: EM PROVA (azul) / ATIVO (verde) / EM QUEDA (amarelo) / SUSPENSO (vermelho) / FIXADO (cadeado).
- Filtro na lista por volatilidade e por contrato.

f) LIMPEZA AUTOMÁTICA
- A cada nova análise, o bot reavalia os padrões gerados.
- Se um padrão cair abaixo dos filtros, fica "EM QUEDA" e o bot para de usar.
- Se continuar ruim por X análises seguidas (ex.: 3), é removido sozinho.
- Botão de "fixar" (cadeado) para o bot não remover aquele padrão.
- Se eu DESLIGAR um contrato no painel, os padrões dele ficam guardados (não apagar). Voltam a valer quando eu religar.

g) BOTÕES EXTRAS
- [ GERAR AGORA ]: roda a análise na hora
- [ LIMPAR HISTÓRICO ]: zera o aprendizado de uma volatilidade, de um contrato ou de tudo
- [ EXPORTAR / IMPORTAR ]: salvar os padrões gerados em arquivo e carregar depois

═══════════════════════════
7) CÁLCULO BÁSICO DE CADA PADRÃO
═══════════════════════════
Para cada volatilidade, cada contrato ativo e cada padrão (janela, gerado ou manual):
a) Percorrer a janela de análise configurada (padrão 300 dígitos).
b) Toda vez que o padrão aparecer, olhar o resultado SEGUINTE (é onde o bot teria entrado).
c) Contar:
   - Ocorrências
   - Acertos (próximo foi W) e Erros (próximo foi L)
   - Assertividade bruta % = acertos ÷ ocorrências
   - MÁXIMO, MÍNIMO e MÉDIA de loss seguidos (sequência de entradas perdidas seguindo esse padrão)
   - Maior sequência de L "crua" daquele contrato na janela (sem padrão), só como referência
   - Para padrões gerados: mostrar lado a lado os números do HISTÓRICO e da JANELA

═══════════════════════════
8) AS 3 MÉTRICAS QUE DEFINEM SE O PADRÃO É BOM DE VERDADE
═══════════════════════════
A assertividade bruta sozinha engana. Exemplo: em Over 1, os dígitos 2 a 9 já dão W em ~80% das vezes, mesmo sem padrão nenhum. Em Differ, ~90%. Um padrão com 80% de acerto em Over 1 não está fazendo nada, é só o contrato funcionando. E como cada contrato tem taxa e payout diferentes, só essas métricas permitem comparar Over x Under x Differ de forma justa.

A) TAXA NATURAL (base), por volatilidade e por contrato
- % de W daquele contrato na janela, sem padrão nenhum (tudo W ÷ total). Medir na prática, e não usar só a teoria.
- VANTAGEM = assertividade do padrão − taxa natural.
  Ex.: taxa natural 80%, padrão acerta 88% → vantagem +8 pontos.

B) ASSERTIVIDADE SEGURA (corrige amostra pequena)
- Usar o limite inferior de Wilson, com z = 1,96 (configurável):
  segura = ( p + z²/2n − z × √( p(1−p)/n + z²/4n² ) ) ÷ ( 1 + z²/n )
  p = assertividade bruta (0 a 1), n = ocorrências
- Exemplos: 5 de 5 (100% bruto) → ~57% seguro. 90 de 100 (90% bruto) → ~83% seguro.
- Assim um padrão com pouca amostra não fica em 1º só por sorte. Isso é ainda mais importante quando eu usar janelas menores. O motor já tem um campo "wilson" no PatternState, dá pra reaproveitar a fórmula.

C) PONTO DE EMPATE E MARGEM REAL (considera o payout DE CADA CONTRATO)
- Pegar o payout atual de cada contrato pela proposta (Over 1, Under 7 e Differ pagam valores bem diferentes).
- Ponto de empate = 1 ÷ (1 + payout). Ex.: payout de 20% (0,20) → precisa acertar 83,3% só para empatar. Differ paga bem menos, então o ponto de empate dele é bem mais alto.
- MARGEM REAL = assertividade segura − ponto de empate.
- Margem positiva = padrão tende a dar lucro. Margem negativa = perde dinheiro no longo prazo, mesmo com assertividade "alta".
- Recalcular sempre que o payout mudar.

═══════════════════════════
9) LOSS SEGUIDO x GALE CONFIGURADO
═══════════════════════════
- Usar a quantidade de gales que eu configurei no bot.
- Para cada padrão, calcular quantas vezes na janela (e no histórico) a sequência de loss seguidos teria passado do número de gales, ou seja, quantas vezes o ciclo teria ESTOURADO.
- Mostrar assim: "Gale 2 → estourou 1x em 300 dígitos" (usando o tamanho da janela configurada).
- Filtro configurável: máximo de estouros aceitável (ex.: 0). Padrão que estoura acima disso não entra no automático.

═══════════════════════════
10) RESULTADO DE CADA PADRÃO (REAL E PAPEL)
═══════════════════════════
- Além da estatística "de laboratório", registrar por padrão, por volatilidade e por contrato: entradas, wins, losses e lucro/prejuízo em dinheiro.
- Separar SEMPRE o resultado REAL do resultado PAPEL (colunas/abas diferentes, nunca misturar).
- Comparar o resultado com a assertividade esperada.
- Se o resultado ficar muito abaixo do esperado (ex.: 15 pontos abaixo depois de no mínimo 10 entradas, configurável), o bot SUSPENDE o padrão sozinho e avisa no log.
- Botão para reativar manualmente.
- Resumo por contrato: quanto Over, Under e Differ deram de resultado no dia (real e papel), para eu ver qual está rendendo mais.

═══════════════════════════
11) PAUSA POR VOLATILIDADE DEPOIS DE LOSS (CONFIGURÁVEL)
═══════════════════════════
Configurações na tela:
- [ Pausa após loss: LIGADA / DESLIGADA ]
- [ Pausar quando: estourar o ciclo de gale / tomar X losses seguidos ] → X editável
- [ Tempo de pausa: ___ minutos ] → editável (ex.: 1 a 60, padrão 10)

Funcionamento:
- Quando a condição acontecer, aquela volatilidade fica BLOQUEADA pelo tempo configurado, para todos os contratos.
- Durante o bloqueio, o automático procura entrada nas outras volatilidades.
- O card da volatilidade mostra um contador: "Pausada, volta em 07:32".
- Botão para liberar a volatilidade antes do tempo, se eu quiser.
- No modo manual, mostra só um aviso, sem bloquear (a decisão é minha).
- Funciona igual em REAL e em PAPEL.

═══════════════════════════
12) ORDEM DO RANKING
═══════════════════════════
Cada volatilidade tem o seu ranking, e dentro dele aparecem os padrões de TODOS os contratos ativos misturados, cada um com a etiqueta do contrato (ex.: [Over 1] L W W L). Também ter filtro para ver só um contrato.

1º maior MARGEM REAL (assertividade segura − ponto de empate do contrato)
2º desempate: maior VANTAGEM sobre a taxa natural do contrato
3º desempate: menos estouros de gale
4º desempate: menor máximo de loss seguidos
5º desempate: padrão MAIS LONGO (com o resto igual, o de 5 fica na frente do de 4)
6º desempate: mais ocorrências

Mínimo de ocorrências para entrar no ranking: configurável (ex.: 5 na janela, 20 no histórico).
O ranking recalcula a cada tick novo (janela deslizante) e sempre que o payout ou o tamanho da janela mudar.

═══════════════════════════
13) TELA
═══════════════════════════
Um card/tabela para CADA volatilidade mostrando o TOP 5 (ou TOP 10, configurável):
Posição | Contrato | Padrão | Tamanho | Origem | Status | Ocorr. | Assert. bruta | Assert. segura | Vantagem | Margem real | Loss máx. | Estouros de gale | Resultado
- Cor da margem real: verde se positiva, vermelha se negativa.
- Cor/etiqueta diferente por tipo de contrato (ex.: Over azul, Under laranja, Differ roxo).
- No topo de cada card, para cada contrato ativo: taxa natural, payout atual e ponto de empate.
- Destaque visual do TOP 1 de cada volatilidade.
- Fita dos últimos resultados (W W L W...) de cada volatilidade, com uma linha por contrato ativo.
- Indicador "PADRÃO FORMANDO", quando os últimos resultados estiverem a 1 passo de formar um padrão do topo.
- Contador de pausa quando a volatilidade estiver bloqueada.
- Painel resumo no topo da tela: "Melhores padrões agora", com o TOP 1 de cada volatilidade lado a lado (mostrando contrato + padrão).
- Selo bem visível no topo: "MODO REAL" (vermelho) ou "MODO PAPEL" (cinza/azul), para eu nunca confundir.
- Mostrar no topo o tamanho da janela em uso (ex.: "Janela: 300 dígitos"), com atalho para alterar.
- Painel "Contratos analisados" (item 2) sempre acessível.
- Aba "Padrões Gerados", com a lista do item 6 e quantos dígitos já foram acumulados em cada volatilidade.
- Botão "?" com explicação curta de cada métrica (pode reaproveitar o componente HelpTip).

═══════════════════════════
14) BOTÃO AUTOMÁTICO / MANUAL (OPERAÇÃO)
═══════════════════════════
Um botão (toggle) bem visível: [ AUTOMÁTICO ] / [ MANUAL ]
(É diferente do botão do Gerador e do botão Real/Papel. Um controla como os padrões são CRIADOS, outro como o bot OPERA, e o outro se é dinheiro REAL ou SIMULADO.)

MODO AUTOMÁTICO (o bot decide tudo):
- Usa os padrões ATIVOS de todos os contratos ligados e escolhe pelo ranking. Padrões EM PROVA operam só no papel, em paralelo.
- Monitora todas as volatilidades e todos os contratos ativos ao mesmo tempo (menos as volatilidades em pausa).
- Quando os últimos resultados de uma volatilidade formarem o padrão que está no TOP do ranking DAQUELA volatilidade, ele troca para ela e entra com o CONTRATO daquele padrão (Over, Under ou Differ, com o dígito configurado).
- Se duas ou mais combinações baterem ao mesmo tempo (mesma volatilidade com contratos diferentes, ou volatilidades diferentes), entra na que tiver a maior margem real.
- UMA operação por vez (padrão). Opção configurável "permitir operações simultâneas" para entrar em mais de um contrato ao mesmo tempo, desligada de fábrica.
- Vai trocando de volatilidade e de contrato sozinho conforme os padrões vão batendo (dá pra reaproveitar a lógica de troca de mercado do multiOn / topOpportunityCandidate).
- Não trocar de volatilidade, contrato nem padrão no meio de um gale. O gale continua no MESMO contrato e no MESMO dígito até o ciclo terminar.
- SÓ entra se a margem real for positiva. Isso é regra fixa, não pode ser desligada.
- Filtros configuráveis: vantagem mínima sobre a taxa natural, máximo de estouros de gale, loss máximo seguido aceitável, usar só o Top 1 ou o Top 3, "operar só com padrões gerados" e "operar só com o contrato X".

MODO MANUAL (eu decido):
- O ranking e o gerador continuam funcionando e mostrando tudo normalmente.
- Eu clico no padrão que quero usar (ele já vem com o contrato dele) e escolho a volatilidade (ou deixo "todas").
- O bot só entra quando ESSE padrão escolhido por mim formar, com aquele contrato. Não troca nada sozinho.
- Se eu escolher um padrão com margem real negativa, mostrar um aviso, mas deixar eu operar.
- Botão para travar/destravar a volatilidade escolhida.

Posso alternar entre os dois modos a qualquer momento. Se trocar no meio de um gale, a troca só vale quando o ciclo atual terminar.
Stop win, stop loss, gale e stake continuam os mesmos que já existem no bot, nos dois modos, e valem para o resultado somado de todos os contratos.

═══════════════════════════
15) BOTÃO REAL / PAPEL (OPERAR SIMULADO)
═══════════════════════════
Um botão (toggle) bem visível: [ REAL ] / [ PAPEL ]
Pode reaproveitar o paperMode que já existe no bot.

MODO PAPEL:
- O módulo inteiro funciona igualzinho (ranking, gerador, automático, manual, gale, pausa, stop win/loss), mas NENHUMA ordem é enviada para a Deriv.
- O resultado de cada entrada é calculado pelo dígito que saiu de verdade, usando o payout real da proposta naquele momento, para a simulação ficar fiel.
- Saldo simulado próprio (configurável, ex.: começar com $100), separado do saldo real.
- Funciona tanto no AUTOMÁTICO quanto no MANUAL.
- Log e histórico marcados com [PAPEL], separados do real.
- Botão [ ZERAR PAPEL ]: reinicia o saldo e o histórico simulado.

MODO REAL:
- Opera normalmente na conta Deriv conectada.
- Padrões EM PROVA continuam rodando no papel em paralelo, mesmo com o modo REAL ligado (item 6d).

Segurança:
- Ao trocar de PAPEL para REAL, pedir confirmação ("Você vai operar com dinheiro real. Confirmar?").
- Não trocar no meio de um ciclo de gale. A troca vale a partir da próxima entrada nova.

═══════════════════════════
16) PONTOS TÉCNICOS
═══════════════════════════
- Hoje o buffer guarda só 120 dígitos por mercado (shift quando passa de 120). Precisa aumentar para o tamanho máximo da janela (500) + o tamanho do maior padrão (8). Guardar 500 dígitos por volatilidade não pesa nada.
- O histórico longo do gerador (item 6) fica num buffer SEPARADO, para não pesar o loop principal.
- Guardar dígitos crus e converter para W/L por contrato na hora da análise.
- Fazer a análise do gerador fora do loop de ticks (Web Worker ou setTimeout), para não travar a tela nem atrasar entradas. Com vários contratos ativos (e principalmente com "Differ: testar todos os dígitos"), o volume de cálculo multiplica, então isso é obrigatório.
- Ao ligar o bot, puxar o histórico com ticks_history (count igual à janela configurada, ou até 5000 para alimentar o gerador) de cada volatilidade, para o ranking já começar preenchido.
- Pegar o payout de cada contrato ativo, em cada volatilidade, pela proposta (proposal), mesmo das que não estão em foco, para calcular o ponto de empate. O modo papel também usa esse payout.
- A entrada usa o tipo certo de contrato da Deriv: DIGITOVER / DIGITUNDER / DIGITDIFF com a barreira (dígito) do contrato escolhido. O motor já monta isso hoje, então é só passar o contrato do padrão vencedor.
- Os padrões gerados ficam guardados SEPARADOS por contrato + dígito (Over 1 tem os seus, Under 7 os seus etc.), para um não contaminar o outro.
- Validar o tamanho mínimo em todos os lugares (janela, gerador, campo manual e importação).
- Registrar no log de operações: REAL ou PAPEL, volatilidade, contrato + dígito, padrão, tamanho, origem, status, posição no ranking, assertividade segura, margem real, payout e tamanho da janela no momento da entrada. Assim consigo avaliar depois o que realmente funciona.

Qualquer dúvida me chama antes de começar, pra não quebrar o que já está funcionando.