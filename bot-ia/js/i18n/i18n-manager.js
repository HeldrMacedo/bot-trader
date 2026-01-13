/**
 * I18n Manager - Sistema de Internacionalização
 * Gerencia traduções e mudança de idioma em tempo real
 * VERSÃO GLOBAL (sem ES6 modules) para compatibilidade com file://
 */

(function () {
    'use strict';

    class I18nManager {
        constructor() {
            this.currentLanguage = localStorage.getItem('language') || 'pt-BR';
            this.translations = {};
            this.fallbackLanguage = 'pt-BR';
            this.supportedLanguages = ['pt-BR', 'en-US', 'es-ES', 'ja-JP'];
            this.observers = [];

            // Carregar traduções embutidas
            this.loadEmbeddedTranslations();
        }

        /**
         * Carrega traduções embutidas (sem fetch/import)
         */
        loadEmbeddedTranslations() {
            // Traduções serão definidas globalmente por pt-BR.js
            if (window.i18nTranslations && window.i18nTranslations[this.currentLanguage]) {
                this.translations = window.i18nTranslations[this.currentLanguage];
                this.updateDOM();
                this.notifyObservers(this.currentLanguage);
                document.documentElement.lang = this.currentLanguage;

            } else {
                console.warn(`⚠️ [i18n] Traduções não encontradas para ${this.currentLanguage}`);
            }
        }

        /**
         * Troca de idioma
         * @param {string} lang - Código do idioma
         */
        switchLanguage(lang) {

            if (!this.supportedLanguages.includes(lang)) {
                console.warn(`[i18n] Idioma ${lang} não suportado`);
                return;
            }

            if (window.i18nTranslations && window.i18nTranslations[lang]) {
                const prevLang = this.currentLanguage;
                this.translations = window.i18nTranslations[lang];
                this.currentLanguage = lang;
                localStorage.setItem('language', lang);

                try {
                    this.updateDOM();
                    this.notifyObservers(lang);
                    document.documentElement.lang = lang;

                } catch (domError) {
                    console.error('❌ [i18n] Erro ao atualizar DOM:', domError);
                }
            } else {
                console.error(`❌ [i18n] Traduções não disponíveis para ${lang}. Verifique se o script correspondente foi carregado e se window.i18nTranslations['${lang}'] existe.`);

                // Fallback se estiver tentando voltar para PT e falhar
                if (lang === 'pt-BR' && window.i18nTranslations && Object.keys(window.i18nTranslations).length > 0) {
                    const firstAvailable = Object.keys(window.i18nTranslations)[0];
                    console.warn(`[i18n] Tentando fallback para primeiro idioma disponível: ${firstAvailable}`);
                    this.switchLanguage(firstAvailable);
                }
            }
        }

        /**
         * Traduz uma chave
         * @param {string} key - Chave de tradução (ex: 'landing.title')
         * @param {object} params - Parâmetros para interpolação
         * @returns {string} Texto traduzido
         */
        t(key, params = {}) {
            const keys = key.split('.');
            let value = this.translations;

            for (const k of keys) {
                value = value?.[k];
                if (value === undefined) {
                    // console.warn(`[i18n] Chave não encontrada: ${key}`);
                    return key;
                }
            }

            if (typeof value === 'string' && Object.keys(params).length > 0) {
                return this.interpolate(value, params);
            }

            return value;
        }

        /**
         * Interpola parâmetros em uma string
         */
        interpolate(str, params) {
            return str.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }

        /**
         * Atualiza todos os elementos do DOM com data-i18n
         */
        updateDOM() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const attrValue = el.getAttribute('data-i18n');
                if (!attrValue) return;

                // Suporte para múltiplos atributos: [title]key1;[placeholder]key2;key3 (textContent)
                const parts = attrValue.split(';');

                parts.forEach(part => {
                    part = part.trim();
                    if (!part) return;

                    const attrMatch = part.match(/^\[([\w-]+)\](.*)/);

                    if (attrMatch) {
                        const attrName = attrMatch[1];
                        const key = attrMatch[2];
                        el.setAttribute(attrName, this.t(key));
                    } else {
                        // Se não tem prefixo [attr], é o conteúdo principal
                        const translation = this.t(part);
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.value = translation;
                        } else {
                            el.textContent = translation;
                        }
                    }
                });
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                el.placeholder = this.t(key);
            });

            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                el.title = this.t(key);
            });

            document.querySelectorAll('[data-i18n-alt]').forEach(el => {
                const key = el.getAttribute('data-i18n-alt');
                el.alt = this.t(key);
            });
        }

        getLanguageName() {
            const names = {
                'pt-BR': 'Português',
                'en-US': 'English',
                'es-ES': 'Español',
                'ja-JP': '日本語'
            };
            return names[this.currentLanguage] || this.currentLanguage;
        }

        getCurrentLanguage() {
            return this.currentLanguage;
        }

        isSupported(lang) {
            return this.supportedLanguages.includes(lang);
        }

        addObserver(callback) {
            this.observers.push(callback);
        }

        removeObserver(callback) {
            this.observers = this.observers.filter(obs => obs !== callback);
        }

        notifyObservers(lang) {
            this.observers.forEach(callback => {
                try {
                    callback(lang);
                } catch (error) {
                    console.error('[i18n] Erro ao notificar observer:', error);
                }
            });
        }

        formatNumber(number, options = {}) {
            return new Intl.NumberFormat(this.currentLanguage, options).format(number);
        }

        formatDate(date, options = {}) {
            return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
        }

        formatCurrency(amount, currency = 'USD') {
            return new Intl.NumberFormat(this.currentLanguage, {
                style: 'currency',
                currency: currency
            }).format(amount);
        }
    }

    // Criar instância global
    window.i18n = new I18nManager();


})();
