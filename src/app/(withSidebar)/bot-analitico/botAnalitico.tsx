'use client';
import { Activity, BarChart3, CheckCircle, Settings, Target, Brain, Save, Upload } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';

// Types
import {
  AnalysisData,
  MartingaleConfig,
  SpecificOperations,
  TradingSignal,
  VolatilityData,
  VOLATILITIES,
  Account,
  MLConfig,
  MLPerformanceStats
} from './types';

// Components
import { AnalysisTab } from './components/AnalysisTab';
import { ConfigTab } from './components/ConfigTab';
import { ConnectionStatus } from './components/ConnectionStatus';
import { DashboardTab } from './components/DashboardTab';
import { GlobalConfigPanel } from './components/GlobalConfigPanel';
import { OperationMode } from './components/OperationMode';
import { PerformanceStats } from './components/PerformanceStats';
import { SignalsPanel } from './components/SignalsPanel';
import { MLConfigPanel } from './components/MLConfigPanel';
import { MLAnalysisPanel } from './components/MLAnalysisPanel';

import ResultsTab from './components/ResultsTab';
import { MLAnalysisEngine } from './lib/ml-analysis-engine';
import { AnalysisEngine } from './lib/analysis-engine';
import moment from 'moment';
import { MLInitializer } from './lib/ml-init';

