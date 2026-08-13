Esse gráfico não mede se os mercados estão “andando juntos” de forma geral. Ele mede uma coincidência bem específica — e por isso fica em 0% quase o tempo todo.

Para que serve

É o 4º pilar do Score de Oportunidade (peso 15% no modo equilibrado, 25% no agressivo).

A ideia: se o mercado ativo tem um padrão de dígitos A→B (ex.: depois do 3 costuma vir 7) e o mesmo par A→B aparece ao mesmo tempo em outros índices, a entrada seria mais confiável — um “eco” cross-market.

Fórmula atual:

syncScore = min(100, round(quantos_outros_mercados_têm_o_mesmo_A→B / 3 × 100))

┌─────────────────────────────────┬───────┐
│ Outros mercados com o mesmo A→B │ Score │
├─────────────────────────────────┼───────┤
│ 0                               │ 0%    │
├─────────────────────────────────┼───────┤
│ 1                               │ 33%   │
├─────────────────────────────────┼───────┤
│ 2                               │ 67%   │
├─────────────────────────────────┼───────┤
│ 3+                              │ 100%  │
└─────────────────────────────────┴───────┘

Não olha pressão, tendência nem “clima” do mercado. Só pergunta: o melhor par A→B daqui é literalmente o mesmo par lá?

Por que continua 0%

Não é a barra (isso já foi corrigido). É a definição do número.

Os 7 índices (R_100, R_75, R_50…) são processos independentes. Cada um escolhe o próprio melhor A→B entre ~100 pares possíveis (0→1, 3→7, 8→2…). A chance de dois mercados caírem no mesmo par, na mesma ordem, é da ordem de 1%.

Ainda pior: um mercado pode estar em 3→7 e o outro em 7→3 (o inverso). Isso não conta. Para chegar a 100% precisaria do mesmo par em 3 mercados ao mesmo tempo — praticamente nunca.

Então 0% aqui não significa “o gráfico quebrou de novo”. Significa: nenhum outro índice está com o mesmo A→B do mercado ativo. Esse é o estado normal.

O teste que escrevemos só passa porque alimentamos a mesma sequência 1,2,1,2 em vários símbolos. Na Deriv isso não acontece.

Vale a pena manter assim?

Como confirmação rara de padrão, o desenho até faz sentido — mas como medidor ao vivo, é um gráfico que quase nunca se mexe. E ainda assim entra com até 25% no score.

Se quiser que ele seja útil de verdade, dá para mudar o que ele mede, por exemplo:

1. Quantos mercados têm um padrão forte agora (qualquer A→B, não o mesmo par)
2. Quantos mercados estão com pressão de perdedores parecida com o ativo
3. Correlação da taxa de perdedores entre os 7 índices

Diz qual dessas (ou outra) você quer que a sincronia represente que eu ajusto o cálculo.