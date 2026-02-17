// Custom Block Definitions for DerivBot

// Custom Blockly blocks for the robot trading system
function initCustomBlocks() {
    'use strict';

    // 🔄 BLOCK DEFINITIONS VERSION - Increment this to force cache clear
    const BLOCK_DEFINITIONS_VERSION = '1.0.19';

    // Store version in localStorage to track changes
    const storedVersion = localStorage.getItem('blockly_definitions_version');
    if (storedVersion !== BLOCK_DEFINITIONS_VERSION) {
     
        localStorage.setItem('blockly_definitions_version', BLOCK_DEFINITIONS_VERSION);

        // Force clear all custom blocks
        if (typeof Blockly !== 'undefined' && Blockly.Blocks) {
            Object.keys(Blockly.Blocks).forEach(key => {
                if (!key.startsWith('controls_') && !key.startsWith('logic_') &&
                    !key.startsWith('math_') && !key.startsWith('text_') &&
                    !key.startsWith('lists_') && !key.startsWith('colour_') &&
                    !key.startsWith('variables_') && !key.startsWith('procedures_')) {
                    delete Blockly.Blocks[key];
                }
            });
        }
    }
    if (!Blockly) {
        console.error("Blockly not loaded");
        return;
    }

    // 1. Trade Definition Block (The Root)
    // Data for Dynamic Dropdowns
    const MARKET_HIERARCHY = {
        "synthetic_index": {
            "name": "Derived",
            "submarkets": {
                "continuous_index": {
                    "name": "Continuous Indices",
                    "symbols": [
                        ["Volatility 100 (1s) Index", "1HZ100V"],
                        ["Volatility 10 Index", "R_10"],
                        ["Volatility 25 Index", "R_25"],
                        ["Volatility 50 Index", "R_50"],
                        ["Volatility 75 Index", "R_75"],
                        ["Volatility 100 Index", "R_100"]
                    ]
                },
                "daily_reset_indices": {
                    "name": "Daily Reset Indices",
                    "symbols": [
                        ["Bear Market Index", "RDBEAR"],
                        ["Bull Market Index", "RDBULL"]
                    ]
                },
                "random_index": {
                    "name": "Random Index",
                    "symbols": [
                        ["Random 100 Index", "R_100"],
                        ["Random 200 Index", "R_200"]
                    ]
                }
            }
        },
        "forex": {
            "name": "Forex",
            "submarkets": {
                "forex_basket": {
                    "name": "Forex Basket",
                    "symbols": [
                        ["AUD Basket", "WLDAUD"]
                    ]
                },
                "major_pairs": {
                    "name": "Major Pairs",
                    "symbols": [
                        ["AUD/USD", "frxAUDUSD"],
                        ["EUR/USD", "frxEURUSD"],
                        ["GBP/USD", "frxGBPUSD"]
                    ]
                }
            }
        },
        "indices": {
            "name": "Indices",
            "submarkets": {
                "random_index": {
                    "name": "Random Logic",
                    "symbols": [
                        ["Random 100", "R_100_placeholder"]
                    ]
                }
            }
        }
    };

    // 1. Trade Definition Block (The Root)
    Blockly.Blocks['trade'] = {
        init: function () {
            var self = this;

            this.appendDummyInput()
                .appendField("(1) Defina seu contrato de trade");

            // Helpers for dynamic options
            this.getMarketOptions = function () {
                var options = [];
                for (var key in MARKET_HIERARCHY) {
                    options.push([MARKET_HIERARCHY[key].name, key]);
                }
                return options;
            };

            this.getSubmarketOptions = function (marketKey) {
                var market = MARKET_HIERARCHY[marketKey] || MARKET_HIERARCHY["synthetic_index"];
                var options = [];
                for (var key in market.submarkets) {
                    options.push([market.submarkets[key].name, key]);
                }
                return options;
            };

            this.getSymbolOptions = function (marketKey, submarketKey) {
                var market = MARKET_HIERARCHY[marketKey] || MARKET_HIERARCHY["synthetic_index"];
                var submarket = market.submarkets[submarketKey];
                // Fallback if submarket doesn't exist in map (e.g. initial load mismatch)
                if (!submarket) {
                    // Try to find first available
                    var firstSubKey = Object.keys(market.submarkets)[0];
                    submarket = market.submarkets[firstSubKey];
                }

                var options = submarket ? submarket.symbols : [];

                // 🛡️ SAFETY FALLBACK: If loading XML with a value that isn't in the list yet,
                // we technically can't "add" it easily without valid name.
                // But we must ensure the list is not effectively empty or just "Loading..." if possible,
                // OR ensure "R_10" (common default) is present if nothing else is.
                if (options.length === 0) {
                    return [["Volatility 10 Index", "R_10"], ["Loading...", ""]];
                }

                return options;
            };

            // Validators
            var marketValidator = function (newValue) {
                var submarketField = self.getField("SUBMARKET_LIST");
                var symbolField = self.getField("SYMBOL_LIST");

                var newSubopts = self.getSubmarketOptions(newValue);
                // Update Helper does not exist in standard blockly 3/4 easily without replacing field
                // Standard way: user selects -> validator runs -> we change CHILD fields.

                // Hack: We need to update the options of the child dropdowns.
                // Since Blockly Dropdowns can take a function, we rely on that, but we ALSO need to force a value change if the current value is invalid.

                // Best approach: The dropdowns below should call a function that looks at THIS field's value.
                // But we still need to set a valid value for them if the new market doesn't contain the old submarket.

                // Get valid submarkets for new market
                var validSubmarkets = Object.keys(MARKET_HIERARCHY[newValue].submarkets);

                // Default to first submarket
                setTimeout(function () {
                    if (submarketField) {
                        submarketField.setValue(validSubmarkets[0]);
                    }
                }, 0);

                return newValue;
            };

            var submarketValidator = function (newValue) {
                var marketVal = self.getFieldValue("MARKET_LIST");
                var symbolField = self.getField("SYMBOL_LIST");

                // Get symbols for (market, newSubmarket)
                try {
                    var symbols = MARKET_HIERARCHY[marketVal].submarkets[newValue].symbols;
                    setTimeout(function () {
                        if (symbolField && symbols.length > 0) {
                            symbolField.setValue(symbols[0][1]);
                        }
                    }, 0);
                } catch (e) { }

                return newValue;
            };

            // Fields required for XML parsing compatibility
            var marketDropdown = new Blockly.FieldDropdown(this.getMarketOptions.bind(this), marketValidator);
            var submarketDropdown = new Blockly.FieldDropdown(function () {
                return self.getSubmarketOptions(self.getFieldValue("MARKET_LIST"));
            }, submarketValidator);

            // Symbol dropdown with validator to preserve XML values
            var symbolValidator = function (newValue) {
                // Allow any value to be set (including from XML)
                // This prevents "unavailable option" errors when loading saved robots
                return newValue;
            };

            var symbolDropdown = new Blockly.FieldDropdown(function () {
                var options = self.getSymbolOptions(self.getFieldValue("MARKET_LIST"), self.getFieldValue("SUBMARKET_LIST"));

                // 🛡️ CRITICAL: If current value is not in options, add it temporarily
                var currentValue = self.getFieldValue("SYMBOL_LIST");
                if (currentValue) {
                    var valueExists = options.some(function (opt) { return opt[1] === currentValue; });
                    if (!valueExists) {
                        // Add current value to prevent "unavailable option" error
                        options.push([currentValue + " (carregado)", currentValue]);
                    }
                }

                return options;
            }, symbolValidator);


            this.appendDummyInput()
                .appendField("Mercado:")
                .appendField(marketDropdown, "MARKET_LIST")
                .appendField(submarketDropdown, "SUBMARKET_LIST")
                .appendField(symbolDropdown, "SYMBOL_LIST");

            this.appendDummyInput()
                .appendField("Tipo:")
                .appendField(new Blockly.FieldDropdown([
                    ["Up/Down", "callput"],
                    ["Digits", "digits"],
                    ["Multipliers", "multiplier"]
                ]), "TRADETYPECAT_LIST")
                .appendField(new Blockly.FieldDropdown([
                    ["Rise/Fall", "risefall"],
                    ["Matches/Differs", "matchesdiffers"],
                    ["Even/Odd", "evenodd"],
                    ["Over/Under", "overunder"],
                    ["Higher/Lower", "higherlower"]
                ]), "TRADETYPE_LIST");

            this.appendDummyInput()
                .appendField("Contrato:")
                .appendField(new Blockly.FieldDropdown([
                    ["Both", "both"],
                    ["Matches", "DIGITMATCH"],
                    ["Differs", "DIGITDIFF"],
                    ["Even", "DIGITEVEN"],
                    ["Odd", "DIGITODD"],
                    ["Over", "DIGITOVER"],
                    ["Under", "DIGITUNDER"],
                    ["Rise", "CALLE"],
                    ["Fall", "PUTE"]
                ]), "TYPE_LIST");

            this.appendDummyInput()
                .appendField("Candle:")
                .appendField(new Blockly.FieldDropdown([
                    ["Default", "default"],
                    ["1 Minute", "60"],
                    ["2 Minutes", "120"],
                    ["3 Minutes", "180"],
                    ["5 Minutes", "300"],
                    ["10 Minutes", "600"],
                    ["15 Minutes", "900"],
                    ["30 Minutes", "1800"],
                    ["1 Hour", "3600"],
                    ["2 Hours", "7200"],
                    ["4 Hours", "14400"],
                    ["8 Hours", "28800"],
                    ["1 Day", "86400"]
                ]), "CANDLEINTERVAL_LIST");

            // Checkboxes (Fields)
            this.appendDummyInput()
                .appendField("Reiniciar último trade no erro:")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "RESTARTONERROR");

            // Legacy field to support XML loading (Hidden in UI logic conceptually, but present for parsing)
            var timeMachineInput = this.appendDummyInput();
            timeMachineInput.appendField("Time Machine:")
                .appendField(new Blockly.FieldCheckbox("FALSE"), "TIME_MACHINE_ENABLED");
            timeMachineInput.setVisible(false);

            this.appendStatementInput("INITIALIZATION")
                .setCheck(null)
                .appendField("Executar uma vez no início:");
            this.appendStatementInput("SUBMARKET")
                .setCheck(null)
                .appendField("Definir Opções de Trade:");

            // Hidden containers for standard flow (optional visibility)
            // Removed legacy BEFORE_PURCHASE and AFTER_PURCHASE inputs as requested

            this.setColour('#2a3052');
            this.setTooltip("Bloco principal do robô");
            this.setHelpUrl("");
            this.setDeletable(false); // Cannot delete the root block
        }
    };

    // ... (before_purchase and after_purchase remain same)

    // 18. During Purchase Block
    Blockly.Blocks['during_purchase'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("(3) Durante a Compra");
            this.appendStatementInput("DURING_PURCHASE_STACK")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Eventos durante a compra (check sell)");
        }
    };

    // 19. Check Sell Block
    Blockly.Blocks['check_sell'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Vender se disponível");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Verifica possibilidade de venda");
        }
    };

    // 20. Last Digit Block
    Blockly.Blocks['last_digit'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Último dígito");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Retorna o último dígito do tick atual");
        }
    };

    // 4. Purchase Block (Updated for Dropdown)
    Blockly.Blocks['purchase'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Comprar")
                .appendField(new Blockly.FieldDropdown([
                    ["Call", "CALL"],
                    ["Put", "PUT"],
                    ["Rise", "CALLE"],
                    ["Fall", "PUTE"],
                    ["Higher", "CALL"],
                    ["Lower", "PUT"],
                    ["Matches", "DIGITMATCH"],
                    ["Differs", "DIGITDIFF"],
                    ["Even", "DIGITEVEN"],
                    ["Odd", "DIGITODD"],
                    ["Over", "DIGITOVER"],
                    ["Under", "DIGITUNDER"]
                ]), "PURCHASE_LIST");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#4caf50');
            this.setTooltip("Executa a compra do contrato");
        }
    };



    // 2. Before Purchase Block
    Blockly.Blocks['before_purchase'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("(2) Antes da Compra");
            this.appendStatementInput("BEFOREPURCHASE_STACK")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Lógica de análise antes de entrar no trade");
            this.setHelpUrl("");
        }
    };

    // 3. After Purchase Block
    Blockly.Blocks['after_purchase'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("(4) Após a Compra");
            this.appendStatementInput("AFTERPURCHASE_STACK")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Lógica de resultado (Vitória/Derrota)");
            this.setHelpUrl("");
        }
    };

    // ... (rest of blocks) ...

    // 10. Trade Options Block (Container for checkboxes and extra params)
    Blockly.Blocks['tradeOptions'] = {
        init: function () {
            var self = this;

            this.appendDummyInput()
                .appendField("Opções Adicionais");

            // Time Machine & Restart on Error (Hidden by default to match UI reference)
            var timeMachineInput = this.appendDummyInput();
            timeMachineInput.appendField("Time Machine:")
                .appendField(new Blockly.FieldCheckbox("FALSE"), "TIME_MACHINE_ENABLED");
            timeMachineInput.setVisible(false);

            var restartInput = this.appendDummyInput();
            restartInput.appendField("Reiniciar no Erro:")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "RESTARTONERROR");
            restartInput.setVisible(false);

            this.appendDummyInput()
                .appendField("Moeda:")
                .appendField(new Blockly.FieldDropdown([
                    ["USD", "USD"],
                    ["EUR", "EUR"],
                    ["GBP", "GBP"],
                    ["AUD", "AUD"]
                ]), "CURRENCY_LIST");

            // Missing Duration & Barriers for XML
            this.appendDummyInput()
                .appendField("Duração:")
                .appendField(new Blockly.FieldDropdown([
                    ["Ticks", "t"],
                    ["Seconds", "s"],
                    ["Minutes", "m"],
                    ["Hours", "h"],
                    ["Days", "d"]
                ]), "DURATIONTYPE_LIST");

            this.appendValueInput("DURATION")
                .setCheck("Number")
                .appendField("Duração (Val):");

            this.appendValueInput("AMOUNT")
                .setCheck("Number")
                .appendField("Valor da Aposta (Stake):");

            // PREDICTION - Will be shown/hidden based on contract type
            this.predictionInput = this.appendValueInput("PREDICTION")
                .setCheck("Number")
                .appendField("Predição:");

            // BARRIEROFFSET - Will be shown/hidden based on contract type
            this.barrierOffsetInput = this.appendValueInput("BARRIEROFFSET")
                .setCheck("Number")
                .appendField("Offset de Barreira:");

            // Barrier Offset Types (Hidden for XML compatibility)
            var barrierTypeInput = this.appendDummyInput();
            barrierTypeInput.appendField("Tipo de Barreira:")
                .appendField(new Blockly.FieldDropdown([
                    ["Absoluto", "absolute"],
                    ["Relativo", "relative"],
                    ["+", "+"],
                    ["-", "-"]
                ]), "BARRIEROFFSETTYPE_LIST");
            barrierTypeInput.setVisible(false);

            var secondBarrierTypeInput = this.appendDummyInput();
            secondBarrierTypeInput.appendField("Tipo de Segunda Barreira:")
                .appendField(new Blockly.FieldDropdown([
                    ["Absoluto", "absolute"],
                    ["Relativo", "relative"],
                    ["+", "+"],
                    ["-", "-"]
                ]), "SECONDBARRIEROFFSETTYPE_LIST");
            secondBarrierTypeInput.setVisible(false);

            // Hidden Barrier Fields (Only used for specific contract types)
            var barrierInput = this.appendDummyInput();
            barrierInput.appendField("Barreira Offset:")
                .appendField(new Blockly.FieldDropdown([["+", "+"], ["-", "-"]]), "BARRIEROFFSETTYPE_LIST");
            barrierInput.setVisible(false);

            var secondBarrierInput = this.appendDummyInput();
            secondBarrierInput.appendField("Segunda Barreira Offset:")
                .appendField(new Blockly.FieldDropdown([["+", "+"], ["-", "-"]]), "SECONDBARRIEROFFSETTYPE_LIST");
            secondBarrierInput.setVisible(false);

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Configurações adicionais do trade");

            // 🎯 DYNAMIC FIELD VISIBILITY LOGIC
            this.updateFieldVisibility = function () {
                // Find parent trade block
                const customBlocks = ['purchase', 'trade', 'before_purchase', 'after_purchase',
                    'during_purchase', 'check_sell', 'last_digit', 'tradeOptions',
                    'tick', 'notify', 'text_prompt_inp', 'macda', 'payout', 'text', 'selectinput', 'report',
                    'update_trade_option'];
                var tradeBlock = self.getSurroundParent();
                while (tradeBlock && tradeBlock.type !== 'trade') {
                    tradeBlock = tradeBlock.getSurroundParent();
                }

                if (!tradeBlock) {
                    // Default: hide both if not inside a trade block
                    if (self.predictionInput) self.predictionInput.setVisible(false);
                    if (self.barrierOffsetInput) self.barrierOffsetInput.setVisible(false);
                    return;
                }

                // Get contract type from trade block
                var contractType = tradeBlock.getFieldValue('TYPE_LIST');
                var tradeTypeCategory = tradeBlock.getFieldValue('TRADETYPECAT_LIST');

                // Determine what to show based on contract type
                var showPrediction = false;
                var showBarrier = false;

                // 🔍 Contract Type Detection Logic
                // Prediction contracts: Only Matches/Differs, Over/Under (NOT Even/Odd)
                var predictionContracts = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'];

                // Barrier contracts: Higher/Lower, Touch/No Touch, Ends In/Out
                var barrierContracts = ['CALL', 'PUT', 'BARRIER'];

                if (contractType && predictionContracts.indexOf(contractType) !== -1) {
                    showPrediction = true;
                } else if (tradeTypeCategory === 'digits') {
                    // If category is digits, likely needs prediction
                    showPrediction = true;
                }

                // Check if contract uses barriers
                if (contractType && barrierContracts.indexOf(contractType) !== -1) {
                    showBarrier = true;
                } else if (tradeTypeCategory === 'callput' || tradeTypeCategory === 'touchnotouch') {
                    showBarrier = true;
                }

                // Apply visibility
                if (self.predictionInput && self.predictionInput.sourceBlock_) {
                    try {
                        self.predictionInput.setVisible(showPrediction);
                    } catch (e) {
                        // Ignore connection errors during init
                    }
                }
                if (self.barrierOffsetInput && self.barrierOffsetInput.sourceBlock_) {
                    try {
                        self.barrierOffsetInput.setVisible(showBarrier);
                    } catch (e) {
                        // Ignore connection errors during init
                    }
                }
            };

            // Call updateFieldVisibility when block is created or moved
            setTimeout(function () {
                self.updateFieldVisibility();
            }, 100);
        },

        // Hook into onchange event to update visibility when parent changes
        onchange: function (event) {
            if (this.workspace && !this.workspace.isDragging()) {
                this.updateFieldVisibility();
            }
        }
    };



    // 5. Trade Again Block
    Blockly.Blocks['trade_again'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Negociar Novamente");
            this.setPreviousStatement(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Reinicia o ciclo de trade");
            this.setHelpUrl("");
        }
    };

    // 6. Read Details Block (Contextual info)
    Blockly.Blocks['read_details'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Ler Detalhes")
                .appendField(new Blockly.FieldDropdown([
                    ["Lucro", "profit"],
                    ["Resultado", "result"],
                    ["Barreira", "barrier"],
                    ["Preço de Entrada", "entry_spot"],
                    ["Preço de Saída", "exit_spot"],
                    ["Outros", "4"]
                ]), "DETAIL_INDEX");
            this.setOutput(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Lê detalhes do último trade");
            this.setHelpUrl("");
        }
    };

    // 7. Notify Block
    Blockly.Blocks['notify'] = {
        init: function () {
            this.appendValueInput("MESSAGE")
                .setCheck(null)
                .appendField("Notificar")
                .appendField(new Blockly.FieldDropdown([
                    ["Sucesso", "success"],
                    ["Info", "info"],
                    ["Aviso", "warn"],
                    ["Erro", "error"]
                ]), "NOTIFICATION_TYPE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Exibe uma notificação na tela");
            this.setHelpUrl("");
        }
    };

    // 8. Custom Market Analysis Components (Placeholders)
    Blockly.Blocks['tick_analysis'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Análise de Tick");
            this.appendStatementInput("TICKANALYSIS_STACK")
                .setCheck(null);
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Retorna dados do último tick");
        }
    };

    // 9. Ticks list block
    Blockly.Blocks['ticks'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Lista de Ticks");
            this.setOutput(true, "Array");
            this.setColour('#546e7a');
            this.setTooltip("Retorna a lista de ticks atuais");
        }
    };



    // 10. Contract Check Result (Win/Loss)
    Blockly.Blocks['contract_check_result'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Resultado do Contrato é")
                .appendField(new Blockly.FieldDropdown([
                    ["Win", "win"],
                    ["Loss", "loss"]
                ]), "CHECK_RESULT");
            this.setOutput(true, "Boolean");
            this.setColour('#546e7a');
            this.setTooltip("Verifica o resultado do último contrato");
        }
    };

    // 12. Total Profit Block
    Blockly.Blocks['total_profit'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Lucro Total");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Retorna o lucro total acumulado");
        }
    };

    // 14. Text Prompt Input (Custom)
    Blockly.Blocks['text_prompt_inp'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Prompt de Texto")
                .appendField(new Blockly.FieldImage("https://www.gstatic.com/codesite/ph/images/star_on.gif", 15, 15, "*"), "BADGE");
            this.appendValueInput("TEXT")
                .setCheck(null)
                .appendField("Mensagem:");
            this.setOutput(true, "String");
            this.setColour('#546e7a');
            this.setTooltip("Solicita um texto do usuário");
        }
    };

    // 13. Payout Block
    Blockly.Blocks['payout'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Payout")
                .appendField(new Blockly.FieldDropdown([
                    ["Differs", "DIGITDIFF"],
                    ["Matches", "DIGITMATCH"],
                    ["Rise", "CALLE"],
                    ["Fall", "PUTE"],
                    ["Over", "DIGITOVER"],
                    ["Under", "DIGITUNDER"],
                    ["Even", "DIGITEVEN"],
                    ["Odd", "DIGITODD"]
                ]), "PURCHASE_LIST");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Retorna o valor de payout do contrato");
        }
    };

    // 15. Go Back Trade Options (Navigational/Legacy)
    Blockly.Blocks['goback_tradeoptions'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Voltar para Opções de Trade");
            this.setPreviousStatement(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Retorna para as definições de trade");
        }
    };

    // 16. Last Digit List Block
    Blockly.Blocks['lastDigitList'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Lista de Últimos Dígitos");
            this.setOutput(true, "Array");
            this.setColour('#546e7a');
            this.setTooltip("Retorna a lista dos últimos dígitos");
        }
    };

    // 17. MACD Array (Indicator)
    Blockly.Blocks['macda'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("MACD Array")
                .appendField(new Blockly.FieldDropdown([
                    ["Input List", "input_list"],
                    ["Fast Period", "fast_period"],
                    ["Slow Period", "slow_period"],
                    ["Signal Period", "signal_period"]
                ]), "MACDAFIELDS_LIST");
            this.appendValueInput("INPUT")
                .setCheck("Array")
                .appendField("Input");
            this.setOutput(true, "Array");
            this.setColour('#546e7a');
            this.setTooltip("Calculates MACD Array");
        }
    };

    // 11. Timeout Block (Misc)
    Blockly.Blocks['timeout'] = {
        init: function () {
            this.appendValueInput("SECONDS")
                .setCheck("Number")
                .appendField("Aguardar (s)");
            this.appendStatementInput("TIMEOUTSTACK")
                .setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Pausa a execução por X segundos");
        }
    };

    // Add more blocks as needed based on the XML structure

    // 21. Tick Block
    Blockly.Blocks['tick'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Tick atual");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Retorna o valor do tick atual");
        }
    };

    // 22. Notify Block (Complete with NOTIFICATION_SOUND and NOTIFICATION_TYPE)
    Blockly.Blocks['notify'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Notificar")
                .appendField(new Blockly.FieldDropdown([
                    ["Som Ativado", "TRUE"],
                    ["Som Desativado", "FALSE"],
                    ["Job Done", "job-done"],
                    ["Earned Money", "earned-money"],
                    ["Silencioso", "silent"]
                ]), "NOTIFICATION_SOUND");
            this.appendDummyInput()
                .appendField("Tipo:")
                .appendField(new Blockly.FieldDropdown([
                    ["Info", "info"],
                    ["Sucesso", "success"],
                    ["Aviso", "warning"],
                    ["Erro", "error"]
                ]), "NOTIFICATION_TYPE");
            this.appendValueInput("MESSAGE")
                .setCheck(null)
                .appendField("Mensagem:");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Envia uma notificação");
        }
    };

    // 23. Update text_prompt_inp to include VALUE input
    Blockly.Blocks['text_prompt_inp'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Prompt de texto")
                .appendField(new Blockly.FieldTextInput("info"), "BADGE");
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField("Texto:");
            this.appendValueInput("VALUE")
                .setCheck(null)
                .appendField("Valor:");
            this.setOutput(true, "String");
            this.setColour('#546e7a');
            this.setTooltip("Prompt de entrada de texto");
        }
    };

    // 24. Update macda to include all required fields
    Blockly.Blocks['macda'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("MACD")
                .appendField(new Blockly.FieldDropdown([
                    ["MACD", "macd"],
                    ["Signal", "signal"],
                    ["Histograma", "histogram"],
                    ["1", "1"],
                    ["2", "2"],
                    ["3", "3"]
                ]), "MACDFIELDS_LIST");
            this.appendValueInput("INPUT")
                .setCheck("Array")
                .appendField("Input:");
            this.appendValueInput("FAST_EMA_PERIOD")
                .setCheck("Number")
                .appendField("Período EMA Rápida:");
            this.appendValueInput("SLOW_EMA_PERIOD")
                .setCheck("Number")
                .appendField("Período EMA Lenta:");
            this.appendValueInput("SIGNAL_EMA_PERIOD")
                .setCheck("Number")
                .appendField("Período EMA Sinal:");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Indicador MACD");
        }
    };

    // 25. Update payout to include PURCHASE_LIST
    Blockly.Blocks['payout'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Payout")
                .appendField(new Blockly.FieldDropdown([
                    ["Call", "CALL"],
                    ["Put", "PUT"],
                    ["Rise", "CALLE"],
                    ["Fall", "PUTE"],
                    ["Higher", "CALL"],
                    ["Lower", "PUT"],
                    ["Matches", "DIGITMATCH"],
                    ["Differs", "DIGITDIFF"],
                    ["Even", "DIGITEVEN"],
                    ["Odd", "DIGITODD"],
                    ["Over", "DIGITOVER"],
                    ["Under", "DIGITUNDER"]
                ]), "PURCHASE_LIST");
            this.setOutput(true, "Number");
            this.setColour('#4caf50');
            this.setTooltip("Retorna o payout do contrato");
        }
    };

    // 26. Text Block (Simple text value)
    Blockly.Blocks['text'] = {
        init: function () {
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput(""), "TEXT");
            this.setOutput(true, "String");
            this.setColour('#546e7a');
            this.setTooltip("Valor de texto");
        }
    };

    // 27. Select Input Block (Dropdown input with ADD0 and TEXT)
    Blockly.Blocks['selectinput'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Seleção")
                .appendField(new Blockly.FieldDropdown([
                    ["Opção 1", "1"],
                    ["Opção 2", "2"],
                    ["Opção 3", "3"]
                ]), "OPTIONS");
            this.appendValueInput("ADD0")
                .setCheck(null)
                .appendField("Valor:");
            this.appendValueInput("TEXT")
                .setCheck("String")
                .appendField("Texto:");
            this.appendValueInput("ADD1")
                .setCheck(null)
                .appendField("Valor 2:");
            this.setOutput(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Campo de seleção com dropdown");
        }
    };

    // 28. Report Block (Complete with all fields)
    Blockly.Blocks['report'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Reportar")
                .appendField(new Blockly.FieldDropdown([
                    ["Info", "info"],
                    ["Sucesso", "success"],
                    ["Aviso", "warning"],
                    ["Erro", "error"],
                    ["Falha", "failure"]
                ]), "REPORT_TYPE");
            this.appendDummyInput()
                .appendField("Som:")
                .appendField(new Blockly.FieldDropdown([
                    ["Ativado", "TRUE"],
                    ["Desativado", "FALSE"],
                    ["Silencioso", "silent"]
                ]), "REPORT_SOUND");
            this.appendDummyInput()
                .appendField("Parar automação:")
                .appendField(new Blockly.FieldDropdown([
                    ["Sim", "TRUE"],
                    ["Não", "FALSE"]
                ]), "REPORT_STOP");
            this.appendValueInput("REPORT_MESSAGE")
                .setCheck("String")
                .appendField("Mensagem:");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Envia um relatório ou log");
        }
    };

    // 29. Update Trade Option Block
    Blockly.Blocks['update_trade_option'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Atualizar Opção de Trade");
            this.appendValueInput("VALUE")
                .setCheck(null)
                .appendField("Valor:");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#2a3052');
            this.setTooltip("Atualiza opções do trade dinamicamente");
        }
    };

    // 30. Bollinger Bands Block
    Blockly.Blocks['bb'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Bollinger Bands")
                .appendField(new Blockly.FieldDropdown([
                    ["Upper", "upper"],
                    ["Middle", "middle"],
                    ["Lower", "lower"],
                    ["1", "1"],
                    ["2", "2"]
                ]), "OUTPUT");
            this.appendValueInput("INPUT")
                .setCheck("Array")
                .appendField("Input:");
            this.appendValueInput("PERIOD")
                .setCheck("Number")
                .appendField("Period:");
            this.appendValueInput("UPMULTIPLIER")
                .setCheck("Number")
                .appendField("Up Multiplier:");
            this.appendValueInput("DOWNMULTIPLIER")
                .setCheck("Number")
                .appendField("Down Multiplier:");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Calculates Bollinger Bands");
        }
    };

    // 31. Option Select Block
    Blockly.Blocks['optionselect'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Opção")
                .appendField(new Blockly.FieldTextInput("Nome"), "NAME")
                .appendField(new Blockly.FieldDropdown([
                    ["Opção 1", "1"],
                    ["Opção 2", "2"]
                ]), "VALUE");
            this.setOutput(true, null);
            this.setColour('#546e7a');
            this.setTooltip("Seleciona uma opção");
        }
    };

    // 32. To DateTime Block
    Blockly.Blocks['todatetime'] = {
        init: function () {
            this.appendValueInput("TIMESTAMP")
                .setCheck("Number")
                .appendField("To DateTime");
            this.setOutput(true, "String");
            this.setColour('#546e7a');
            this.setTooltip("Converts timestamp to datetime string");
        }
    };

    // 33. Check Direction Block
    Blockly.Blocks['check_direction'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Check Direction")
                .appendField(new Blockly.FieldDropdown([
                    ["Rise", "rise"],
                    ["Fall", "fall"],
                    ["No", "no"]
                ]), "CHECK_DIRECTION");
            this.setOutput(true, "Boolean");
            this.setColour('#546e7a');
            this.setTooltip("Checks the direction of the tick/trade");
        }
    };

    // 34. SMA Block
    Blockly.Blocks['sma'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("SMA");
            this.appendValueInput("INPUT")
                .setCheck("Array")
                .appendField("Input");
            this.appendValueInput("PERIOD")
                .setCheck("Number")
                .appendField("Period");
            this.setOutput(true, "Number");
            this.setColour('#546e7a');
            this.setTooltip("Simple Moving Average");
        }
    };
}

// Export initialization function
window.initCustomBlocks = initCustomBlocks;
