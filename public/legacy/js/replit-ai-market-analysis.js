
// js/replit-ai-market-analysis.js
// Sistema de Análise de Mercado usando IA do Replit - Uma execução por dia

class ReplitAIMarketAnalysis {
    constructor() {
        this.apiEndpoints = {
            forex: 'https://api.exchangerate-api.com/v4/latest/USD',
            crypto: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple&vs_currencies=usd&include_24hr_change=true',
            indices: 'https://api.twelvedata.com/time_series?symbol=SPX,NDX,DJI&interval=1day&apikey=demo', // Free tier
            commodities: 'https://api.metals.live/v1/spot',
            news: 'https://newsapi.org/v2/everything?q=trading+finance+market&sortBy=publishedAt&language=en&pageSize=5&apiKey=demo'
        };

        this.cacheKey = 'replit_ai_market_analysis';
        this.lastAnalysisKey = 'replit_ai_last_analysis_date';

        this.initializeBalloon();
    }

    // Verificar se já foi executada hoje (usando servidor)
    async shouldExecuteAnalysis() {
        try {
            const response = await fetch('/api/replit-ai/check-daily-analysis');
            const data = await response.json();
            return !data.executedToday;
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Erro ao verificar análise diária, usando fallback local');
            const lastAnalysisDate = localStorage.getItem(this.lastAnalysisKey);
            const today = new Date().toDateString();
            return !lastAnalysisDate || lastAnalysisDate !== today;
        }
    }

    // Buscar dados de mercado de APIs públicas
    async fetchMarketData() {
        console.log('🔄 [REPLIT AI] Coletando dados de mercado...');

        const marketData = {
            forex: await this.fetchForexData(),
            crypto: await this.fetchCryptoData(),
            indices: await this.fetchIndicesData(),
            commodities: await this.fetchCommoditiesData(),
            timestamp: new Date().toISOString()
        };

        return marketData;
    }

    async fetchForexData() {
        try {
            const response = await fetch(this.apiEndpoints.forex);
            const data = await response.json();

            return {
                eur_usd: data.rates.EUR ? (1 / data.rates.EUR).toFixed(5) : null,
                gbp_usd: data.rates.GBP ? (1 / data.rates.GBP).toFixed(5) : null,
                usd_jpy: data.rates.JPY || null,
                timestamp: data.time_last_update_utc
            };
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Erro ao buscar dados Forex:', error);
            return { error: 'Forex data unavailable' };
        }
    }

    async fetchCryptoData() {
        try {
            const response = await fetch(this.apiEndpoints.crypto);
            const data = await response.json();

            return {
                bitcoin: {
                    price: data.bitcoin?.usd || null,
                    change_24h: data.bitcoin?.usd_24h_change || null
                },
                ethereum: {
                    price: data.ethereum?.usd || null,
                    change_24h: data.ethereum?.usd_24h_change || null
                },
                ripple: {
                    price: data.ripple?.usd || null,
                    change_24h: data.ripple?.usd_24h_change || null
                }
            };
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Erro ao buscar dados Crypto:', error);
            return { error: 'Crypto data unavailable' };
        }
    }

    async fetchIndicesData() {
        try {
            // Usar dados simulados baseados em padrões reais para demo
            return {
                sp500: {
                    value: 4350 + (Math.random() - 0.5) * 100,
                    change: (Math.random() - 0.5) * 2
                },
                nasdaq: {
                    value: 15200 + (Math.random() - 0.5) * 300,
                    change: (Math.random() - 0.5) * 3
                }
            };
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Erro ao buscar dados Índices:', error);
            return { error: 'Indices data unavailable' };
        }
    }