export default function DerivAnalyzerDashboard() {
  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [apiToken, setApiToken] = useState('ehOXyajRlX3TdOu');
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = React.useRef(0);
  const analysisEngineRef = React.useRef<MLAnalysisEngine | null>(null);
  const pendingRequests = React.useRef<Record<number, (data: any) => void>>({});
  const [resultsList, setResultsList] = useState<any[]>([]);
  const isTradingRef = React.useRef(false);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000;

  // Data State
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [selectedVolatilities, setSelectedVolatilities] = useState<string[]>([
    'R_100',
  ]);

  const [volatilityData, setVolatilityData] = useState<
    Record<string, VolatilityData>
  >({});
  const [bestSignal, setBestSignal] = useState<TradingSignal | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [performance, setPerformance] = useState({
    total_signals: 0,
    high_confidence_signals: 0,
    medium_confidence_signals: 0,
    symbols_monitored: 0,
    total_digits_analyzed: 0,
    timestamp: new Date().toISOString()
  });

  // ML State
  const [mlStats, setMlStats] = useState<MLPerformanceStats>({
    ml_accuracy: 0,
    ml_precision: 0,
    ml_recall: 0,
    model_versions: {},
    training_samples: 0,
    prediction_latency: 0,
    last_trained: new Date().toISOString()
  });

  const [mlConfig, setMlConfig] = useState<MLConfig>({
    useML: true,
    onlineLearning: true,
    modelRefreshInterval: 10000,
    confidenceThreshold: 70,
    featureWindow: 50,
    trainingEnabled: true,
    mlWeight: 60, // NOVO: Peso do ML
    heuristicWeight: 40, // NOVO: Peso da Heurística
  });

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Trading Config State
  const [stake, setStake] = useState<number>(1);
  const stakeRef = React.useRef(stake);

  useEffect(() => {
    stakeRef.current = stake;
  }, [stake]);

  const [stopLoss, setStopLoss] = useState<number>(50);
  const [stopWin, setStopWin] = useState<number>(100);
  const [minConfidence, setMinConfidence] = useState<number>(70);
  const [ticksQuantity, setTicksQuantity] = useState<number>(50);
  const [exhaustionThreshold, setExhaustionThreshold] = useState<number>(5);
  const [absenceThreshold, setAbsenceThreshold] = useState<number>(15);
  const [exhaustionWindow, setExhaustionWindow] = useState<number>(20); // NOVO
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [account, setAccount] = useState<Account>({
    balance: 0,
    is_virtual: 0,
    broker: '',
  });

  // Complex Config State
  const [martingaleConfig, setMartingaleConfig] = useState<MartingaleConfig>({
    enabled: false,
    multiplier: 2.0,
    maxLevels: 3,
    resetOnWin: true,
    currentLevel: 0,
    currentStake: stake,
  });

  const [specificOperations, setSpecificOperations] =
    useState<SpecificOperations>({
      over: { enabled: false, digits: [2] },
      under: { enabled: false, digits: [8] },
      matches: { enabled: false, digit: 5 },
      differs: { enabled: false, digits: [5] },
    });



  useEffect(() => {
    const initML = async () => {
      try {
        // 1. Inicializar TensorFlow.js
        const tfReady = await MLInitializer.initialize();
        if (!tfReady) {
          console.warn('⚠️ TensorFlow.js não pôde ser inicializado. ML desativado.');
          setMlConfig(prev => ({ ...prev, useML: false }));
          return;
        }

        // 2. Verificar compatibilidade
        const compatibility = await MLInitializer.checkCompatibility();
        if (!compatibility.backendAvailable) {
          console.warn('⚠️ Backend não compatível. Usando modo fallback.');
        }

        // 3. Criar engine ML
        analysisEngineRef.current = new MLAnalysisEngine({
          minConfidence,
          exhaustionThreshold,
          absenceThreshold,
          ticksToAnalyze: ticksQuantity,
          specificOperations,
          mlConfig,
          exhaustionWindow, // ADICIONADO
        });

        // 4. Verificar e corrigir modelos
        setTimeout(async () => {
          if (analysisEngineRef.current) {
            await analysisEngineRef.current.verifyAndFixModels();
          }
        }, 2000);

      } catch (error) {
        console.error('❌ Erro na inicialização do ML:', error);
        setMlConfig(prev => ({ ...prev, useML: false }));
      }
    };

    if (mlConfig.useML) {
      initML();
    }
  }, [mlConfig.useML]); // Apenas quando mlConfig.useML mudar

  useEffect(() => {
    if (analysisEngineRef.current) {
      analysisEngineRef.current.updateConfig({
        minConfidence,
        exhaustionThreshold,
        absenceThreshold,
        ticksToAnalyze: ticksQuantity,
        specificOperations,
        mlConfig,
        exhaustionWindow, // NOVO
      });
    }
  }, [
    minConfidence,
    exhaustionThreshold,
    absenceThreshold,
    ticksQuantity,
    specificOperations,
    mlConfig,
    exhaustionWindow, // NOVO
  ]);

  // No useEffect principal
  useEffect(() => {
    // Backup automático a cada 24 horas
    const backupInterval = setInterval(async () => {
      if (analysisEngineRef.current && mlConfig.useML) {
        const lastBackup = localStorage.getItem('last_model_backup');
        const now = Date.now();

        if (!lastBackup || (now - parseInt(lastBackup)) > 24 * 60 * 60 * 1000) {
          console.log('🔄 Backup automático de modelos...');
          await analysisEngineRef.current.saveAllModels();
          localStorage.setItem('last_model_backup', now.toString());
        }
      }
    }, 60 * 60 * 1000); // Verifica a cada hora

    return () => clearInterval(backupInterval);
  }, [mlConfig.useML]);

  // Atualizar estatísticas ML periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (analysisEngineRef.current) {
        const stats = analysisEngineRef.current.getMLStats();
        setMlStats(stats);

        // Atualizar analysisData com stats ML
        setAnalysisData(prev => prev ? {
          ...prev,
          ml_stats: stats
        } : null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConnected) {
      // Subscribe to ticks for selected volatilities
      selectedVolatilities.forEach((symbol) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Unsubscribe previous if needed (omitted for simplicity, but good practice)
          wsRef.current.send(
            JSON.stringify({
              ticks_history: symbol,
              end: 'latest',
              style: 'ticks',
              count: ticksQuantity,
              subscribe: 1,
            }),
          );
        }
      });
    }
  }, [isConnected, selectedVolatilities]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Salvar modelos ML antes de sair
      if (analysisEngineRef.current) {
        analysisEngineRef.current.saveAllModels();
      }
    };
  }, []);

  // Adicione um botão para limpar modelos no UI:
  const handleClearModels = async () => {
    if (analysisEngineRef.current) {
      const confirmed = confirm('⚠️ Isso irá apagar todos os modelos ML treinados. Continuar?');
      if (confirmed) {
        await analysisEngineRef.current.clearOldModels();
        alert('✅ Modelos ML limpos com sucesso! Reinicie o bot.');
        window.location.reload();
      }
    }
  };

  // --- Methods ---
  const sendRequest = (msg: any) => {
    return new Promise((resolve, reject) => {
      const reqId = Date.now() + Math.floor(Math.random() * 1000);
      msg.req_id = reqId;
      pendingRequests.current[reqId] = resolve;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      } else {
        delete pendingRequests.current[reqId];
        reject('WebSocket not connected');
      }
    });
  };

  const connectToDeriv = () => {
    setIsLoading(true);
    try {
      if (wsRef.current) wsRef.current.close();

      const appId = process.env.NEXT_PUBLIC_APPID || '1089';
      const ws = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${appId}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Deriv (Direct)');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        if (apiToken) ws.send(JSON.stringify({ authorize: apiToken }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.req_id && pendingRequests.current[data.req_id]) {
            pendingRequests.current[data.req_id](data);
            delete pendingRequests.current[data.req_id];
            return;
          }

          if (data.msg_type === 'authorize') {
            if (data.error) {
              console.error('Authorization error:', data.error);
              alert('Authorization failed: ' + data.error.message);
              ws.close();
            } else {
              const account = data.authorize.account_list.find(
                (account: Account) => account.is_virtual === data.authorize.is_virtual
              );

              setAccount({
                balance: data?.authorize?.balance || 0,
                is_virtual: account?.is_virtual || 0,
                broker: account?.broker || '',
              });
            }
          } else if (data.msg_type === 'history') {
            const symbol = data.echo_req.ticks_history;
            const prices = data.history.prices;
            const times = data.history.times;
            prices.forEach((price: number, index: number) => {
              const digitVal = getDigitForPrice(symbol, price);

              if (!isNaN(digitVal) && analysisEngineRef.current) {
                const analysis = analysisEngineRef.current.addTick(symbol, digitVal, price, times[index]);
                updateAnalysisData(symbol, analysis);
              }
            });
          } else if (data.msg_type === 'tick') {
            const tick = data.tick;
            const digit = getQuotePrecision(tick);
            const price = tick.quote;
            const symbol = tick.symbol;

            if (!isNaN(digit) && analysisEngineRef.current) {
              const analysis = analysisEngineRef.current.addTick(symbol, digit, price, tick.epoch);
              updateAnalysisData(symbol, analysis);
            }
          } else if (data.msg_type === 'proposal_open_contract') {
            const contract = data.proposal_open_contract;
            if (contract.is_sold) {
              const profit = contract.profit;
              const isWin = profit > 0;

              // Update Martingale
              setMartingaleConfig(prev => {
                if (!prev.enabled) {
                  return prev;
                }

                let newLevel = prev.currentLevel;
                let newStake = prev.currentStake;

                if (isWin) {
                  if (prev.resetOnWin) {
                    newLevel = 0;
                    newStake = stakeRef.current;
                  }
                } else {
                  if (prev.currentLevel < prev.maxLevels) {
                    newLevel = prev.currentLevel + 1;
                    newStake = prev.currentStake * prev.multiplier;
                  } else {
                    newLevel = 0;
                    newStake = stakeRef.current;
                  }
                }

                return {
                  ...prev,
                  currentLevel: newLevel,
                  currentStake: newStake
                };
              });

              setResultsList((prev) => [
                ...prev,
                {
                  time: moment().format('HH:mm:ss'),
                  symbol: contract.underlying,
                  type: contract.contract_type,
                  target: contract.barrier ?? '-',
                  exit: contract.exit_tick_display_value,
                  stake: contract.buy_price,
                  status: isWin ? 'Won' : 'Lost',
                  profit: profit,
                },
              ]);

              isTradingRef.current = false; // Allow next trade
            }
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Deriv WebSocket disconnected');
        setIsConnected(false);
        if (isConnected) {
          attemptReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('Deriv WebSocket error:', error);
      };
    } catch (error) {
      console.error('Connection creation error:', error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getDigitForPrice = (symbol, tick) => {
    return parseInt(
      tick.toFixed(
        symbol == "R_100"
          ? 2
          : symbol == "R_25" || symbol == "R_10"
            ? 3
            : symbol == "RDBEAR" || symbol == "RDBULL"
              ? 4
              : symbol.startsWith("JD")
                ? 2
                : symbol.includes("1HZ")
                  ? 2
                  : 4
      ).toString()
        .slice(-1)
    );
  }


  const getDigit = (tick) => {
    return tick.quote.toFixed(
      tick.symbol == "R_100"
        ? 2
        : tick.symbol == "R_25" || tick.symbol == "R_10"
          ? 3
          : tick.symbol == "RDBEAR" || tick.symbol == "RDBULL"
            ? 4
            : tick.symbol.startsWith("JD")
              ? 2
              : tick.symbol.includes("1HZ")
                ? 2
                : 4
    )
      .toString()


  }

  const getQuotePrecision = (tick) => {
    return parseInt(
      tick.quote.toFixed(
        tick.symbol == "R_100"
          ? 2
          : tick.symbol == "R_25" || tick.symbol == "R_10"
            ? 3
            : tick.symbol == "RDBEAR" || tick.symbol == "RDBULL"
              ? 4
              : tick.symbol.startsWith("JD")
                ? 2
                : tick.symbol.includes("1HZ")
                  ? 2
                  : 4
      )
        .toString()
        .slice(-1)
    );
  }

  const updateAnalysisData = (symbol: string, analysis: any) => {
    setAnalysisData(prev => {
      const newAnalyses = { ...prev?.analyses, [symbol]: analysis };

      // Generate signals with ML
      const signals = analysisEngineRef.current?.generateSignals(newAnalyses) || [];

      // Update Performance Stats
      setPerformance(prevPerf => ({
        ...prevPerf,
        total_signals: prevPerf.total_signals + signals.length,
        high_confidence_signals: prevPerf.high_confidence_signals +
          signals.filter(s => s.assertiveness === 'HIGH' || s.assertiveness === 'VERY HIGH').length,
        medium_confidence_signals: prevPerf.medium_confidence_signals +
          signals.filter(s => s.assertiveness === 'MEDIUM').length,
        symbols_monitored: Object.keys(newAnalyses).length,
        total_digits_analyzed: prevPerf.total_digits_analyzed + 1,
        timestamp: new Date().toISOString()
      }));

      // Update best signal
      if (signals.length > 0) {
        setBestSignal(signals[0]);
      }

      return {
        analyses: newAnalyses,
        signals: signals,
        market_quality: prev?.market_quality || {},
        should_trade: signals.length > 0,
        timestamp: new Date().toISOString(),
        ml_stats: mlStats
      };
    });
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    reconnectAttemptsRef.current++;
    setTimeout(() => connectToDeriv(), reconnectDelay);
  };

  const executeTrade = async (signal: TradingSignal) => {
    if (isTradingRef.current) return;

    console.log('Executing trade:', signal);
    isTradingRef.current = true;

    try {
      // 1. Proposal
      const payload = {
        buy: 1,
        price: martingaleConfig.currentStake,
        parameters: {
          amount: martingaleConfig.currentStake,
          basis: 'stake',
          contract_type: signal.type,
          currency: 'USD',
          duration: 1,
          duration_unit: 't',
          symbol: signal.symbol,
          ...(signal.barrier !== undefined && { barrier: String(signal.barrier) }),
        }
      };

      const buyResp: any = await sendRequest(payload);

      if (buyResp.error) {
        console.error('Buy Error:', buyResp.error);
        isTradingRef.current = false;
        return;
      }

      // 3. Monitor Result
      const contractId = buyResp.buy.contract_id;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            subscribe: 1,
            proposal_open_contract: 1,
            contract_id: contractId,
          }),
        );
      }
    } catch (error) {
      console.error('Trade Execution Error:', error);
      isTradingRef.current = false;
    }
  };

  useEffect(() => {
    if (mode === 'auto' && bestSignal && !isTradingRef.current && isConnected) {
      executeTrade(bestSignal);
    }
  }, [mode, bestSignal, isConnected]);

  const handleConnect = async () => {
    if (!apiToken) {
      alert('Please enter your API token');
      return;
    }
    connectToDeriv();
  };

  const handleDisconnect = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);

    // Salvar modelos ML ao desconectar
    if (analysisEngineRef.current) {
      await analysisEngineRef.current.saveAllModels();
    }
  };

  const updateConfig = async (newConfig: any) => {
    console.log("Config updated:", newConfig);
    alert('Configuration updated successfully');
  };

  const toggleVolatility = (symbol: string) => {
    setSelectedVolatilities((prev) => {
      if (symbol.toLowerCase() === 'all') {
        return Array.from(
          new Set(
            VOLATILITIES.filter((v) => v.symbol.toLowerCase() !== 'all').map(
              (v) => v.symbol,
            ),
          ),
        );
      }

      if (prev.includes(symbol)) {
        return prev.filter((s) => s !== symbol);
      } else {
        return [...prev, symbol];
      }
    });
  };

  const handleTrainModels = async () => {
    if (analysisEngineRef.current) {
      // Forçar treinamento com dados coletados
      await analysisEngineRef.current.saveAllModels();
      alert('Modelos ML treinados e salvos!');
    }
  };

  const handleSaveModels = async () => {
    if (!analysisEngineRef.current) return;
    await analysisEngineRef.current.saveAllModels();
  };

  const handleLoadModels = async () => {
    if (!analysisEngineRef.current) return;
    await analysisEngineRef.current.loadModelsFromStorage();
    await analysisEngineRef.current.verifyAndFixModels();
  };

  const toggleML = (useML: boolean) => {
    setMlConfig(prev => ({ ...prev, useML }));

    if (!useML) {
      alert('ML desativado. Usando apenas análise heurística.');
    } else {
      alert('ML ativado. Sistema usando predições de machine learning.');
    }
  };

  // --- Render ---
  return (
    <div className='min-h-screen body p-6'>
      <div className='w-full mx-auto'>
        <ConnectionStatus
          isConnected={isConnected}
          isLoading={isLoading}
          apiToken={apiToken}
          setApiToken={setApiToken}
          handleConnect={handleConnect}
          handleDisconnect={handleDisconnect}
          account={account}
        />

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column - Signals and Analysis */}
          <div className='lg:col-span-2 space-y-6'>
            <SignalsPanel
              bestSignal={bestSignal}
              analysisData={analysisData}
            />

            {/* ML Analysis Panel */}
            {mlConfig.useML && (
              <MLAnalysisPanel
                analysisData={analysisData}
                mlStats={mlStats}
                onTrainModels={handleTrainModels}
                onHandleClearModels={handleClearModels}
              />
            )}

            {/* Tab Navigation */}
            <div className='mt-6 bg-principal rounded-xl shadow-sm border border-gray-200'>
              <div className='border-b border-gray-200'>
                <nav className='flex space-x-8 px-6'>
                  {[
                    {
                      id: 'dashboard',
                      label: 'Dashboard',
                      icon: Activity,
                    },
                    {
                      id: 'analysis',
                      label: 'Análise Completa',
                      icon: BarChart3,
                    },
                    {
                      id: 'ml_analysis',
                      label: 'Análise ML',
                      icon: Brain,
                    },
                    {
                      id: 'signals',
                      label: 'Sinais',
                      icon: Target,
                    },
                    {
                      id: 'config',
                      label: 'Configurações',
                      icon: Settings,
                    },
                    {
                      id: 'results',
                      label: 'Resultados',
                      icon: CheckCircle,
                    }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className='p-6'>
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'analysis' && (
                  <AnalysisTab analysisData={analysisData} />
                )}
                {activeTab === 'ml_analysis' && mlConfig.useML && (
                  <div>
                    <h3 className='text-lg font-semibold mb-4'>
                      🤖 Análise de Machine Learning
                    </h3>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='bg-gray-800 p-4 rounded-lg'>
                        <h4 className='font-medium mb-2'>Estatísticas ML</h4>
                        <div className='space-y-2'>
                          <div className='flex justify-between'>
                            <span>Acurácia:</span>
                            <span className={`font-medium ${mlStats.ml_accuracy > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                              {mlStats.ml_accuracy.toFixed(2)}%
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Amostras Treinadas:</span>
                            <span className='font-medium'>{mlStats.training_samples}</span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Latência:</span>
                            <span className='font-medium'>{mlStats.prediction_latency.toFixed(2)}ms</span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Último Treino:</span>
                            <span className='font-medium'>
                              {moment(mlStats.last_trained).format('HH:mm:ss')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='bg-gray-800 p-4 rounded-lg'>
                        <h4 className='font-medium mb-2'>Configurações Ativas</h4>
                        <div className='space-y-2'>
                          <div className='flex justify-between'>
                            <span>ML Ativo:</span>
                            <span className={`font-medium ${mlConfig.useML ? 'text-green-500' : 'text-red-500'}`}>
                              {mlConfig.useML ? 'SIM' : 'NÃO'}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Aprendizado Online:</span>
                            <span className={`font-medium ${mlConfig.onlineLearning ? 'text-green-500' : 'text-yellow-500'}`}>
                              {mlConfig.onlineLearning ? 'ATIVO' : 'INATIVO'}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Limite Confiança:</span>
                            <span className='font-medium'>{mlConfig.confidenceThreshold}%</span>
                          </div>
                          <button
                            onClick={handleTrainModels}
                            className='w-full mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium'
                          >
                            Treinar Modelos Agora
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'signals' && (
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                      Sinais de Trading
                    </h3>
                    <p className='text-gray-600'>
                      Sinais gerados com base na análise estatística e ML.
                    </p>
                    {mlConfig.useML && (
                      <div className='mt-4 p-3 bg-purple-900/20 rounded-lg'>
                        <div className='flex items-center gap-2'>
                          <Brain size={16} className='text-purple-400' />
                          <span className='text-sm'>
                            ML ativo - {mlStats.training_samples.toLocaleString()} amostras treinadas
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'config' && (
                  <ConfigTab
                    selectedVolatilities={selectedVolatilities}
                    toggleVolatility={toggleVolatility}
                    volatilityData={volatilityData}
                    specificOperations={specificOperations}
                    setSpecificOperations={setSpecificOperations}
                    stake={stake}
                    setStake={setStake}
                    stopLoss={stopLoss}
                    setStopLoss={setStopLoss}
                    stopWin={stopWin}
                    setStopWin={setStopWin}
                    ticksQuantity={ticksQuantity}
                    setTicksQuantity={setTicksQuantity}
                    minConfidence={minConfidence}
                    setMinConfidence={setMinConfidence}
                    exhaustionThreshold={exhaustionThreshold}
                    setExhaustionThreshold={setExhaustionThreshold}
                    absenceThreshold={absenceThreshold}
                    setAbsenceThreshold={setAbsenceThreshold}
                    martingaleConfig={martingaleConfig}
                    setMartingaleConfig={setMartingaleConfig}
                    mlConfig={mlConfig}
                    setMlConfig={setMlConfig}
                    exhaustionWindow={exhaustionWindow}
                    setExhaustionWindow={setExhaustionWindow}
                  />
                )}
                {activeTab === 'results' && (
                  <ResultsTab resultsList={resultsList} />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Market Quality and Stats */}
          <div className='space-y-6'>
            <OperationMode
              mode={mode}
              setMode={setMode}
              onToggleML={toggleML}
              mlEnabled={mlConfig.useML}
            />
            <PerformanceStats
              performance={performance}
              mlStats={mlStats}
            />
            <GlobalConfigPanel
              config={config}
              updateConfig={updateConfig}
            />
            {mlConfig.useML && (
              <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4'>
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    onClick={async () => {
                      try {
                        await handleSaveModels();
                        alert('✅ Modelo(s) salvo(s) no navegador (IndexedDB)');
                      } catch (error: any) {
                        alert('❌ Erro ao salvar: ' + (error?.message || String(error)));
                      }
                    }}
                    className='flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium'
                  >
                    <Save size={16} />
                    Salvar Modelo
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await handleLoadModels();
                        alert('✅ Modelo(s) carregado(s) do navegador (IndexedDB)');
                      } catch (error: any) {
                        alert('❌ Erro ao carregar: ' + (error?.message || String(error)));
                      }
                    }}
                    className='flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium'
                  >
                    <Upload size={16} />
                    Carregar Modelo
                  </button>
                </div>
              </div>
            )}
            <MLConfigPanel
              mlConfig={mlConfig}
              updateMLConfig={setMlConfig}
              onSaveModels={handleSaveModels}
              onLoadModels={handleLoadModels}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
