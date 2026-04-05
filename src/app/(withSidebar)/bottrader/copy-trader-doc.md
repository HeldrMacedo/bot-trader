Bot Copy Trader
---
Sistema que permite que o usuário conecte uma conta demo e outra real, a todas as operações feitas na conta demo serão replicadas na conta real, dependendo das configurações que o usuário definiu.

Configurações
---
Quantity Loss: Quantidade de perdas na conta demo para entrar na conta real. Exemplo, Quantity Loss estiver com 2, a cada 2 perdas na conta demo, o bot irá entrar na conta real.
Stop Loss: Quantidade de perdas na conta real, em dinheiro, sistema para quando atigir a quantidade de perdas.
Stop Win: Quantidade de ganhos na conta real, em dinheiro, sistema para quando atigir a quantidade de ganhos.
Initial Value: Valor inicial da conta real, em dinheiro.
Stake Multiple: Martingale, multiplicador de aposta.
Pause Time: Tempo de pausa, em segundos entre cada operação na conta real. após uma perda ou ganho.
Limite de Martingale:
Como funciona:
  - Max Martingale = 0 (padrão): sem limite, comportamento atual mantido
  - Max Martingale > 0: ao atingir N losses consecutivos:
    - Reset: zera o nível e volta ao stake inicial (continua operando)
    - Stop: para o bot completamente
  - O nível atual é exibido no painel como 2/5 (nível/máximo) junto com o stake atual
  - Win reseta o nível para 0

  
