O robô precisa de **50 ticks** para concluir a coleta inicial e realizar a **análise estatística completa** do gráfico/mercado. 

---

### Cronograma de Ativação por Ticks

Embora ele comece a calcular os primeiros números logo no início, a análise é ativada progressivamente em fases:

1. **3 Ticks:** ⚡ **Primeiro Cálculo:** A Inteligência Artificial começa a atualizar os dados de inteligência de mercado a cada 3 ticks recebidos.
2. **8 Ticks:** 🔍 **Detecção de Padrões:** Mínimo necessário para o algoritmo identificar o primeiro padrão estatístico $A \rightarrow B$.
3. **10 Ticks:** 📊 **Taxa Observada:** Mínimo para exibir a assertividade/taxa observada de acertos no gráfico.
4. **12 Ticks:** ⚠️ **Anomalia de Mercado:** Mínimo para detectar excesso anormal de dígitos perdedores na janela recente.
5. **30 Ticks:** 📐 **Teste Qui-Quadrado ($\chi^2$):** Mínimo para rodar o teste de distribuição uniforme de dígitos.
6. **50 Ticks:** 🎯 **ANÁLISE COMPLETA (Fase "Coletando Dados" Concluída):**
   - É a quantidade exata necessária para calcular o pilar de **Pressão de Perdedores** ([BearBot2Engine.ts#L392](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts#L392)), pois ele compara o histórico em 3 janelas simultâneas (10, 25 e 50 ticks).
   - O painel altera o status de **`⏳ coletando dados`** para a recomendação oficial de operação ([IntelPanel.tsx#L118](file:///home/helder/Desenvolvimento/bot-trader/src/app/(withSidebar)/bear-bot-ultra-2/components/IntelPanel.tsx#L118)):
     - **🟢 BOM MOMENTO — IA aprova entrada** (Score $\ge 60$)
     - **🟡 ATENÇÃO — condições medianas** (Score de 40 a 59)
     - **🔴 ESPERE — IA bloqueia entrada** (Score $< 40$)

---

### Memória Máxima

O robô mantém na memória até **120 ticks** por mercado ([BearBot2Engine.ts#L231](file:///home/helder/Desenvolvimento/bot-trader/src/app/services/BearBot2Engine.ts#L231)). À medida que chegam novos ticks (ex: tick 121), o tick mais antigo é descartado, garantindo uma análise sempre atualizada e dinâmica da volatilidade.