/**
 * Traduções - Português Brasileiro
 * Baseline para outros idiomas
 * VERSÃO GLOBAL (sem ES6 export)
 */

// Inicializar objeto global de traduções
if (!window.i18nTranslations) {
    window.i18nTranslations = {};
}

window.i18nTranslations['pt-BR'] = {
    // ========================================
    // LANDING PAGE
    // ========================================
    landing: {
        title: "Strategy Free",
        subtitle: "Trading Inteligente com IA para Deriv",
        cta: "Iniciar Agora",

        features: {
            ai: "IA Avançada",
            realtime: "Tempo Real",
            secure: "100% Seguro"
        },

        security: "Seus tokens nunca são armazenados",

        info: {
            how_it_works: "Como Funciona",
            how_it_works_desc: "Conecte sua conta Deriv, configure estratégias personalizadas e deixe a IA monitorar o mercado 24/7.",

            ai_powered: "Powered by IA",
            ai_powered_desc: "Algoritmos avançados de machine learning analisam padrões e tomam decisões em milissegundos.",

            secure: "Seguro e Confiável",
            secure_desc: "Seus tokens nunca são armazenados. Conexão direta e criptografada com a API da Deriv."
        },

        footer: {
            rights: "© 2026 Strategy Free. Todos os direitos reservados.",
            creator: "Criado por"
        },
        analyzers: {
            statistical_predictor: {
                title: "📈 Sistema de Previsão Estatística",
                subtitle: "Análise probabilística dos últimos 200 ticks",
                asset_label: "Ativo Sintético:",
                period_label: "📊 Período (Ticks):",
                analyze_button: "🔮 Analisar Probabilidades",
                analyzing: "Analisando últimos 200 ticks...",
                loading: "Carregando...",
                period_placeholder: "1-1000"
            },
            pattern_analyzer: {
                title: "📊 Analisador de Padrões",
                subtitle: "Teste seus padrões com dados históricos reais",
                asset_label: "Ativo Sintético:",
                contract_label: "Contrato:",
                prediction_label: "Previsão:",
                prediction_placeholder: "0-9",
                pattern_label: "Padrão:",
                pattern_placeholder: "Ex: XXO, XXOX, OOXOO",
                period_label: "📊 Período (Ticks):",
                period_placeholder: "1-1000",
                analyze_button: "🔍 Analisar Padrão",
                loading: "Carregando..."
            }
        }
    },

    // ========================================
    // INTERFACE PRINCIPAL
    // ========================================
    app: {
        header: {
            balance: "Saldo",
            account: "Conta",
            logout: "Sair",
            version: "Versão Pro 2.0"
        },
        sidebar: {
            menu: "Menu"
        },
        history: {
            no_trades: "Nenhum trade executado ainda"
        },
        tabs: {
            monitoring: "Monitoramento",
            configurations: "Configurações",
            robot_editor: "Editor de Robôs"
        },
    },

    loading: {
        title: "Strategy Free",
        selection: {
            title: "🎯 Selecione o Ativo de Trading",
            subtitle: "O ativo poderá ser alterado durante a sessão",
            placeholder: "Selecione um ativo...",
            warning_title: "Importante:",
            warning_text: "As funções disponibilizadas no nosso site são complexas e comportam um risco significativo de perda potencial. Os CFDs são instrumentos financeiros complexos com um elevado risco de perda rápida de capital devido à alavancagem. Deve avaliar se compreende como funcionam e se pode assumir o alto risco de perder o seu dinheiro.",
            confirm: "Confirmar Seleção"
        },
        states: {
            initializing: "Inicializando sistema...",
            cleaning: "Limpando dados desnecessários...",
            validating_session: "Validando sessão...",
            verifying_auth: "Verificando autenticação...",
            connecting: "Conectando à Deriv API...",
            fetching_data: "Obtendo dados da conta...",
            loading_configs: "Carregando configurações...",
            init_interface: "Inicializando interface...",
            preparing_market: "Preparando dados de mercado...",
            complete: "Carregamento concluído!",
            syncing_market: "Sincronizando dados de mercado...",
            waiting_market: "Aguardando dados de mercado (Tente recarregar se demorar)...",
            loading_images: "Carregando imagens dos botões...",
            verifying_terms: "Verificando termos de uso...",
            verifying_credits: "Verificando créditos...",
            selecting_asset: "Selecionando ativo...",
            auth_redirect: "Redirecionando para autenticação...",
            connecting_validation: "Conectando ao servidor para validação...",
            validating_account: "Validando conta {current}/{total}...",
            saving_authorized: "Salvando {count} contas autorizadas...",
            creating_session: "Criando sessão para {count} contas...",
            saving_account_progress: "Salvando conta {current}/{total}...",
            creating_account_list: "Criando lista de contas...",
            finishing_config: "Finalizando configuração para {loginid}..."
        },
        phrases: [
            "Crie seus próprios robôs apenas com o prompt de sua estratégia",
            "Faça suas operações automatizadas com suas próprias ideias",
            "Seja criativo e deixe que a IA automatize sua estratégia para você",
            "Crie grupos de regras para aumentar suas chances",
            "Deixe que a IA analise o mercado e crie uma estratégia potencializada para você",
            "Monitore múltiplos ativos simultaneamente em tempo real",
            "Configure cooldowns inteligentes para proteger seu capital",
            "Use indicadores técnicos avançados sem complexidade",
            "Transforme suas ideias em estratégias vencedoras automaticamente",
            "Opere com segurança usando nossos sistemas de proteção",
            "Acesse relatórios detalhados de todas suas operações",
            "Combine múltiplas regras para estratégias mais eficazes",
            "Deixe a IA sugerir melhorias para suas estratégias existentes",
            "Opere em modo simulação antes de usar capital real",
            "Crie estratégias baseadas em padrões de dígitos históricos",
            "Configure stops automáticos para proteger seus lucros",
            "Não perca mais tempo com estratégias que não funcionam",
            "Não invista seu dinheiro em conta real se não conhece os riscos",
            "Use nosso sistema de proteção para evitar perdas desnecessárias",
            "Converse com a IA Trader para obter dicas e informações sobre o mercado",
            "Use sua conta virtual ou nosso sistema de simulação para testar as estrategias",
            "Crie um gerenciamento forte para suas operações",
            "Faça o download de suas automações em arquivo Json para usar depois",
            "Faça um Tour pelo nosso sistema para entender melhor como ele funciona",
            "Use o sistema de IA paa criar estratégias baseadas em padrões de dígitos históricos",
            "Use nossa ferramenta tutorial de estratégias para te ajudar e desenvolver a sua"
        ]
    },

    tabs: {
        monitoring: "Monitoramento",
        configurations: "Configurações",
        robot_editor: "Editor de Robôs"
    },

    monitoring: {
        title: "Monitoramento de Grupos",
        start: "Iniciar Monitoramento",
        stop: "Parar",
        active_groups: "Grupos Ativos",
        no_groups: "Nenhum grupo ativo",

        filters: {
            all: "Todos",
            active: "Ativos",
            inactive: "Inativos"
        },

        // Tooltips e labels adicionais
        rule_assistant_title: "Assistente de Criação de Regras",
        tour_guide_title: "Tour Guiado - Conheça o Sistema",
        manual_title: "Manual de Instruções",
        automations_title: "Clique para ver as automações disponíveis",
        visual_editor_title: "Editor de Robôs Visuais",
        history_title: "Ver histórico de regras usadas",
        examples_title: "Ver modelos de exemplos",
        suggestions_title: "Ver sugerões da IA",
        spreadsheet_title: "Ver planilha de trades",
        ia_suggestions_title: "Gerar sugestões com IA",
        chart_title: "Gráfico em Tempo Real",
        vip_title: "Upgrade para VIP",
        library_title: "Biblioteca de Estratégias Compartilhadas",
        clear_messages_title: "Limpar histórico de mensagens",
        mode_text: "📝 Texto",
        mode_text_title: "Editar regras em texto",
        mode_config: "⚙️ Config",
        mode_config_title: "Ajustar parâmetros",
        strategy_placeholder: "Digite aqui sua estratégia de monitoramento...&NoBreak;!Exemplo:&NoBreak;- Monitorar quando o preço subir 3 pontos consecutivos&NoBreak;- Alertar quando atingir resistência de 1.2500&NoBreak;- Acompanhar padrão de reversão...",
        config_mode_info: "Digite suas regras no modo Texto e inicie o monitoramento para gerar os parâmetros editáveis.",
        no_trades_yet: "Nenhum trade executado ainda",
        start_monitoring_title: "Iniciar Monitoramento",
        immediate_execution_title: "Modo Execução Imediata - Executa 1 trade a cada clique sem aguardar regras",
        reset_pl_title: "Resetar P&L",
        stop_monitoring_title: "Parar Monitoramento",

        examples: {
            digits_under_4: {
                desc: "entrar quando os digitos inferiores a 4 > 50%",
                display: "Percentual do dígitos abaixo de 3 > 50%",
                label_val: "Dígito Referência (G1R1)",
                label_target: "Percentual Alvo (G1R1)",
                label_period: "Período Percentual (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* entrar quando os digitos inferiores a 4 > 50%"
            },
            last_digits_gt_8: {
                desc: "Entrar quando os ultimos 3 digitos > 8",
                display: "Últimos 3 dígitos: X,X,X > 8",
                label_count: "Qtd. Últimos Dígitos (G1R1)",
                label_val: "Dígito Referência (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando os ultimos 3 digitos > 8"
            },
            digits_even_sequence: {
                desc: "Entrar quando os ultimos 5 digitos forem todos pares",
                display: "Últimos 5 dígitos pares",
                label_count: "Qtd. Últimos Dígitos (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando os ultimos 5 digitos forem todos pares"
            },
            specific_digit_9: {
                desc: "Entrar quando ultimo digito = 9",
                display: "Últimos 1 dígitos: X = 9",
                label_count: "Qtd. Últimos Dígitos (G1R1)",
                label_val: "Dígito Referência (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando ultimo digito = 9"
            },
            pattern_xxoo: {
                desc: "Entrar quando o padrão dos digitos for XXOO",
                display: "Previsão dinâmica: Padrão digit_pattern",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando o padrão dos digitos for XXOO"
            },
            rsi_gt_70: {
                desc: "Entrar quando RSI > 70",
                display: "RSI(14) > 70",
                label_val: "Dígito Referência (G1R1)",
                label_period: "Período Percentual (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando RSI > 70"
            },
            sma_10_gt_20: {
                desc: "Entrar quando SMA 10 > SMA 20",
                display: "SMA(10) > SMA(20)",
                label_period1: "Período SMA 1 (G1R1)",
                label_period2: "Período SMA 2 (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando SMA 10 > SMA 20"
            },
            percentage_below_3_gt_40: {
                desc: "Entrar quando percentual de digitos abaixo de 3 > 40%",
                display: "Percentual do dígitos abaixo de 4 > 30%",
                label_val: "Dígito Referência (G1R1)",
                label_target: "Percentual Alvo (G1R1)",
                label_period: "Período Percentual (G1R1)",
                logic: "OR entre grupos, AND dentro do grupo",
                original: "* Entrar quando percentual de digitos abaixo de 3 > 40%"
            }
        }
    },

    configurations: {
        title: "Configurações",
        general: "Geral",
        trading: "Negociação",
        notifications: "Notificações",

        save: "Salvar",
        cancel: "Cancelar",
        reset: "Restaurar Padrão",

        account_balance: "Saldo da Conta",
        trade_header: "💰 Trade",
        management_header: "📚 Gestão",
        control_header: "🥞 Controle",
        contract_label: "Contrato:",
        trade_type_label: "Tipo Trade:",
        select_contract_first: "Selecione um contrato primeiro",
        loading_contracts: "Carregando contratos...",
        duration_label: "Duração:",
        time_unit_ticks: "Ticks",
        time_unit_seconds: "Segundos",
        time_unit_minutes: "Minutos",
        time_unit_hours: "Horas",
        prediction_label: "Previsão:",
        prediction_placeholder: "Ex: 0, 1, 2, 3...",
        stake_label: "Valor de Entrada:",
        goal_label: "Valor da Meta:",
        stop_loss_label: "Valor Stop Loss:",
        gale_adjustment_label: "Ajuste de Gale:",
        gale_multiplier_title: "Multiplicador do cálculo automático de recuperação",
        gale_threshold_title: "Valor mínimo de perda acumulada para iniciar a divisão (Gatilho)",
        split_gale_title: "Selecionar quantidade de parcelas da divisão",
        soros_amount_label: "Qtde Soros:",
        soros_input_title: "Defina quantas vitórias seguidas usarão lucro acumulado (0 = Desativado)",
        soros_percent_title: "Porcentagem do lucro a ser reinvestida na próxima stake (%)",
        gale_removes_soros_title: "🛡️ Proteger Soros: Remove o acréscimo do Soros ao calcular o Gale (usa apenas stake base)",
        real_wins_label: "Vitórias Reais:",
        real_losses_label: "Perdas Reais:",
        sim_wins_label: "Vitórias Simuladas:",
        sim_losses_label: "Perdas Simuladas:",
        trade_limit_label: "Limite de Trades:",
        integer_validation: "Apenas números inteiros",
        current_asset_loading: "💎 Carregando...",
        error_no_symbol: "❌ [GET SYMBOL] CRÍTICO: Nenhum ativo selecionado!",
        error_container: "❌ Erro: Container não encontrado:",
        asset_account_logout: "🚪 Sair"
    },

    robot_editor: {
        title: "Editor de Robôs",
        new: "Novo Robô",
        load: "Carregar",
        save: "Salvar",
        run: "Executar",
        stop: "Parar",
        organize: "Organizar",
        logs: "Logs",
        close: "Fechar",

        account_select: "Selecionar Conta",
        balance: "Saldo"
    },

    footer: {
        analytics: {
            digits_freq: "Mais/Menos Frequente (25)",
            even_odd: "Par/Ímpar (25)",
            pattern: "Padrão Frequente (100)",
            up_down: "Acima/Abaixo (100)",
            volume: "Maior Volume (100)",
            sequence: "Sequência Máx."
        },
        refresh_balance: "Atualizar saldo manualmente",
        logout: "Sair"
    },

    tour: {
        stop: "Parar Tour",
        next: "Próximo →",
        finish: "Finalizar",
        steps: {
            asset_selector: {
                title: "Seletor de Ativo",
                desc: "Escolha qual ativo deseja negociar. Clique para ver a lista de ativos disponíveis."
            },
            account_selector: {
                title: "Seletor de Conta",
                desc: "Selecione qual conta Deriv usar: Real ou Virtual."
            },
            asset_display: {
                title: "Display de Ativo Selecionado",
                desc: "Mostra o ativo que será usado em suas negociações."
            },
            rule_assistant: {
                title: "Assistente de Regras 🤓",
                desc: "Assistente inteligente que ajuda a criar regras de forma guiada."
            },
            restart_tour: {
                title: "Reiniciar Tour ♻",
                desc: "Clique aqui a qualquer momento para rever este tutorial."
            },
            manual: {
                title: "Manual de Instruções ❓",
                desc: "Abra o manual completo com instruções detalhadas sobre o sistema."
            },
            automations: {
                title: "Automações 🤖",
                desc: "Acesse ferramentas de automação e chat com IA."
            },
            history: {
                title: "Histórico de Regras 📋",
                desc: "Acesse o histórico de regras usadas anteriormente."
            },
            examples: {
                title: "Exemplos de Regras 📚",
                desc: "Veja modelos prontos de regras de negociação."
            },
            suggestions: {
                title: "Sugestões IA 💡",
                desc: "Receba sugestões inteligentes baseadas no mercado atual."
            },
            spreadsheet: {
                title: "Planilha de Trades 📝",
                desc: "Exporte seus trades e veja estatísticas detalhadas."
            },
            ia_generative: {
                title: "IA Generativa 🧠",
                desc: "Use a IA para criar estratégias complexas automaticamente."
            },
            chart: {
                title: "Gráfico em Tempo Real 📉",
                desc: "Visualize o gráfico de preços e indicadores técnicos."
            },
            credits: {
                title: "Carregar Créditos 💰",
                desc: "Gerencie seus créditos para recursos premium."
            },
            library: {
                title: "Biblioteca de Estratégias",
                desc: "Acesse estratégias compartilhadas pela comunidade."
            },
            session_settings: {
                title: "Configurações da Sessão",
                desc: "Configure contrato, valor da aposta e Martingale."
            },
            trading_rules: {
                title: "Regras de Negociação",
                desc: "Digite suas regras em linguagem natural."
            },
            start_btn: {
                title: "Botão Iniciar (ON)",
                desc: "Inicie o monitoramento e execução automática."
            },
            immediate_entry: {
                title: "Entrada Imediata",
                desc: "Execute uma ordem imediatamente ao iniciar."
            },
            profit_loss: {
                title: "Lucro/Prejuízo",
                desc: "Acompanhe seu resultado financeiro em tempo real."
            },
            reset_session: {
                title: "Resetar Sessão",
                desc: "Zere os contadores e reinicie a sessão."
            },
            stop_btn: {
                title: "Botão Parar (OFF)",
                desc: "Pare o monitoramento e as negociações."
            },
            messages: {
                title: "Mensagens de Resultados",
                desc: "Acompanhe aqui o resultado de cada trade executado (Vitória/Derrota) e mensagens do sistema."
            },
            detailed_history: {
                title: "Histórico Detalhado",
                desc: "Lista completa das negociações recentes."
            },
            trading_mode: {
                title: "Modo de Trading",
                desc: "Indica se está em SIMULAÇÃO, VIRTUAL ou REAL."
            },
            rules_status: {
                title: "Status das Regras",
                desc: "Visualização em tempo real do status de cada regra."
            },
            real_counters: {
                title: "Contadores Reais 💰",
                desc: "Placar de vitórias/derrotas em conta Real/Virtual."
            },
            simulated_counters: {
                title: "Contadores Simulados 🎮",
                desc: "Placar de vitórias/derrotas em Simulação."
            },
            digit_analysis: {
                title: "Análise de Dígitos",
                desc: "Estatísticas dos últimos dígitos em tempo real."
            },
            price_analysis: {
                title: "Análise de Preços",
                desc: "Estatísticas de variação de preços."
            }
        }
    },

    // ========================================
    // ALERTAS E MENSAGENS
    // ========================================
    alerts: {
        success: "Sucesso!",
        error: "Erro",
        warning: "Aviso",
        info: "Informação",
        confirm: "Confirmar",
        cancel: "Cancelar",

        yes: "Sim",
        no: "Não",
        ok: "OK",
        close: "Fechar",

        // Mensagens específicas
        operation_complete: "Operação concluída com sucesso",
        operation_failed: "Falha na operação",
        invalid_data: "Dados inválidos",
        connection_error: "Erro de conexão",

        // Robot Editor
        robot_saved: "Robô salvo com sucesso",
        robot_loaded: "Robô carregado com sucesso",
        robot_running: "Robô em execução",
        robot_stopped: "Robô parado",

        invalid_xml: "Arquivo XML inválido ou vazio",
        workspace_empty: "Adicione blocos ao workspace antes de executar",
        no_account: "Selecione uma conta antes de executar o robô",
        no_user_logged: "⚠️ Nenhum usuário logado, usando configuração padrão",
        integrity_error: "⚠️ Problemas de integridade detectados para TradeManager",
        config_error: "⚠️ Erro ao carregar configuração do usuário, tentando configuração de sessão:",
        other_user_config: "⚠️ Configuração de trade pertence a outro usuário, usando padrão",
        save_error: "⚠️ Não é possível salvar configuração sem usuário logado",
        save_success: "Configuração salva com sucesso",

        api_error: "API de trading não inicializada",
        select_symbol: "Nenhum símbolo selecionado",
        sim_execution_error: "Falha na execução do trade simulado - verifique logs",
        trade_execution_error: "Falha na execução do trade {mode}",
        config_load_error: "Erro ao carregar configuração de trade:",
        config_save_error: "Erro ao salvar configuração de trade:",

        // Proteção de domínio
        file_protected: "Arquivo Protegido",
        file_protected_msg: "Este arquivo foi criado em {domain} e só pode ser carregado nesse domínio.",
        current_domain: "Domínio atual: {domain}",
        legacy_file: "Arquivo Legado",
        legacy_file_msg: "Este arquivo não possui proteção de domínio.",

        // Créditos
        insufficient_credits: "Créditos insuficientes",
        credits_added: "{amount} créditos adicionados",
        credits_debited: "{amount} créditos debitados",

        sync_error: "Erro na sincronização",
        cooldown_error: "Erro ao verificar cooldown",
        stake_error: "Erro ao obter valor da stake",
        stop_monitor_error: "StopMonitor não disponível - usando fallback",
        execution_blocked: "Execução bloqueada",
        invalid_config: "Configuração inválida",
        unknown_mode: "Modo desconhecido",
        simulation_price_error: "Não foi possível obter preço para simulação",
        exit_tick_error: "Não foi possível obter tick de saída",
        connection_lost: "Conexão perdida com a Deriv"
    },

    // ========================================
    // BLOCKLY
    // ========================================
    blockly: {
        categories: {
            trade: "Negociação",
            logic: "Lógica",
            loops: "Loops",
            math: "Matemática",
            text: "Texto",
            lists: "Listas",
            variables: "Variáveis",
            functions: "Funções",
            tools: "Ferramentas",
            deriv_bot: "Deriv Bot"
        },

        blocks: {
            trade: "Negociar",
            trade_options: "Opções de Negociação",
            purchase: "Comprar",
            prediction: "Previsão",

            before_purchase: "Antes da Compra",
            during_purchase: "Durante a Compra",
            after_purchase: "Após a Compra",

            notify: "Notificar",
            timeout: "Aguardar",
            check_direction: "Verificar Direção",
            last_digit: "Último Dígito",
            total_profit: "Lucro Total"
        }
    },

    // ========================================
    // GEMINI AI
    // ========================================
    gemini: {
        system_context: "Você é um assistente especializado em trading. Responda SEMPRE em Português Brasileiro.",

        generating: "Gerando estratégia...",
        analyzing: "Analisando mercado...",
        processing: "Processando...",

        create_strategy: "Crie uma estratégia para {symbol}",
        error: "Erro ao gerar estratégia",
        success: "Estratégia gerada com sucesso"
    },

    ia: {
        title: "Sistema de IA Avançada",
        choice_subtitle: "Escolha qual funcionalidade deseja utilizar:",
        option_rules: "Gerar Regras de Estratégia",
        option_rules_desc: "Analise suas configurações e gere estratégias inteligentes",
        option_risk: "Filtro de Risco Algorítmico",
        option_risk_desc: "Sistema avançado de proteção contra manipulação algorítmica",
        option_chat: "Converse com a IA Trader",
        option_chat_desc: "Chat conversacional com análise de mercado em tempo real",
        cost: "Custo: {credits} Crédito",
        cancel: "Cancelar",
        processing: "Processando IA...",
        analyzing: "Analisando configurações...",
        collecting_data: "Coletando dados do usuário...",
        collecting_history: "Coletando histórico...",
        market_data: "Obtendo dados do mercado...",
        processing_ai: "Processando com IA...",
        configuring_gemini: "Configurando sistema Gemini...",
        error_instance: "Instância do Gemini não disponível",
        access_denied: "Acesso negado - usuário não é VIP/ADMIN",
        server_error: "Falha na comunicação com servidor",
        sync_discrepancy: "DISCREPÂNCIA: Local diz VIP, servidor diz NÃO VIP",
        plan_expired: "Plano VIP expirado",
        offline_mode: "Modo Offline",
        offline_desc: "Sistema de IA funcionando com dados locais devido a problemas de conexão.",
        diagnostic_title: "Diagnóstico VIP"
    },

    rule_assistant: {
        title: "Assistente de Regras",
        contract_title: "Qual contrato você deseja negociar?",
        contract_hint: "Escolha um dos contratos disponíveis abaixo:",
        custom_contract: "Ou digite o nome do contrato:",
        confirm: "Confirmar",
        rule_type_title: "Que tipo de regra você deseja criar?",
        rule_type_hint: "Escolha o padrão que melhor se adapta à sua estratégia:",
        digit_comparison: "Comparação de Dígitos",
        digit_comparison_desc: "Comparar últimos dígitos com um valor (>, <, =, etc)",
        digit_sequence: "Sequência de Dígitos",
        digit_sequence_desc: "Verificar padrão nos dígitos (pares, ímpares, iguais)",
        digit_specific: "Dígito Específico",
        digit_specific_desc: "Verificar valor exato de dígitos",
        digit_repeated: "Dígitos Repetidos",
        digit_repeated_desc: "Verificar repetição de dígitos",
        price_movement: "Movimento de Preço",
        price_movement_desc: "Baseado em variação de preço ou ticks",
        custom_rule: "Regra Personalizada",
        custom_rule_desc: "Descrever sua própria regra",
        configure_comparison: "Configure sua regra de comparação:",
        how_many_digits: "Quantos dígitos deseja verificar?",
        operator: "Operador de comparação:",
        reference_value: "Valor de referência:",
        back: "Voltar",
        next: "Gerar Regra →",
        use_rule: "Usar esta Regra",
        restart: "Criar Nova Regra",
        close: "Fechar",
        success_title: "Regra Gerada com Sucesso!",
        rule_created_desc: "Sua regra foi criada e está pronta para uso:",
        contract: "Contrato",
        trigger_rule: "Regra de Gatilho",
        next_steps: "Próximos passos:",
        copy_auto: "A regra foi copiada automaticamente para o campo de estratégia"
    },

    risk_filter: {
        title: "Filtro de Risco Algorítmico",
        tick_interval_question: "De quantos em quantos ticks deseja que o Gemini analise o mercado?",
        recommended: "Recomendado: 30-100 ticks",
        cost_warning: "Aviso de Custo:",
        cost_desc: "A cada análise (a cada {interval} ticks), será cobrado 1 Crédito para custear a chamada da API do Gemini.",
        activate: "Ativar Filtro",
        cancel: "Cancelar",
        activated: "Filtro de Risco Ativado",
        progress: "Progresso: {current}/{total} ticks",
        gemini_starting: "Iniciando análise com Gemini...",
        stable_market: "Mercado Estável",
        high_risk: "Alto Risco - Trade Bloqueado",
        blocked_reason: "Trade bloqueado por alerta de Entropia do Gemini",
        analyzing: "O Gemini está analisando os dados do mercado...",
        please_wait: "Aguarde, isso pode levar alguns segundos",
        credits_insufficient: "Créditos insuficientes ({current}/{required})",
        deactivating_no_credits: "Desativando filtro devido a créditos insuficientes",
        rules_updated: "Regras de risco atualizadas",
        analyzing_now: "Iniciando análise com Gemini",
        analysis_in_5: "Análise Gemini em 5 ticks...",
        safe_mode: "Modo de segurança ativado"
    },

    // ========================================
    // FORMULÁRIOS E INPUTS
    // ========================================
    forms: {
        placeholders: {
            email: "seu@email.com",
            password: "Senha",
            search: "Pesquisar...",
            amount: "Valor",
            symbol: "Símbolo"
        },

        labels: {
            email: "E-mail",
            password: "Senha",
            amount: "Valor",
            duration: "Duração",
            prediction: "Previsão"
        },

        validation: {
            required: "Campo obrigatório",
            invalid_email: "E-mail inválido",
            min_value: "Valor mínimo: {min}",
            max_value: "Valor máximo: {max}"
        }
    },

    // ========================================
    // DATAS E NÚMEROS
    // ========================================
    formatting: {
        currency: "R$ {amount}",
        percentage: "{value}%",

        date: {
            today: "Hoje",
            yesterday: "Ontem",
            tomorrow: "Amanhã"
        },

        time: {
            seconds: "{count} segundo | {count} segundos",
            minutes: "{count} minuto | {count} minutos",
            hours: "{count} hora | {count} horas",
            days: "{count} dia | {count} dias"
        }
    },

    // ========================================
    // ESTADOS
    // ========================================
    states: {
        loading: "Carregando...",
        saving: "Salvando...",
        processing: "Processando...",
        connecting: "Conectando...",
        disconnected: "Desconectado",
        connected: "Conectado",

        active: "Ativo",
        inactive: "Inativo",
        running: "Em execução",
        stopped: "Parado",
        paused: "Pausado"
    },
    ui: {
        loading_title: "Carregando...",
        loading_text: "Obtendo dados da sua conta Deriv...",
        waiting_rules: "Aguardando Regras...",
        calculating_stats: "Calculando Estatísticas...",
        highest_chance: "Maior Chance",
        lowest_chance: "Menor Chance",
        real_trades_title: "💰 Trades Reais",
        sim_trades_title: "🎮 Trades Simulados",
        wins: "Vitórias",
        losses: "Perdas",
        mode_simulation: "SIMULAÇÃO",
        mode_real: "REAL",
        mode_virtual: "VIRTUAL",
        rule_undefined: "Regra não definida",
        group_label: "Grupo {id}",
        updating: "Atualizando...",
        updated: "✅ Atualizado",
        error_title: "Erro"
    },
    maintenance: {
        title: "Em Manutenção",
        message: "Estamos realizando melhorias. Voltaremos em breve.",
        back: "Voltar"
    },
    pages: {
        terms: {
            title: "Termos de Uso",
            last_updated: "Última atualização: {date}"
        },
        privacy: {
            title: "Política de Privacidade",
            last_updated: "Última atualização: {date}"
        },
        about: {
            title: "Sobre",
            description: "Strategy Free é uma plataforma de trading automatizado com IA."
        }
    },
    contracts: {
        digitover: "Acima de",
        digitunder: "Abaixo de",
        digitmatch: "Igual a",
        digitdiff: "Diferente de",
        digiteven: "Par",
        digitodd: "Ímpar"
    }
};
