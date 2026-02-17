
// js/regras-json.js
// Sistema de gerenciamento de JSON cached das regras traduzidas pelo Gemini

class RegrasJsonManager {
    constructor() {
        this.cachedGeminiJson = null;
    }

    // 💾 Definir JSON cached do histórico de regras
    setCachedGeminiJson(geminiJson) {
        this.cachedGeminiJson = geminiJson;

    }

    // 🗑️ Limpar JSON cached
    clearCachedGeminiJson() {
        this.cachedGeminiJson = null;

    }

    // 📄 Obter JSON cached
    getCachedGeminiJson() {
        return this.cachedGeminiJson;
    }

    // 🔍 Verificar se há JSON cached disponível
    hasCachedJson() {
        return this.cachedGeminiJson !== null;
    }

    // 🚀 Verificar se uma estratégia já foi traduzida anteriormente
    checkCachedTranslation(strategyText) {
        try {
            // Gerar hash da estratégia para comparação
            const strategyHash = this.generateStrategyHash(strategyText);

            // 🌍 CACHE GLOBAL: Compartilhado entre todas as contas
            const cacheKey = `strategy_cache_global`;
            const cacheData = localStorage.getItem(cacheKey);

            if (!cacheData) {

                return null;
            }

            const cache = JSON.parse(cacheData);

            // Verificar se o hash da estratégia atual existe no cache
            if (cache[strategyHash]) {
                const cachedEntry = cache[strategyHash];

                // Verificar se o cache não está muito antigo (máximo 7 dias)
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
                const isExpired = (Date.now() - cachedEntry.timestamp) > maxAge;

                if (isExpired) {
                    delete cache[strategyHash];
                    localStorage.setItem(cacheKey, JSON.stringify(cache));
                    return null;
                }

                // 🆕 NOVO: Verificar se é um cache legado sem parâmetros (invalida para forçar nova tradução com parâmetros)
                if (!cachedEntry.translation.parameters) {
                    console.warn('⚠️ [CACHE] Cache legado sem parâmetros detectado - Forçando nova tradução');
                    delete cache[strategyHash];
                    localStorage.setItem(cacheKey, JSON.stringify(cache));
                    return null;
                }


                return cachedEntry.translation;
            }


            return null;

        } catch (error) {
            console.error('❌ [REGRAS JSON CACHE] Erro ao verificar cache:', error);
            return null;
        }
    }

    // 🚀 Salvar tradução no cache
    saveCachedTranslation(strategyText, translatedRules) {
        try {
            // Gerar hash da estratégia
            const strategyHash = this.generateStrategyHash(strategyText);

            // 🌍 CACHE GLOBAL: Compartilhado entre todas as contas
            const cacheKey = `strategy_cache_global`;
            let cache = {};

            try {
                const existingCache = localStorage.getItem(cacheKey);
                if (existingCache) {
                    cache = JSON.parse(existingCache);
                }
            } catch (parseError) {
                console.warn('⚠️ [REGRAS JSON CACHE] Cache corrompido, criando novo');
                cache = {};
            }

            // Adicionar nova entrada
            cache[strategyHash] = {
                originalText: strategyText,
                translation: translatedRules,
                timestamp: Date.now()
            };

            // Limitar tamanho do cache (máximo 20 entradas)
            const cacheEntries = Object.entries(cache);
            if (cacheEntries.length > 20) {
                // Remover entradas mais antigas
                cacheEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const newCache = {};
                cacheEntries.slice(0, 20).forEach(([hash, data]) => {
                    newCache[hash] = data;
                });
                cache = newCache;

            }

            // Salvar no localStorage
            localStorage.setItem(cacheKey, JSON.stringify(cache));


            return true;

        } catch (error) {
            console.error('❌ [REGRAS JSON CACHE] Erro ao salvar cache:', error);
            return false;
        }
    }

    // 🚀 Gerar hash único para uma estratégia
    generateStrategyHash(strategyText) {
        // Normalizar texto para comparação (remover espaços extras, quebras de linha, etc.)
        const normalizedText = strategyText
            .toLowerCase()
            .replace(/\s+/g, ' ') // Múltiplos espaços vira um só
            .replace(/\n+/g, '\n') // Múltiplas quebras vira uma só
            .trim();

        // Gerar hash simples mas eficaz
        let hash = 0;
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Math.abs(hash).toString(36);
    }

    // 🚀 Limpar cache de estratégias (para manutenção)
    clearStrategyCache() {
        try {
            // 🌍 CACHE GLOBAL: Compartilhado entre todas as contas
            const cacheKey = `strategy_cache_global`;
            localStorage.removeItem(cacheKey);


            return true;

        } catch (error) {
            console.error('❌ [REGRAS JSON CACHE] Erro ao limpar cache:', error);
            return false;
        }
    }