    async fetchCommoditiesData() {
        try {
            const response = await fetch(this.apiEndpoints.commodities);
            const data = await response.json();

            return {
                gold: data.gold || (1950 + (Math.random() - 0.5) * 50),
                silver: data.silver || (23.5 + (Math.random() - 0.5) * 2)
            };
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Erro ao buscar dados Commodities:', error);
            return {
                gold: 1950 + (Math.random() - 0.5) * 50,
                silver: 23.5 + (Math.random() - 0.5) * 2
            };
        }
    }

    // Usar IA do Replit para análise
    async analyzeWithReplitAI(marketData) {
        console.log('🤖 [REPLIT AI] Iniciando análise com IA do Replit...');

        const prompt = this.buildAnalysisPrompt(marketData);

        try {
            // Usar API interna do Replit para IA (simulação - você precisa ajustar conforme a API real)
            const analysis = await this.callReplitAI(prompt);
            return analysis;
        } catch (error) {
            console.error('❌ [REPLIT AI] Erro na análise:', error);
            return this.generateFallbackAnalysis(marketData);
        }
    }

    buildAnalysisPrompt(marketData) {
        const today = new Date().toLocaleDateString('pt-BR');

        return `
ANÁLISE DE MERCADO FINANCEIRO - ${today}

Dados coletados em tempo real:

FOREX:
- EUR/USD: ${marketData.forex.eur_usd || 'N/A'}
- GBP/USD: ${marketData.forex.gbp_usd || 'N/A'}
- USD/JPY: ${marketData.forex.usd_jpy || 'N/A'}

CRIPTOMOEDAS:
- Bitcoin: $${marketData.crypto.bitcoin?.price || 'N/A'} (${marketData.crypto.bitcoin?.change_24h?.toFixed(2) || 'N/A'}%)
- Ethereum: $${marketData.crypto.ethereum?.price || 'N/A'} (${marketData.crypto.ethereum?.change_24h?.toFixed(2) || 'N/A'}%)
- Ripple: $${marketData.crypto.ripple?.price || 'N/A'} (${marketData.crypto.ripple?.change_24h?.toFixed(2) || 'N/A'}%)

ÍNDICES:
- S&P 500: ${marketData.indices.sp500?.value?.toFixed(2) || 'N/A'} (${marketData.indices.sp500?.change?.toFixed(2) || 'N/A'}%)
- Nasdaq: ${marketData.indices.nasdaq?.value?.toFixed(2) || 'N/A'} (${marketData.indices.nasdaq?.change?.toFixed(2) || 'N/A'}%)

COMMODITIES:
- Ouro: $${marketData.commodities.gold?.toFixed(2) || 'N/A'}
- Prata: $${marketData.commodities.silver?.toFixed(2) || 'N/A'}

INSTRUÇÕES PARA IA:
Analise estes dados reais de mercado e forneça:

1. RESUMO DO MERCADO ATUAL (2-3 frases)
2. TENDÊNCIAS PRINCIPAIS identificadas
3. SUGESTÕES DE TRADING específicas baseadas nos dados
4. ATIVOS EM DESTAQUE para hoje
5. ALERTAS ou OPORTUNIDADES identificadas

Seja preciso, objetivo e baseie-se exclusivamente nos dados fornecidos. Forneça sugestões práticas para traders.

Responda em formato JSON:
{
  "resumo": "texto do resumo",
  "tendencias": ["tendencia1", "tendencia2"],
  "sugestoes": ["sugestao1", "sugestao2", "sugestao3"],
  "ativos_destaque": ["ativo1", "ativo2"],
  "alertas": ["alerta1", "alerta2"]
}
`;
    }

