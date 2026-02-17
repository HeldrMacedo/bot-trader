// JavaScript Generator for DerivBot
// Maps Blockly blocks to Executable JavaScript using RobotStrategy (Bot)

(function () {
    function initJavaScriptGenerator() {
        if (typeof Blockly === 'undefined' || typeof Blockly.JavaScript === 'undefined') {
            console.warn("Blockly.JavaScript not ready yet. Retrying...");
            setTimeout(initJavaScriptGenerator, 100);
            return;
        }

              // Helper to register generator correctly for both old and new Blockly versions
        function register(blockType, generatorFunction) {
            // Legacy way (Blockly < 10)
            Blockly.JavaScript[blockType] = generatorFunction;

            // Modern way (Blockly >= 10)
            if (Blockly.JavaScript.forBlock) {
                Blockly.JavaScript.forBlock[blockType] = generatorFunction;
            }
        }

        // 1. Trade Block (Main Entry Point)
        register('trade', function (block) {
            // Basic fields from the parent block
            var market = block.getFieldValue('MARKET_LIST');
            var submarket = block.getFieldValue('SUBMARKET_LIST');
            var symbol = block.getFieldValue('SYMBOL_LIST');
            var tradetypecat = block.getFieldValue('TRADETYPECAT_LIST');
            var tradetype = block.getFieldValue('TRADETYPE_LIST');
            var type = block.getFieldValue('TYPE_LIST');
            var candleInterval = block.getFieldValue('CANDLEINTERVAL_LIST');

            // Initialize object
            var code = 'var tradeOptions = {\n';
            code += `  market: '${market}',\n`;
            code += `  submarket: '${submarket}',\n`;
            code += `  symbol: '${symbol}',\n`;
            code += `  tradeTypeCategory: '${tradetypecat}',\n`;
            code += `  tradeType: '${tradetype}',\n`;
            code += `  type: '${type}',\n`;
            code += `  candleInterval: '${candleInterval}',\n`;
            code += '};\n\n';

            // Execute "SUBMARKET" statement to populate tradeOptions (expected to contain tradeOptions block details)
            var extraOptions = Blockly.JavaScript.statementToCode(block, 'SUBMARKET');
            code += extraOptions;

            // Initialization Code (runs once)
            var initCode = Blockly.JavaScript.statementToCode(block, 'INITIALIZATION');

            // Start Bot
            // We look for global callback functions (defined by other blocks in the workspace)
            code += 'Bot.start(tradeOptions, {\n';
            code += '  onInitialization: function() { \n' + initCode + ' \n},\n';
            code += '  onBeforePurchase: function() { if(typeof before_purchase === "function") before_purchase(); },\n';
            code += '  onDuringPurchase: function() { if(typeof during_purchase === "function") during_purchase(); },\n';
            code += '  onAfterPurchase: function() { if(typeof after_purchase === "function") after_purchase(); }\n';
            code += '});\n';

            return code;
        });

        // 2. Trade Options Block (Populates options)
        register('tradeOptions', function (block) {
            var currency = block.getFieldValue('CURRENCY_LIST');
            var durationType = block.getFieldValue('DURATIONTYPE_LIST');
            var barrierOffsetType = block.getFieldValue('BARRIEROFFSETTYPE_LIST');
            var secondBarrierOffsetType = block.getFieldValue('SECONDBARRIEROFFSETTYPE_LIST');

            var duration = Blockly.JavaScript.valueToCode(block, 'DURATION', Blockly.JavaScript.ORDER_ATOMIC) || '0';
            var amount = Blockly.JavaScript.valueToCode(block, 'AMOUNT', Blockly.JavaScript.ORDER_ATOMIC) || '0.35';
            var prediction = Blockly.JavaScript.valueToCode(block, 'PREDICTION', Blockly.JavaScript.ORDER_ATOMIC);
            var barrierOffset = Blockly.JavaScript.valueToCode(block, 'BARRIEROFFSET', Blockly.JavaScript.ORDER_ATOMIC);

            var code = `tradeOptions.currency = '${currency}';\n`;
            code += `tradeOptions.durationType = '${durationType}';\n`;
            code += `tradeOptions.duration = ${duration};\n`;
            code += `tradeOptions.amount = ${amount};\n`;

            if (prediction) {
                code += `tradeOptions.prediction = ${prediction};\n`;
            }

            if (barrierOffset) {
                // Usually barrierOffset includes sign if it's a number, but if type is specific:
                code += `tradeOptions.barrierOffset = ${barrierOffset};\n`; // Pass raw for now
                if (barrierOffsetType) code += `tradeOptions.barrierOffsetType = '${barrierOffsetType}';\n`;
            }

            return code;
        });

        // 3. Callback Generators
        register('before_purchase', function (block) {
            var stack = Blockly.JavaScript.statementToCode(block, 'BEFOREPURCHASE_STACK');
            return 'function before_purchase() {\n' + stack + '}\n';
        });

        register('after_purchase', function (block) {
            var stack = Blockly.JavaScript.statementToCode(block, 'AFTERPURCHASE_STACK');
            return 'function after_purchase() {\n' + stack + '}\n';
        });

        register('during_purchase', function (block) {
            var stack = Blockly.JavaScript.statementToCode(block, 'DURING_PURCHASE_STACK');
            return 'function during_purchase() {\n' + stack + '}\n';
        });

        // 4. Action Blocks
        register('purchase', function (block) {
            // Fallback if PURCHASE_LIST is missing in block definition but used in generator
            var purchaseList = block.getFieldValue('PURCHASE_LIST');
            // Check if purchaseList is valid, otherwise default to something or warn
            if (!purchaseList) purchaseList = 'CALL';
            return `Bot.purchase('${purchaseList}');\n`;
        });

        register('trade_again', function (block) {
            return 'Bot.tradeAgain();\n';
        });

        register('check_sell', function (block) {
            return 'Bot.sellAtMarket();\n';
        });

        register('notify', function (block) {
            var type = block.getFieldValue('NOTIFICATION_TYPE') || 'info';
            var sound = block.getFieldValue('NOTIFICATION_SOUND') || 'silent';
            var msg = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC) || '"(sem mensagem)"';
            return `Bot.notify(${msg}, '${type}', '${sound}');\n`;
        });

        register('timeout', function (block) {
            var seconds = Blockly.JavaScript.valueToCode(block, 'SECONDS', Blockly.JavaScript.ORDER_ATOMIC) || '1';
            return `Bot.wait(${seconds});\n`;
        });

        register('update_trade_option', function (block) {
            var field = block.getFieldValue('UPDATE_TRADE_OPTION_DATA');
            var value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) || '0';
            // Map field names if necessary, assuming generator matches logic
            return `tradeOptions['${field}'] = ${value};\n`;
        });

        // 5. Value Blocks
        register('check_direction', function (block) {
            var dir = block.getFieldValue('CHECK_DIRECTION');
            return [`Bot.checkDirection('${dir}')`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('last_digit', function (block) {
            return ['Bot.getLastDigit()', Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('lastDigitList', function (block) {
            return ['Bot.getLastDigitList()', Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('tick', function (block) {
            return ['Bot.getLastTick()', Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('ticks', function (block) {
            return ['Bot.getTicks()', Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('tick_analysis', function (block) {
            return ['Bot.getLastTick()', Blockly.JavaScript.ORDER_ATOMIC]; // Handling as alias
        });

        register('read_details', function (block) {
            var detailIndex = block.getFieldValue('DETAIL_INDEX');
            return [`Bot.readDetails(${detailIndex})`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('contract_check_result', function (block) {
            var result = block.getFieldValue('CHECK_RESULT'); // win/loss
            return [`Bot.isResult('${result}')`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('total_profit', function (block) {
            return ['Bot.getTotalProfit()', Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('payout', function (block) {
            var type = block.getFieldValue('PURCHASE_LIST');
            return [`Bot.getPayout('${type}')`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('text_prompt_inp', function (block) {
            var msg = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '"Input:"';
            return [`Bot.ask(${msg})`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('optionselect', function (block) {
            var val = block.getFieldValue('VALUE');
            return [`'${val}'`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('todatetime', function (block) {
            var timestamp = Blockly.JavaScript.valueToCode(block, 'TIMESTAMP', Blockly.JavaScript.ORDER_ATOMIC) || '0';
            return [`Bot.toDateTime(${timestamp})`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        // Indicators
        register('sma', function (block) {
            var input = Blockly.JavaScript.valueToCode(block, 'INPUT', Blockly.JavaScript.ORDER_ATOMIC) || '[]';
            var period = Blockly.JavaScript.valueToCode(block, 'PERIOD', Blockly.JavaScript.ORDER_ATOMIC) || '10';
            return [`Bot.sma(${input}, ${period})`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('bb', function (block) {
            var input = Blockly.JavaScript.valueToCode(block, 'INPUT', Blockly.JavaScript.ORDER_ATOMIC) || '[]';
            var period = Blockly.JavaScript.valueToCode(block, 'PERIOD', Blockly.JavaScript.ORDER_ATOMIC) || '10';
            var up = Blockly.JavaScript.valueToCode(block, 'UPMULTIPLIER', Blockly.JavaScript.ORDER_ATOMIC) || '2';
            var down = Blockly.JavaScript.valueToCode(block, 'DOWNMULTIPLIER', Blockly.JavaScript.ORDER_ATOMIC) || '2';
            var output = block.getFieldValue('OUTPUT') || 'mb'; // mb, ub, lb

            return [`Bot.bb(${input}, ${period}, ${up}, ${down}, '${output}')`, Blockly.JavaScript.ORDER_ATOMIC];
        });

        register('macda', function (block) {
            var input = Blockly.JavaScript.valueToCode(block, 'INPUT', Blockly.JavaScript.ORDER_ATOMIC) || '[]';
            // Assuming macd implementation
            return ['0', Blockly.JavaScript.ORDER_ATOMIC];
        });

        // goback_tradeoptions - navigational block (no-op in execution)
        register('goback_tradeoptions', function (block) {
            // This block is used for UI navigation only, generates no code
            return '';
        });
       
    }

    // Try to init immediately, or wait for window load
    if (document.readyState === 'complete') {
        initJavaScriptGenerator();
    } else {
        window.addEventListener('load', initJavaScriptGenerator);
    }
})();
