import React, { useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';

interface BlocklyEditorProps {
  onSave?: (xml: string) => void;
  onLoad?: (xml: string) => void;
  onRun?: (code: string) => void;
  onStop?: () => void;
}

declare global {
  interface Window {
    Blockly: any;
    initCustomBlocks?: () => void;
  }
}

const BlocklyEditor: React.FC<BlocklyEditorProps> = ({ onSave, onLoad, onRun, onStop }) => {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Initialize Blockly when component mounts
  useEffect(() => {
    const loadBlockly = async () => {
      // Load Blockly from CDN if not available
      if (!window.Blockly) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/blockly/blockly.min.js';
        document.head.appendChild(script);
        
        script.onload = () => {
          // Load blocks and generators after Blockly is loaded
          const blocksScript = document.createElement('script');
          blocksScript.src = 'https://unpkg.com/blockly/blocks.min.js';
          document.head.appendChild(blocksScript);
          
          blocksScript.onload = () => {
            const jsScript = document.createElement('script');
            jsScript.src = 'https://unpkg.com/blockly/javascript.min.js';
            document.head.appendChild(jsScript);
            
            jsScript.onload = () => {
              initializeBlockly();
            };
          };
        };
      } else {
        initializeBlockly();
      }
    };

    const initializeBlockly = () => {
      if (!window.Blockly) return;

      // Define custom blocks if not already defined
      if (!window.initCustomBlocks) {
        defineCustomBlocks();
      }

      // Inject Blockly workspace
      if (blocklyDivRef.current) {
        const workspace = window.Blockly.inject(blocklyDivRef.current, {
          toolbox: getToolbox(),
          media: 'https://unpkg.com/blockly/media/',
          grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true,
          },
          zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2,
          },
          trashcan: true,
        });

        setWorkspace(workspace);

        // Add resize handler
        const handleResize = () => {
          window.Blockly.svgResize(workspace);
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          workspace.dispose();
        };
      }
    };

    loadBlockly();
  }, []);

  // Define custom blocks
  const defineCustomBlocks = () => {
    if (!window.Blockly) return;

    // Trade block
    window.Blockly.Blocks['trade'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("(1) Defina seu contrato de trade");
        
        this.appendDummyInput()
          .appendField("Mercado:")
          .appendField(new window.Blockly.FieldDropdown([
            ["Synthetic Index", "synthetic_index"],
            ["Forex", "forex"],
            ["Stocks", "stocks"]
          ]), "MARKET_LIST")
          .appendField(new window.Blockly.FieldDropdown([
            ["Continuous Indices", "continuous_index"],
            ["Daily Reset", "daily_reset"]
          ]), "SUBMARKET_LIST")
          .appendField(new window.Blockly.FieldDropdown([
            ["Volatility 100", "R_100"],
            ["Volatility 50", "R_50"],
            ["Volatility 25", "R_25"]
          ]), "SYMBOL_LIST");

        this.appendStatementInput("INITIALIZATION")
          .setCheck(null)
          .appendField("Executar uma vez no início:");

        this.appendStatementInput("SUBMARKET")
          .setCheck(null)
          .appendField("Definir Opções de Trade:");

        this.setColour('#2a3052');
        this.setTooltip("Bloco principal do robô");
        this.setHelpUrl("");
        this.setDeletable(false);
      }
    };

    // Before Purchase block
    window.Blockly.Blocks['before_purchase'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("(2) Antes da Compra");
        this.appendStatementInput("BEFOREPURCHASE_STACK")
          .setCheck(null);
        this.setPreviousStatement(true, null);
        this.setColour('#2a3052');
        this.setTooltip("Lógica de análise antes de entrar no trade");
      }
    };

    // Purchase block
    window.Blockly.Blocks['purchase'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("Comprar")
          .appendField(new window.Blockly.FieldDropdown([
            ["Call", "CALL"],
            ["Put", "PUT"],
            ["Rise", "CALLE"],
            ["Fall", "PUTE"],
            ["Matches", "DIGITMATCH"],
            ["Differs", "DIGITDIFF"]
          ]), "PURCHASE_LIST");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#4caf50');
        this.setTooltip("Executa a compra do contrato");
      }
    };

    // After Purchase block
    window.Blockly.Blocks['after_purchase'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("(4) Após a Compra");
        this.appendStatementInput("AFTERPURCHASE_STACK")
          .setCheck(null);
        this.setPreviousStatement(true, null);
        this.setColour('#2a3052');
        this.setTooltip("Lógica de resultado (Vitória/Derrota)");
      }
    };

    // During Purchase block
    window.Blockly.Blocks['during_purchase'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("(3) Durante a Compra");
        this.appendStatementInput("DURING_PURCHASE_STACK")
          .setCheck(null);
        this.setPreviousStatement(true, null);
        this.setColour('#2a3052');
        this.setTooltip("Eventos durante a compra (check sell)");
      }
    };

    // Check Sell block
    window.Blockly.Blocks['check_sell'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("Vender se disponível");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#2a3052');
        this.setTooltip("Verifica possibilidade de venda");
      }
    };

    // Last Digit block
    window.Blockly.Blocks['last_digit'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("Último dígito");
        this.setOutput(true, "Number");
        this.setColour('#546e7a');
        this.setTooltip("Retorna o último dígito do tick atual");
      }
    };

    // Trade Again block
    window.Blockly.Blocks['trade_again'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("Continuar");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#4caf50');
        this.setTooltip("Reinicia o ciclo de trading");
      }
    };

    // Notify block
    window.Blockly.Blocks['notify'] = {
      init: function() {
        this.appendValueInput("MESSAGE")
          .setCheck("String")
          .appendField("Notificação");
        this.appendDummyInput()
          .appendField(new window.Blockly.FieldDropdown([
            ["info", "info"],
            ["success", "success"],
            ["warn", "warn"],
            ["error", "error"]
          ]), "NOTIFICATION_TYPE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#ff9800');
        this.setTooltip("Envia uma notificação");
      }
    };

    // SMA indicator block
    window.Blockly.Blocks['sma'] = {
      init: function() {
        this.appendValueInput("INPUT")
          .setCheck("Array")
          .appendField("SMA");
        this.appendValueInput("PERIOD")
          .setCheck("Number")
          .appendField("Período:");
        this.setOutput(true, "Number");
        this.setColour('#9c27b0');
        this.setTooltip("Calcula a média móvel simples");
      }
    };

    // RSI indicator block
    window.Blockly.Blocks['rsi'] = {
      init: function() {
        this.appendValueInput("INPUT")
          .setCheck("Array")
          .appendField("RSI");
        this.appendValueInput("PERIOD")
          .setCheck("Number")
          .appendField("Período:");
        this.setOutput(true, "Number");
        this.setColour('#9c27b0');
        this.setTooltip("Calcula o índice de força relativa");
      }
    };

    // Trade Options block
    window.Blockly.Blocks['trade_options'] = {
      init: function() {
        this.appendDummyInput()
          .appendField("Opções de Trade");
        this.appendValueInput("STAKE")
          .setCheck("Number")
          .appendField("Valor:");
        this.appendValueInput("DURATION")
          .setCheck("Number")
          .appendField("Duração:");
        this.appendDummyInput()
          .appendField(new window.Blockly.FieldDropdown([
            ["ticks", "t"],
            ["seconds", "s"],
            ["minutes", "m"],
            ["hours", "h"],
            ["days", "d"]
          ]), "DURATION_UNIT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#607d8b');
        this.setTooltip("Define opções de trade");
      }
    };

    // Export the function to initialize custom blocks
    window.initCustomBlocks = () => {};
  };

  // Define the toolbox XML
  const getToolbox = () => {
    return `
      <xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
        <category name="Lógica" colour="#5b80a5">
          <block type="controls_if"></block>
          <block type="logic_compare"></block>
          <block type="logic_operation"></block>
          <block type="logic_negate"></block>
          <block type="logic_boolean"></block>
          <block type="logic_null"></block>
          <block type="logic_ternary"></block>
        </category>
        <category name="Matemática" colour="#5b67a5">
          <block type="math_number"></block>
          <block type="math_arithmetic"></block>
          <block type="math_single"></block>
          <block type="math_trig"></block>
          <block type="math_constant"></block>
          <block type="math_number_property"></block>
          <block type="math_round"></block>
          <block type="math_on_list"></block>
          <block type="math_modulo"></block>
          <block type="math_constrain"></block>
          <block type="math_random_int"></block>
          <block type="math_random_float"></block>
        </category>
        <category name="Texto" colour="#5ba58c">
          <block type="text"></block>
          <block type="text_join"></block>
          <block type="text_append"></block>
          <block type="text_length"></block>
          <block type="text_isEmpty"></block>
          <block type="text_indexOf"></block>
          <block type="text_charAt"></block>
          <block type="text_getSubstring"></block>
          <block type="text_changeCase"></block>
          <block type="text_trim"></block>
          <block type="text_print"></block>
          <block type="text_prompt_ext"></block>
        </category>
        <category name="Listas" colour="#745fb5">
          <block type="lists_create_with"></block>
          <block type="lists_create_with"></block>
          <block type="lists_repeat"></block>
          <block type="lists_length"></block>
          <block type="lists_isEmpty"></block>
          <block type="lists_indexOf"></block>
          <block type="lists_getIndex"></block>
          <block type="lists_setIndex"></block>
          <block type="lists_getSublist"></block>
          <block type="lists_split"></block>
          <block type="lists_sort"></block>
        </category>
        <category name="Variáveis" colour="#a55b80" custom="VARIABLE"></category>
        <category name="Funções" colour="#995ba5" custom="PROCEDURE"></category>
        <sep></sep>
        <category name="Deriv Bot" colour="#a55b80">
          <block type="trade"></block>
          <block type="before_purchase"></block>
          <block type="purchase"></block>
          <block type="after_purchase"></block>
          <block type="during_purchase"></block>
          <block type="check_sell"></block>
          <block type="trade_again"></block>
        </category>
        <category name="Ferramentas" colour="#5ba5a5">
          <block type="notify"></block>
          <block type="last_digit"></block>
          <block type="sma"></block>
          <block type="rsi"></block>
          <block type="trade_options"></block>
        </category>
      </xml>
    `;
  };

  // Handle save operation
  const handleSave = () => {
    if (workspace) {
      const xml = window.Blockly.Xml.workspaceToDom(workspace);
      const xmlText = window.Blockly.Xml.domToText(xml);
      
      if (onSave) {
        onSave(xmlText);
      }
      
      toast.success("Robô salvo com sucesso!");
    }
  };

  // Handle load operation
  const handleLoad = (xmlText: string) => {
    if (workspace) {
      try {
        const xml = window.Blockly.Xml.textToDom(xmlText);
        window.Blockly.Xml.domToWorkspace(xml, workspace);
        
        if (onLoad) {
          onLoad(xmlText);
        }
        
        toast.success("Robô carregado com sucesso!");
      } catch (error) {
        toast.error("Erro ao carregar robô: " + (error as Error).message);
      }
    }
  };

  // Handle run operation
  const handleRun = () => {
    if (workspace) {
      try {
        // Generate JavaScript code from workspace
        if (!window.Blockly.JavaScript) {
          throw new Error("Gerador JavaScript não carregado.");
        }

        const code = window.Blockly.JavaScript.workspaceToCode(workspace);
        
        if (onRun) {
          onRun(code);
        }
        
        setIsRunning(true);
        toast.success("Robô iniciado!");
      } catch (error) {
        toast.error("Erro ao executar robô: " + (error as Error).message);
      }
    }
  };

  // Handle stop operation
  const handleStop = () => {
    setIsRunning(false);
    
    if (onStop) {
      onStop();
    }
    
    toast.info("Robô parado!");
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleLoad(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#13111c] rounded-lg border border-gray-800">
      <div className="p-3 bg-[#1e1b2e] rounded-t-lg flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Editor de Robôs</h3>
        <div className="flex gap-2">
          <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer text-sm font-medium transition-colors">
            Carregar
            <input 
              type="file" 
              accept=".xml,.sbot" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
          <button 
            onClick={handleSave}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Salvar
          </button>
          <button 
            onClick={isRunning ? handleStop : handleRun}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isRunning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? 'Parar' : 'Executar'}
          </button>
        </div>
      </div>
      
      <div 
        ref={blocklyDivRef} 
        className="flex-1 min-h-[500px]"
      />
      
      <ToastContainer 
        position="bottom-right" 
        theme="dark" 
        className="blockly-toast-container" 
      />
    </div>
  );
};

export default BlocklyEditor;