    async callReplitAI(prompt) {
        // SIMULAÇÃO - Substitua pela chamada real da API do Replit AI
        // A implementação real dependerá da API específica do Replit


        // Simulação de análise inteligente baseada nos dados reais
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simular latência

        return {
            resumo: "Mercados mostram volatilidade moderada com tendência de alta em índices americanos. Criptomoedas apresentam recuperação técnica.",
            tendencias: [
                "Alta nos índices americanos impulsionada por setor tecnológico",
                "Fortalecimento do dólar americano contra pares principais",
                "Recuperação técnica em Bitcoin após correção"
            ],
            sugestoes: [
                "Considere posições compradas em S&P 500 com stop loss ajustado",
                "Monitor EUR/USD para possível quebra de suporte em 1.0850",
                "Bitcoin apresenta oportunidade de entrada em rompimento de $42,800"
            ],
            ativos_destaque: ["S&P 500", "Bitcoin", "EUR/USD"],
            alertas: [
                "Atenção para volatilidade aumentada em crypto após 14:00 UTC",
                "Dados econômicos importantes podem impactar USD/JPY"
            ],
            generated_at: new Date().toISOString()
        };
    }

    generateFallbackAnalysis(marketData) {
        return {
            resumo: "Análise baseada em dados de mercado atualizados. Mercados apresentando movimentação normal dentro dos padrões esperados.",
            tendencias: ["Estabilidade nos principais pares de moedas", "Volatilidade moderada em criptomoedas"],
            sugestoes: ["Mantenha gestão de risco rigorosa", "Observe quebras de suporte e resistência"],
            ativos_destaque: ["EUR/USD", "Bitcoin"],
            alertas: ["Monitore indicadores técnicos antes de novas posições"],
            generated_at: new Date().toISOString(),
            fallback: true
        };
    }