    // 🚀 Obter estatísticas do cache
    getCacheStats() {
        try {
            // 🌍 CACHE GLOBAL: Compartilhado entre todas as contas
            const cacheKey = `strategy_cache_global`;
            const cacheData = localStorage.getItem(cacheKey);

            if (!cacheData) {
                return { totalEntries: 0, oldestEntry: null, newestEntry: null };
            }

            const cache = JSON.parse(cacheData);
            const entries = Object.values(cache);

            if (entries.length === 0) {
                return { totalEntries: 0, oldestEntry: null, newestEntry: null };
            }

            const timestamps = entries.map(entry => entry.timestamp);
            const oldest = Math.min(...timestamps);
            const newest = Math.max(...timestamps);

            return {
                totalEntries: entries.length,
                oldestEntry: new Date(oldest),
                newestEntry: new Date(newest),
                totalSize: new Blob([cacheData]).size
            };

        } catch (error) {
            console.error('❌ [REGRAS JSON CACHE] Erro ao obter estatísticas:', error);
            return null;
        }
    }

    // 🔑 NOVO: Gerar código único para uma regra (baseado no conteúdo normalizado)
    generateRuleCode(ruleText) {
        try {
            // Normalizar texto para gerar código consistente
            const normalizedText = ruleText
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, '\n')
                .trim();

            // Gerar hash mais robusto que o usado no cache
            let hash = 5381;
            for (let i = 0; i < normalizedText.length; i++) {
                hash = ((hash << 5) + hash) + normalizedText.charCodeAt(i);
            }

            // Converter para string base36 e adicionar prefixo identificador
            const hashString = Math.abs(hash).toString(36).toUpperCase();
            return `RGJ_${hashString}_${Date.now().toString(36).toUpperCase()}`;

        } catch (error) {
            console.error('❌ [RULE CODE] Erro ao gerar código da regra:', error);
            return `RGJ_FALLBACK_${Date.now().toString(36).toUpperCase()}`;
        }
    }

    // 🔍 NOVO: Extrair código da regra do texto (buscar comentário especial)
    extractRuleCodeFromText(ruleText) {
        try {
            // Procurar por padrão: <!-- RGJ_CODE: RGJ_ABC123_XYZ789 -->
            const codePattern = /<!--\s*RGJ_CODE:\s*(RGJ_[A-Z0-9_]+)\s*-->/i;
            const match = ruleText.match(codePattern);

            if (match && match[1]) {

                return match[1];
            }

            return null;
        } catch (error) {
            console.error('❌ [RULE CODE] Erro ao extrair código da regra:', error);
            return null;
        }
    }

    // 💾 NOVO: Salvar mapeamento código->JSON no localStorage
    saveRuleCodeMapping(ruleCode, geminiJson, ruleText) {
        try {
            const sessionId = SessionManager.getUserSessionId();
            const mappingKey = `rule_code_mapping_${sessionId}`;

            // Obter mapeamentos existentes
            let mappings = {};
            try {
                const existing = localStorage.getItem(mappingKey);
                if (existing) {
                    mappings = JSON.parse(existing);
                }
            } catch (parseError) {
                console.warn('⚠️ [RULE CODE] Mapeamento corrompido, criando novo');
                mappings = {};
            }

            // Adicionar novo mapeamento
            mappings[ruleCode] = {
                geminiJson: geminiJson,
                originalRule: ruleText,
                timestamp: Date.now(),
                sessionId: sessionId
            };

            // Limitar número de mapeamentos (máximo 50)
            const entries = Object.entries(mappings);
            if (entries.length > 50) {
                // Manter apenas os 50 mais recentes
                entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const limitedMappings = {};
                entries.slice(0, 50).forEach(([code, data]) => {
                    limitedMappings[code] = data;
                });
                mappings = limitedMappings;
            }

            // Salvar mapeamentos
            localStorage.setItem(mappingKey, JSON.stringify(mappings));

        } catch (error) {
            console.error('❌ [RULE CODE] Erro ao salvar mapeamento:', error);
        }
    }

    // 🔍 NOVO: Buscar JSON pelo código da regra
    getJsonByRuleCode(ruleCode) {
        try {
            const sessionId = SessionManager.getUserSessionId();
            const mappingKey = `rule_code_mapping_${sessionId}`;

            const mappings = localStorage.getItem(mappingKey);
            if (!mappings) {
                return null;
            }

            const parsed = JSON.parse(mappings);
            const mapping = parsed[ruleCode];

            if (mapping) {
                // Verificar se não está muito antigo (máximo 30 dias)
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
                const isExpired = (Date.now() - mapping.timestamp) > maxAge;

                if (isExpired) {

                    // Remover mapeamento expirado
                    delete parsed[ruleCode];
                    localStorage.setItem(mappingKey, JSON.stringify(parsed));
                    return null;
                }


                return mapping.geminiJson;
            }

            return null;

        } catch (error) {
            console.error('❌ [RULE CODE] Erro ao buscar JSON pelo código:', error);
            return null;
        }
    }

    // 🏷️ NOVO: Adicionar código à regra como comentário HTML (invisível na interface)
    addCodeToRuleText(ruleText, ruleCode) {
        try {
            // Adicionar código como comentário HTML no final da regra
            const codeComment = `<!-- RGJ_CODE: ${ruleCode} -->`;

            // Verificar se já não tem código
            if (ruleText.includes('<!-- RGJ_CODE:')) {
                return ruleText; // Já tem código, não adicionar outro
            }

            return `${ruleText}\n${codeComment}`;

        } catch (error) {
            console.error('❌ [RULE CODE] Erro ao adicionar código à regra:', error);
            return ruleText;
        }
    }

    // 📦 NOVO: Preparar dados para download manual (sem executar automaticamente)
    prepareDownloadData(ruleText, geminiJson) {
        try {
            if (!ruleText || !geminiJson) {
                console.warn('⚠️ [PREPARE DOWNLOAD] Dados insuficientes para preparar download');
                return null;
            }

            // 🔑 GERAR código único para esta regra
            const ruleCode = this.generateRuleCode(ruleText);

            // 💾 SALVAR mapeamento código->JSON
            this.saveRuleCodeMapping(ruleCode, geminiJson, ruleText);

            // Criar estrutura do arquivo JSON com código único
            const jsonData = {
                rule: ruleText.trim(),
                geminiJson: geminiJson,
                ruleCode: ruleCode,
                timestamp: Date.now(),
                sessionId: SessionManager.getUserSessionId(),
                exported_at: new Date().toISOString(),
                version: "1.1"
            };

            // ✨ NOVO: Incluir prompt original para permitir portabilidade total
            if (geminiJson && geminiJson._gemini_prompt) {
                jsonData._gemini_prompt = geminiJson._gemini_prompt;
            }

            return jsonData;

        } catch (error) {
            console.error('❌ [PREPARE DOWNLOAD] Erro ao preparar dados de download:', error);
            return null;
        }
    }

    // 🧹 Sanitizar nome do arquivo
    sanitizeFileName(text) {
        // Pegar primeiras palavras da regra para nome do arquivo
        const words = text.replace(/[*\n]/g, ' ')
            .trim()
            .split(' ')
            .filter(word => word.length > 2)
            .slice(0, 4)
            .join('_');

        // Limpar caracteres especiais
        return words
            .replace(/[^a-zA-Z0-9_]/g, '')
            .substring(0, 50) || 'regra_' + Date.now();
    }

    // 📄 Fazer download do arquivo JSON
    // NOTA: O comportamento de download depende das configurações do navegador do usuário.
    // Se o navegador estiver configurado para "Sempre perguntar onde salvar", a janela "Salvar como" aparecerá.
    // Isso é comportamento padrão de segurança e não pode ser contornado por JavaScript.
    downloadJsonFile(jsonData, fileName) {
        try {

            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;

            // Configurações para tentar download automático
            link.style.display = 'none';
            link.setAttribute('type', 'application/json');

            // Adicionar ao DOM temporariamente
            document.body.appendChild(link);

            // Disparar o download
            link.click();

            // Limpar recursos após pequeno delay
            setTimeout(() => {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(url);

            }, 150);

            // Notificação visual de sucesso
            if (typeof CommonHelpers !== 'undefined' && CommonHelpers.showInfo) {
                CommonHelpers.showInfo('💾 Estratégia salva! Verifique a pasta Downloads.');
            }

        } catch (error) {
            console.error('❌ [DOWNLOAD] Erro no download:', error);
            if (typeof CommonHelpers !== 'undefined' && CommonHelpers.showError) {
                CommonHelpers.showError('❌ Erro ao salvar arquivo. Verifique as permissões de download.');
            }
        }
    }

    // 🔧 Métodos auxiliares para compatibilidade com código existente
    async getCachedTranslation(strategyText) {
        return this.checkCachedTranslation(strategyText);
    }
}

// Instância global
const regrasJsonManager = new RegrasJsonManager();

// Função factory para obter instância
function getRegrasJsonManagerInstance() {
    return regrasJsonManager;
}

// Exportar para uso global
window.regrasJsonManager = regrasJsonManager;
window.getRegrasJsonManagerInstance = getRegrasJsonManagerInstance;
