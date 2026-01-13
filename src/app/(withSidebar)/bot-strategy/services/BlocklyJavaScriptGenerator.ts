declare global {
  interface Window {
    Blockly: any;
  }
}

export const initBlocklyJavaScriptGenerator = () => {
  if (!window.Blockly || !window.Blockly.JavaScript) {
    console.warn("Blockly ou Blockly.JavaScript não estão disponíveis ainda. Aguardando...");
    setTimeout(initBlocklyJavaScriptGenerator, 100);
    return;
  }

  // Helper para registrar geradores corretamente para versões antigas e novas do Blockly
  const register = (blockType: string, generatorFunction: (block: any) => any) => {
    // Forma legada (Blockly < 10)
    window.Blockly.JavaScript[blockType] = generatorFunction;

    // Forma moderna (Blockly >= 10)
    if (window.Blockly.JavaScript.forBlock) {
      window.Blockly.JavaScript.forBlock[blockType] = generatorFunction;
    }
  };

  // 1. Bloco Trade (Ponto de Entrada Principal)
  register('trade', function(block: any) {
    // Campos básicos do bloco pai
    const market = block.getFieldValue('MARKET_LIST');
    const submarket = block.getFieldValue('SUBMARKET_LIST');
    const symbol = block.getFieldValue('SYMBOL_LIST');
    // Os campos de tipo de trade não estão definidos no bloco que criei, então vamos usar valores padrão
    const tradetypecat = 'callput';
    const tradetype = 'risefall';
    const type = 'both';
    const candleInterval = 'default';

    // Inicializar objeto
    let code = 'var tradeOptions = {\n';
    code += `  market: '${market}',\n`;
    code += `  submarket: '${submarket}',\n`;
    code += `  symbol: '${symbol}',\n`;
    code += `  tradeTypeCategory: '${tradetypecat}',\n`;
    code += `  tradeType: '${tradetype}',\n`;
    code += `  type: '${type}',\n`;
    code += `  candleInterval: '${candleInterval}',\n`;
    code += '};\n\n';

    // Executar o statement "SUBMARKET" para preencher tradeOptions (espera-se que contenha detalhes do bloco trade_options)
    const extraOptions = window.Blockly.JavaScript.statementToCode(block, 'SUBMARKET');
    code += extraOptions;

    // Código de inicialização (executado uma vez)
    const initCode = window.Blockly.JavaScript.statementToCode(block, 'INITIALIZATION');

    // Iniciar Bot
    // Procuramos por funções de callback globais (definidas por outros blocos no workspace)
    code += 'window.BlocklyBot.start(tradeOptions, {\n';
    code += '  onInitialization: function() { \n' + initCode + ' \n},\n';
    code += '  onBeforePurchase: function() { if(typeof before_purchase === "function") before_purchase(); },\n';
    code += '  onDuringPurchase: function() { if(typeof during_purchase === "function") during_purchase(); },\n';
    code += '  onAfterPurchase: function() { if(typeof after_purchase === "function") after_purchase(); },\n';
    code += '  onUpdate: function(running) { if(typeof updateUI === "function") updateUI(running); },\n';
    code += '  onNotify: function(msg, type, sound) { if(typeof notifyUI === "function") notifyUI(msg, type, sound); }\n';
    code += '});\n';

    return code;
  });

  // 2. Bloco Trade Options (Preenche opções)
  register('trade_options', function(block: any) {
    const stake = window.Blockly.JavaScript.valueToCode(block, 'STAKE', window.Blockly.JavaScript.ORDER_ATOMIC) || '1';
    const duration = window.Blockly.JavaScript.valueToCode(block, 'DURATION', window.Blockly.JavaScript.ORDER_ATOMIC) || '5';
    const durationUnit = block.getFieldValue('DURATION_UNIT') || 't';

    let code = `tradeOptions.amount = ${stake};\n`;
    code += `tradeOptions.duration = ${duration};\n`;
    code += `tradeOptions.durationType = '${durationUnit}';\n`;
    code += `tradeOptions.currency = 'USD';\n`;

    return code;
  });

  // 3. Geradores de Callback
  register('before_purchase', function(block: any) {
    const stack = window.Blockly.JavaScript.statementToCode(block, 'BEFOREPURCHASE_STACK');
    return 'function before_purchase() {\n' + stack + '}\n';
  });

  register('after_purchase', function(block: any) {
    const stack = window.Blockly.JavaScript.statementToCode(block, 'AFTERPURCHASE_STACK');
    return 'function after_purchase() {\n' + stack + '}\n';
  });

  register('during_purchase', function(block: any) {
    const stack = window.Blockly.JavaScript.statementToCode(block, 'DURING_PURCHASE_STACK');
    return 'function during_purchase() {\n' + stack + '}\n';
  });

  // 4. Blocos de Ação
  register('purchase', function(block: any) {
    const purchaseList = block.getFieldValue('PURCHASE_LIST') || 'CALL';
    return `window.BlocklyBot.purchase('${purchaseList}');\n`;
  });

  register('trade_again', function(block: any) {
    return 'window.BlocklyBot.tradeAgain();\n';
  });

  register('check_sell', function(block: any) {
    return 'window.BlocklyBot.sellAtMarket();\n';
  });

  register('notify', function(block: any) {
    const type = block.getFieldValue('NOTIFICATION_TYPE') || 'info';
    const msg = window.Blockly.JavaScript.valueToCode(block, 'MESSAGE', window.Blockly.JavaScript.ORDER_ATOMIC) || '"(sem mensagem)"';
    return `window.BlocklyBot.notify(${msg}, '${type}');\n`;
  });

  // 5. Blocos de Valor
  register('last_digit', function(block: any) {
    return ['window.BlocklyBot.getLastDigit()', window.Blockly.JavaScript.ORDER_ATOMIC];
  });

  register('sma', function(block: any) {
    const input = window.Blockly.JavaScript.valueToCode(block, 'INPUT', window.Blockly.JavaScript.ORDER_ATOMIC) || '[]';
    const period = window.Blockly.JavaScript.valueToCode(block, 'PERIOD', window.Blockly.JavaScript.ORDER_ATOMIC) || '10';
    return [`window.BlocklyBot.sma(${input}, ${period})`, window.Blockly.JavaScript.ORDER_ATOMIC];
  });

  register('rsi', function(block: any) {
    const input = window.Blockly.JavaScript.valueToCode(block, 'INPUT', window.Blockly.JavaScript.ORDER_ATOMIC) || '[]';
    const period = window.Blockly.JavaScript.valueToCode(block, 'PERIOD', window.Blockly.JavaScript.ORDER_ATOMIC) || '14';
    // RSI não está implementado no engine, então retornamos 0 por enquanto
    return ['0', window.Blockly.JavaScript.ORDER_ATOMIC];
  });

  // Adicionando outros blocos úteis
  register('math_number', function(block: any) {
    const number = parseFloat(block.getFieldValue('NUM'));
    return [number.toString(), window.Blockly.JavaScript.ORDER_ATOMIC];
  });

  register('text', function(block: any) {
    const text = block.getFieldValue('TEXT');
    return [`"${text}"`, window.Blockly.JavaScript.ORDER_ATOMIC];
  });

  register('logic_boolean', function(block: any) {
    const bool = block.getFieldValue('BOOL') === 'TRUE';
    return [bool ? 'true' : 'false', window.Blockly.JavaScript.ORDER_ATOMIC];
  });

  console.log("Gerador JavaScript do Blockly inicializado com sucesso!");
};

// Inicializar automaticamente quando o Blockly estiver disponível
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    initBlocklyJavaScriptGenerator();
  } else {
    window.addEventListener('load', initBlocklyJavaScriptGenerator);
  }
}