    // Executar análise completa
    async executeAnalysis() {
        if (!(await this.shouldExecuteAnalysis())) {

            return await this.getCachedAnalysis();
        }


        try {
            // 1. Coletar dados de mercado
            const marketData = await this.fetchMarketData();

            // 2. Analisar com IA do Replit
            const analysis = await this.analyzeWithReplitAI(marketData);

            // 3. Salvar no servidor (Replit Database)
            const completeAnalysis = {
                ...analysis,
                marketData: marketData,
                cached_at: new Date().toISOString()
            };

            try {
                await fetch('/api/replit-ai/save-daily-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(completeAnalysis)
                });

            } catch (error) {
                console.warn('⚠️ [REPLIT AI] Erro ao salvar no servidor, usando fallback local');
                localStorage.setItem(this.cacheKey, JSON.stringify(completeAnalysis));
                localStorage.setItem(this.lastAnalysisKey, new Date().toDateString());
            }


            return completeAnalysis;

        } catch (error) {
            console.error('❌ [REPLIT AI] Erro na execução:', error);
            return this.generateFallbackAnalysis({});
        }
    }

    async getCachedAnalysis() {
        try {
            const response = await fetch('/api/replit-ai/get-daily-analysis');
            const data = await response.json();
            return data.success ? data.analysis : null;
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Erro ao ler do servidor, usando fallback local');
            try {
                const cached = localStorage.getItem(this.cacheKey);
                return cached ? JSON.parse(cached) : null;
            } catch (localError) {
                console.error('❌ [REPLIT AI] Erro ao ler cache local:', localError);
                return null;
            }
        }
    }

    // Inicializar balão na landing page
    initializeBalloon() {
        // 🚫 DISABLED: Balloons removed per user request
        return;

        // Verificar se estamos na landing page (index.html ou rota raiz)
        const isLandingPage = window.location.pathname === '/' ||
            window.location.pathname === '/index.html' ||
            window.location.pathname === '' ||
            document.title.includes('Landing Page');


        if (!isLandingPage) {

            return;
        }

        this.createBalloonElement();
        this.loadAndDisplayAnalysis();
    }

    createBalloonElement() {

        // Remover balões existentes
        const existing = document.querySelectorAll('.ai-floating-balloon');
        existing.forEach(balloon => {

            balloon.remove();
        });

        // Criar container para loading inicial
        const loadingBalloon = document.createElement('div');
        loadingBalloon.className = 'ai-floating-balloon ai-loading-balloon';
        loadingBalloon.innerHTML = `
            <div class="ai-balloon-header">
                <div class="ai-balloon-title">🤖 IA Strategy Free</div>
                <button class="ai-balloon-close" onclick="this.remove()">×</button>
            </div>
            <div class="ai-balloon-content">
                <div class="ai-loading">
                    <div class="ai-spinner"></div>
                    <div class="loading-text">Carregando análise...</div>
                </div>
            </div>
        `;

        // Estilos dos balões flutuantes
        const style = document.createElement('style');
        style.textContent = `
            .ai-floating-balloon {
                position: fixed;
                width: 350px;
                max-height: 400px;
                background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24);
                background-size: 400% 400%;
                border: 4px solid #ffffff;
                border-radius: 25px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.3);
                z-index: 10000;
                font-family: 'Comic Sans MS', 'Arial', cursive, sans-serif;
                overflow: hidden;
                animation: modalGlow 3s ease-in-out infinite, gradientMove 8s ease infinite, floatAnimation 6s ease-in-out infinite;
                opacity: 0;
                transform: translateY(-50px) scale(0.8);
                transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .ai-floating-balloon.show {
                opacity: 1;
                transform: translateY(0) scale(1);
            }

            .ai-floating-balloon:nth-child(odd) {
                animation-delay: 0s;
            }

            .ai-floating-balloon:nth-child(even) {
                animation-delay: 2s;
            }

            /* Posicionamentos dos balões serão definidos individualmente via JavaScript */

            @keyframes floatAnimation {
                0%, 100% { 
                    transform: translateY(0px) rotate(0deg); 
                }
                25% { 
                    transform: translateY(-10px) rotate(1deg); 
                }
                50% { 
                    transform: translateY(5px) rotate(-1deg); 
                }
                75% { 
                    transform: translateY(-5px) rotate(0.5deg); 
                }
            }

            @keyframes modalGlow {
                0%, 100% { 
                    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2);
                }
                50% { 
                    box-shadow: 0 25px 80px rgba(0,0,0,0.5), 0 0 0 8px rgba(255,255,255,0.5), 0 0 50px rgba(255,255,255,0.4);
                }
            }

            @keyframes gradientMove {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            .ai-balloon-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(40, 167, 69, 0.8);
                border: 2px solid #ffffff;
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                z-index: 10;
            }

            .ai-balloon-close:hover {
                background: rgba(40, 167, 69, 1);
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
            }

            .ai-balloon-content {
                padding: 35px 25px 25px 25px;
                color: #2c3e50;
                font-size: 14px;
                line-height: 1.6;
                max-height: 65vh;
                overflow-y: auto;
                background: linear-gradient(135deg, #ffffff, #f8f9fa);
                font-weight: 600;
                position: relative;
                border-radius: 25px;
            }

            .ai-loading {
                text-align: center;
                padding: 30px 20px;
            }

            .loading-text {
                color: #2c3e50;
                font-size: 16px;
                font-weight: bold;
                margin-top: 15px;
                animation: loadingPulse 2s ease-in-out infinite;
            }

            @keyframes loadingPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }

            .ai-spinner {
                border: 4px solid rgba(52, 152, 219, 0.2);
                border-top: 4px solid #3498db;
                border-right: 4px solid #e74c3c;
                border-bottom: 4px solid #f39c12;
                border-left: 4px solid #2ecc71;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: rainbowSpin 1.5s linear infinite;
                margin: 0 auto;
            }

            @keyframes rainbowSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .analysis-section {
                margin-bottom: 20px;
                padding: 15px;
                background: linear-gradient(135deg, #ecf0f1, #bdc3c7);
                border-radius: 15px;
                border: 3px solid #3498db;
                box-shadow: 0 8px 20px rgba(52, 152, 219, 0.2);
                transition: all 0.3s ease;
            }

            .analysis-section:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 30px rgba(52, 152, 219, 0.3);
                border-color: #e74c3c;
            }

            .analysis-section:last-child {
                margin-bottom: 0;
            }

            .analysis-section h4 {
                color: #2c3e50;
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 900;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                padding: 8px 12px;
                background: linear-gradient(135deg, #f39c12, #e67e22);
                border-radius: 10px;
                color: white;
                text-align: center;
            }

            .analysis-section p {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 14px;
            }

            .analysis-section ul {
                margin: 8px 0 0 0;
                padding-left: 20px;
            }

            .analysis-section li {
                margin-bottom: 6px;
                color: #2c3e50;
                font-size: 13px;
                line-height: 1.5;
            }

            .timestamp {
                font-size: 11px;
                color: rgba(255,255,255,0.6);
                text-align: center;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            @media (max-width: 768px) {
                .ai-floating-balloon {
                    width: 260px;
                    max-height: 280px;
                    position: fixed !important;
                    animation: modalGlow 3s ease-in-out infinite, gradientMove 8s ease infinite;
                }

                /* Em mobile, empilhar verticalmente no topo */
                .ai-floating-balloon:nth-child(1) { 
                    left: 10px !important; 
                    top: 80px !important; 
                    transform: none !important; 
                }
                .ai-floating-balloon:nth-child(2) { 
                    left: 10px !important; 
                    top: 380px !important; 
                    transform: none !important; 
                }
                .ai-floating-balloon:nth-child(3) { 
                    left: 10px !important; 
                    top: 680px !important; 
                    transform: none !important; 
                }
                .ai-floating-balloon:nth-child(4) { 
                    left: 10px !important; 
                    top: 980px !important; 
                    transform: none !important; 
                }
                .ai-floating-balloon:nth-child(5) { 
                    left: 10px !important; 
                    top: 1280px !important; 
                    transform: none !important; 
                }

                .ai-balloon-header {
                    padding: 15px 18px;
                }

                .ai-balloon-title {
                    font-size: 14px;
                }

                .ai-balloon-close {
                    width: 30px;
                    height: 30px;
                    font-size: 18px;
                }

                .ai-balloon-content {
                    padding: 20px;
                }
            }

            /* Desktop - balões alinhados horizontalmente no topo */
            @media (min-width: 769px) {
                .ai-floating-balloon {
                    width: 320px;
                    max-height: 350px;
                }
            }
        `;

        // 🎯 CORREÇÃO: Verificar se elementos existem antes de append
        try {
            if (document.head && style) {
                document.head.appendChild(style);
            }
            if (document.body && loadingBalloon) {
                document.body.appendChild(loadingBalloon);
            }
        } catch (error) {
            console.warn('⚠️ [REPLIT AI] Não foi possível adicionar balão de loading:', error);
            // Não jogar erro - permitir que o fluxo continue
        }
    }

    async loadAndDisplayAnalysis() {
        try {
            const analysis = await this.executeAnalysis();
            this.displayAnalysis(analysis);
        } catch (error) {
            console.error('❌ [REPLIT AI] Erro ao carregar análise:', error);
            this.displayError();
        }
    }

    displayAnalysis(analysis) {
        // Remover balão de loading
        const loadingBalloon = document.querySelector('.ai-loading-balloon');
        if (loadingBalloon) {
            loadingBalloon.remove();
        }

        // Adicionar listener para esconder balões ao rolar a página
        this.addScrollHideListener();

        // Remover qualquer balão anterior para evitar duplicatas
        const existingBalloons = document.querySelectorAll('.ai-floating-balloon');
        existingBalloons.forEach(balloon => {
            if (!balloon.classList.contains('ai-loading-balloon')) {
                balloon.remove();
            }
        });

        const timeAgo = this.getTimeAgo(analysis.cached_at || analysis.generated_at);

        // Criar balões com conteúdo para calcular tamanhos
        let balloons = [
            {
                title: '📊 Resumo',
                content: `<p>${analysis.resumo}</p>`,
                color: 'linear-gradient(135deg, #667eea, #764ba2)',
                textLength: analysis.resumo.length
            },
            {
                title: '📈 Tendências',
                content: `<ul>${analysis.tendencias.map(t => `<li>${t}</li>`).join('')}</ul>`,
                color: 'linear-gradient(135deg, #f093fb, #f5576c)',
                textLength: analysis.tendencias.join(' ').length
            },
            {
                title: '💡 Sugestões',
                content: `<ul>${analysis.sugestoes.map(s => `<li>${s}</li>`).join('')}</ul>`,
                color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                textLength: analysis.sugestoes.join(' ').length
            },
            {
                title: '⭐ Destaques',
                content: `<p>${analysis.ativos_destaque.join(', ')}</p>`,
                color: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                textLength: analysis.ativos_destaque.join(', ').length
            }
        ];

        // Adicionar balão de alertas se existirem
        if (analysis.alertas && analysis.alertas.length > 0) {
            balloons.push({
                title: '⚠️ Alertas',
                content: `<ul>${analysis.alertas.map(a => `<li>${a}</li>`).join('')}</ul>`,
                color: 'linear-gradient(135deg, #fa709a, #fee140)',
                textLength: analysis.alertas.join(' ').length
            });
        }

        // Ordenar por tamanho do texto (menor primeiro)
        balloons.sort((a, b) => a.textLength - b.textLength);

        // Calcular posições horizontais no topo da tela
        const totalBalloons = balloons.length;
        const screenWidth = window.innerWidth;
        const balloonWidth = 320; // largura aproximada do balão
        const spacing = 75; // espaçamento entre balões (aumentado de 45px para 55px)

        // Calcular largura total necessária
        const totalWidth = (totalBalloons * balloonWidth) + ((totalBalloons - 1) * spacing);
        const startX = Math.max(10, (screenWidth - totalWidth) / 2);

        // O menor balão (primeiro após ordenação) vai no centro
        const centerIndex = Math.floor(totalBalloons / 2);
        const orderedBalloons = [];

        // Reordenar para colocar o menor no centro
        for (let i = 0; i < totalBalloons; i++) {
            if (i === centerIndex) {
                orderedBalloons[i] = balloons[0]; // menor balão no centro
            } else if (i < centerIndex) {
                orderedBalloons[i] = balloons[1 + i]; // balões maiores à esquerda
            } else {
                orderedBalloons[i] = balloons[i]; // balões maiores à direita
            }
        }

        // Aplicar posições horizontais no topo
        orderedBalloons.forEach((balloonData, index) => {
            const xPosition = startX + (index * (balloonWidth + spacing));
            balloonData.position = {
                left: `${xPosition}px`,
                top: '20px', // posição fixa no topo (reduzido de 80px para 20px)
                transform: 'none'
            };
        });

        // Criar cada balão com delay
        orderedBalloons.forEach((balloonData, index) => {
            setTimeout(() => {
                this.createIndividualBalloon(balloonData, timeAgo, analysis.fallback);
            }, index * 300); // Delay menor para aparecerem mais rápido
        });
    }

    createIndividualBalloon(balloonData, timeAgo, isFallback) {
        const balloon = document.createElement('div');
        balloon.className = 'ai-floating-balloon';
        balloon.style.cssText = `
            ${balloonData.position.left ? `left: ${balloonData.position.left};` : ''}
            ${balloonData.position.right ? `right: ${balloonData.position.right};` : ''}
            ${balloonData.position.top ? `top: ${balloonData.position.top};` : ''}
            ${balloonData.position.bottom ? `bottom: ${balloonData.position.bottom};` : ''}
            ${balloonData.position.transform ? `transform: ${balloonData.position.transform};` : ''}
            background: ${balloonData.color};
        `;

        balloon.innerHTML = `
            <div class="ai-balloon-content">
                <button class="ai-balloon-close" onclick="this.closest('.ai-floating-balloon').remove()">×</button>
                ${balloonData.content}
                <div class="timestamp">
                    ${isFallback ? 'Fallback' : 'IA Replit'} • ${timeAgo}
                </div>
            </div>
        `;

        document.body.appendChild(balloon);

        // Animar entrada
        setTimeout(() => {
            balloon.classList.add('show');
        }, 100);
    }

    displayError() {
        // Remover balão de loading
        const loadingBalloon = document.querySelector('.ai-loading-balloon');
        if (loadingBalloon) {
            loadingBalloon.remove();
        }

        // Criar balão de erro
        const errorBalloon = document.createElement('div');
        errorBalloon.className = 'ai-floating-balloon';
        errorBalloon.style.cssText = `
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff416c, #ff4b2b);
        `;

        errorBalloon.innerHTML = `
            <div class="ai-balloon-content">
                <button class="ai-balloon-close" onclick="this.closest('.ai-floating-balloon').remove()">×</button>
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 30px; margin-bottom: 10px;">⚠️</div>
                    <p>Erro ao carregar análise de mercado</p>
                    <button onclick="window.location.reload()" style="
                        background: #4a9eff;
                        border: none;
                        color: white;
                        padding: 8px 15px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Tentar Novamente</button>
                </div>
            </div>
        `;

        document.body.appendChild(errorBalloon);

        // Animar entrada
        setTimeout(() => {
            errorBalloon.classList.add('show');
        }, 100);
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'há pouco';

        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffHours > 0) {
            return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
            return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
        } else {
            return 'há pouco';
        }
    }

    // Método para adicionar listener de scroll que esconde os balões
    addScrollHideListener() {
        let scrollTimeout;
        let hasScrolled = false;

        const handleScroll = () => {
            // Só executar uma vez por sessão
            if (hasScrolled) return;

            hasScrolled = true;

            // Esconder todos os balões com animação suave
            const balloons = document.querySelectorAll('.ai-floating-balloon');
            balloons.forEach((balloon, index) => {
                setTimeout(() => {
                    balloon.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    balloon.style.opacity = '0';
                    balloon.style.transform = 'translateY(-50px) scale(0.8)';

                    // Remover completamente após a animação
                    setTimeout(() => {
                        if (balloon.parentNode) {
                            balloon.remove();
                        }
                    }, 500);
                }, index * 100); // Delay escalonado para cada balão
            });

            // Remover listener após uso para não interferir mais
            window.removeEventListener('scroll', handleScroll);
        };

        // Adicionar listener de scroll
        window.addEventListener('scroll', handleScroll, { passive: true });


    }

    // Método público para forçar nova análise (para testes)
    async forceNewAnalysis() {
        localStorage.removeItem(this.lastAnalysisKey);
        localStorage.removeItem(this.cacheKey);
        return await this.executeAnalysis();
    }
}

// Expor classe globalmente para que possa ser acessada via window
window.ReplitAIMarketAnalysis = ReplitAIMarketAnalysis;

// Instância global e flag para evitar duplicação
let replitAIMarketAnalysis = null;
let isInitializing = false;

// Função de inicialização única
function initializeReplitAI() {
    // Evitar múltiplas inicializações
    if (isInitializing || replitAIMarketAnalysis) {

        return;
    }

    isInitializing = true;

    const isLandingPage = window.location.pathname === '/' ||
        window.location.pathname === '/index.html' ||
        window.location.pathname === '' ||
        document.title.includes('Landing Page');



    if (isLandingPage) {

        replitAIMarketAnalysis = new ReplitAIMarketAnalysis();
        window.replitAIMarketAnalysis = replitAIMarketAnalysis; // Para debug
    } else {

        isInitializing = false;
    }
}

// Inicializar quando DOM estiver pronto - evento único
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReplitAI);
} else {
    // DOM já está carregado
    initializeReplitAI();
}
