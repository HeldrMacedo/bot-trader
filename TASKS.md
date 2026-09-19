## Corrigir o bloco "Testes antes de operar"
Altualmente o bloco [ConfigSidebar.tsx#L138-177](textBlock;file:///home/helder/Desenvolvimento/bot-trader/src/app/%28withSidebar%29/bear-bot-differ/components/ConfigSidebar.tsx#L138-177) não esta funcionando corretamente, as opções Liberar real após (ops)e Com acerto simulado ≥ não estão funcionando.

adicione um checkbox para liberar os campos Liberar real após (ops) e Com acerto simulado ≥, com o checkbox marcado siginifica que esses modos de teste estão ativos, senão estiver desativado.

#### Comportamento dos campos

Quando o modo de operação estiver em simulação, o checkbox ficará disponivel para marcação, se o usuário marcar o checkbox, significa que o bot vai fazer operações simuladas até atingir o número de operações (ops) definido no campo Liberar real após (ops) e a porcentagem de acertos definida no campo Com acerto simulado %. 

Se o bot atingir o número de operações e a porcentagem de acertos, o bot vai começar a fazer operações reais, se não atingir o número de operações e a porcentagem de acertos, o bot volta a fazer as operações simuladas do zero. O objetivo é garantir que o bot esteja testado e validado antes de operar com dinheiro real.

As entradas simuladas e real continuam a depender da lógica pricipal escolhida pelo usuário no campo [OperationTab.tsx#L281-303](textBlock;file:///home/helder/Desenvolvimento/bot-trader/src/app/%28withSidebar%29/bear-bot-differ/components/tabs/OperationTab.tsx#L281-303)  para poder fazer as entradas:
Por exemplo, o usuario escolheu a lógica "A líder por acerto medido — maior acerto da tabela" (que esta na posição 1 do ranking), e o usuario marcou o checkbox Liberar real após (ops) com valor 10 e Com acerto simulado ≥ 60%, dessa forma o bot vai começar a fazer operaçãos simuladas quando a lógica for atendida, ou seja, vai fazer 10 entradas simuladas nessa logica, se ele tiver pelo menos 60% de acerto, ele vai começar a fazer operações reais, se não, ele vai voltar a fazer operações simuladas do zero.


**Stoploss, stopwin e martingale não contam no modo simulado.**

#### Modo automático e modo manual
- **Automático:** O bot vai fazer operações automaticamente até atingir o número de operações (ops) definido no campo Liberar real após (ops) e a porcentagem de acertos definida no campo Com acerto simulado %. Se o bot atingir o número de operações e a porcentagem de acertos, o bot vai começar a fazer operações reais, se não atingir o número de operações e a porcentagem de acertos, o bot volta a fazer as operações simuladas do zero.
  
- **Manual:** as entradas simuladas serão automaticas e o botão "Entrar no alvo recomendado" só será liberada quando atigir o Liberar real após (ops) e a porcentagem de acertos, então o botão ficará liberado quando atingir a proxíma logica e quando clicar entrará na real.

Faça testes automatizados para garantir que os campos Liberar real após (ops) e Com acerto simulado % estejam funcionando corretamente. 