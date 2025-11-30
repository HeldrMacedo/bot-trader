"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Settings,
  Play,
  Pause,
  BarChart3,
  Brain,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import derivApiClient, {
  TradingSignal,
  MarketQuality,
} from "@/lib/deriv-api-client";
import useDerivWebSocket from "@/lib/use-deriv-websocket";

// Define types based on the API response
type SymbolAnalysis = {
  timestamp: string;
  distribution: any;
  exhaustion: any[];
  absence: any[];
  trends: any;
  sequences: any[];
  probabilities: any;
  market_quality: MarketQuality;
  current_digit: number | null;
};

type AnalysisData = {
  analyses: Record<string, SymbolAnalysis>;
  signals: TradingSignal[];
  market_quality: Record<string, MarketQuality>;
  should_trade: boolean;
  timestamp: string;
};

interface SpecificOperations {
  over: {
    enabled: boolean;
    digits: number[];
  };
  under: {
    enabled: boolean;
    digits: number[];
  };
  matches: {
    enabled: boolean;
    digit: number;
  };
  differs: {
    enabled: boolean;
    digits: number[];
  };
}

const DerivAnalyzerDashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [bestSignal, setBestSignal] = useState<TradingSignal | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [specificOperations, setSpecificOperations] =
    useState<SpecificOperations>({
      over: {
        enabled: false,
        digits: [0, 1, 2, 3, 4],
      },
      under: {
        enabled: false,
        digits: [7, 8, 9],
      },
      matches: {
        enabled: false,
        digit: 5,
      },
      differs: {
        enabled: false,
        digits: [0, 5, 9],
      },
    });
  // Use the WebSocket hook for real-time updates
  const {
    isConnected: isWsConnected,
    isConnecting: isWsConnecting,
    analysis: wsAnalysis,
    lastUpdate,
    error: wsError,
    reconnect,
  } = useDerivWebSocket();

  // Update local state when WebSocket receives new data
  useEffect(() => {
    console.log("Received WebSocket analysis:", wsAnalysis);
    if (wsAnalysis) {
      setAnalysisData(wsAnalysis);

      // Find the best signal
      if (wsAnalysis.signals && wsAnalysis.signals.length > 0) {
        setBestSignal(wsAnalysis.signals[0]);
      }
    }
  }, [wsAnalysis]);

  // Load initial data when connected
  useEffect(() => {
    if (isConnected) {
      loadInitialData();
    }
  }, [isConnected]);

  const loadInitialData = async () => {
    try {
      const [configRes, perfRes] = await Promise.all([
        derivApiClient.getConfig(),
        derivApiClient.getPerformance(),
      ]);

      setConfig(configRes.config);
      setPerformance(perfRes);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  const handleConnect = async () => {
    if (!apiToken) {
      alert("Please enter your API token");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Attempting to connect with token:", apiToken);
      const response = await derivApiClient.connect({ api_token: apiToken });
      console.log("Connection response:", response);
      setIsConnected(true);
    } catch (error) {
      console.error("Connection error:", error);
      alert("Failed to connect: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await derivApiClient.disconnect();
      setIsConnected(false);
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  const updateConfig = async (newConfig: any) => {
    try {
      const response = await derivApiClient.updateConfig(newConfig);
      setConfig(response.config);
      alert("Configuration updated successfully");
    } catch (error) {
      console.error("Config update error:", error);
      alert("Failed to update configuration: " + (error as Error).message);
    }
  };

  const getSignalColor = (assertiveness: string) => {
    switch (assertiveness) {
      case "HIGH":
        return "text-green-500 bg-green-500/10";
      case "MEDIUM":
        return "text-yellow-500 bg-yellow-500/10";
      case "LOW":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getSignalBg = (assertiveness: string) => {
    switch (assertiveness) {
      case "HIGH":
        return "bg-green-500/20 border-green-500/30";
      case "MEDIUM":
        return "bg-yellow-500/20 border-yellow-500/30";
      case "LOW":
        return "bg-red-500/20 border-red-500/30";
      default:
        return "bg-gray-500/20 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="text-blue-600" size={32} />
            Deriv Real-Time Analyzer
          </h1>
          <p className="text-gray-600 mt-2">
            Advanced system for analyzing Deriv tickets with real-time
            predictions and trading signals
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isWsConnected ? (
                  <Wifi className="text-green-500" size={20} />
                ) : isWsConnecting ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <WifiOff className="text-red-500" size={20} />
                )}
                <span
                  className={`font-medium ${isWsConnected ? "text-green-600" : isWsConnecting ? "text-blue-600" : "text-red-600"}`}
                >
                  {isWsConnected
                    ? "Connected"
                    : isWsConnecting
                      ? "Connecting..."
                      : "Disconnected"}
                </span>
              </div>

              {wsError && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={16} />
                  <span>{wsError}</span>
                </div>
              )}

              {lastUpdate && (
                <div className="text-sm text-gray-500">
                  Last update: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!isConnected ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Enter API Token"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Play size={16} />
                    )}
                    Connect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Pause size={16} />
                  Disconnect
                </button>
              )}

              <button
                onClick={reconnect}
                disabled={isWsConnecting}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Zap size={16} />
                Reconnect
              </button>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Signals and Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Best Signal Card */}
            {bestSignal && (
              <div
                className={`bg-white rounded-xl shadow-sm border p-6 ${getSignalBg(bestSignal.assertiveness)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      🎯 MELHOR ENTRADA
                    </h3>
                    <p className="text-gray-600">Based on real-time analysis</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(bestSignal.assertiveness)}`}
                  >
                    {bestSignal.assertiveness} CONFIDENCE
                  </span>
                </div>

                <div className="space-y-3 text-gray-900">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estratégia:</span>
                    <span className="text-blue-600 font-semibold">
                      {bestSignal.type}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-medium">Ativo:</span>
                    <span className="text-gray-900">{bestSignal.symbol}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-medium">Confiança:</span>
                    <span className="text-gray-900 font-semibold">
                      {bestSignal.confidence.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-medium">Lucro Esperado:</span>
                    <span
                      className={`font-semibold ${bestSignal.expected_profit > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {bestSignal.expected_profit > 0 ? "+" : ""}
                      {bestSignal.expected_profit.toFixed(4)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Gatilhos Detectados:
                    </h4>
                    <ul className="space-y-1">
                      {bestSignal.reasons.map((reason, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-700 flex items-start gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* All Signals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📊 Todas as Sugestões
                </h3>
                <span className="text-sm text-gray-500">
                  {analysisData?.signals.length || 0} sinais encontrados
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(analysisData?.signals || []).map((signal, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getSignalBg(signal.assertiveness)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {signal.type}
                        </h4>
                        <p className="text-sm text-gray-600">{signal.symbol}</p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(signal.assertiveness)}`}
                        >
                          {signal.confidence.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {signal.assertiveness}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700">
                      {signal.reasons.slice(0, 2).map((reason, i) => (
                        <div key={i} className="flex items-start gap-2 mt-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          {reason}
                        </div>
                      ))}
                      {signal.reasons.length > 2 && (
                        <div className="text-xs text-gray-500 mt-1">
                          +{signal.reasons.length - 2} more triggers...
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(!analysisData || analysisData.signals.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhuma sugestão disponível no momento</p>
                    <p className="text-sm">
                      Aguardando condições favoráveis de mercado
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: "dashboard", label: "Dashboard", icon: Activity },
                    {
                      id: "analysis",
                      label: "Análise Completa",
                      icon: BarChart3,
                    },
                    { id: "signals", label: "Sinais", icon: Target },
                    { id: "config", label: "Configurações", icon: Settings },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === "dashboard" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Visão Geral
                    </h3>
                    <p className="text-gray-600">
                      Seu painel de análise em tempo real para operações na
                      Deriv.
                    </p>
                  </div>
                )}

                {activeTab === "analysis" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Análise Detalhada
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysisData &&
                        Object.entries(analysisData.analyses).map(
                          ([symbol, analysis]) => (
                            <div
                              key={symbol}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <h4 className="font-medium text-gray-900 mb-2">
                                {symbol}
                              </h4>
                              <div className="text-sm space-y-1 text-gray-900">
                                <div>
                                  Dígito Atual:{" "}
                                  <span className="font-medium">
                                    {analysis.current_digit}
                                  </span>
                                </div>
                                <div>
                                  Tendência:{" "}
                                  <span className="font-medium">
                                    {analysis.trends.trend}
                                  </span>
                                </div>
                                <div>
                                  Exaustão:{" "}
                                  <span className="font-medium">
                                    {analysis.exhaustion.length}
                                  </span>{" "}
                                  dígitos
                                </div>
                                <div>
                                  Ausência:{" "}
                                  <span className="font-medium">
                                    {analysis.absence.length}
                                  </span>{" "}
                                  dígitos
                                </div>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                )}

                {activeTab === "signals" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Sinais de Trading
                    </h3>
                    <p className="text-gray-600">
                      Sinais gerados com base na análise estatística.
                    </p>
                  </div>
                )}

                {activeTab === "config" && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Target className="text-purple-400" />
                      <span className="text-gray-900">
                        Operações Customizáveis
                      </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-emerald-900/30 border border-emerald-500/40 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={specificOperations.over.enabled}
                            onChange={(e) =>
                              setSpecificOperations((prev) => ({
                                ...prev,
                                over: {
                                  ...prev.over,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="w-5 h-5 rounded"
                          />
                          <span className="font-bold text-emerald-300">
                            OVER Específico
                          </span>
                        </label>
                        <p className="text-xs text-gray-300 mb-3">
                          Selecione os dígitos que você quer operar OVER (maior
                          que):
                        </p>

                        <div className="grid grid-cols-5 gap-2">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((digit) => (
                            <button
                              key={digit}
                              onClick={() => {
                                setSpecificOperations((prev) => {
                                  const newDigits = prev.over.digits.includes(
                                    digit
                                  )
                                    ? prev.over.digits.filter(
                                        (d) => d !== digit
                                      )
                                    : [...prev.over.digits, digit].sort(
                                        (a, b) => a - b
                                      );
                                  return {
                                    ...prev,
                                    over: { ...prev.over, digits: newDigits },
                                  };
                                });
                              }}
                              disabled={!specificOperations.over.enabled}
                              className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                specificOperations.over.digits.includes(digit)
                                  ? "bg-emerald-600 text-white scale-110"
                                  : "bg-white/10 hover:bg-white/20"
                              } ${!specificOperations.over.enabled ? "opacity-30 cursor-not-allowed" : ""}`}
                            >
                              {digit}
                            </button>
                          ))}
                        </div>
                        {specificOperations.over.enabled &&
                          specificOperations.over.digits.length > 0 && (
                            <p className="text-xs text-emerald-300 mt-3">
                              Opera quando dígito for{" "}
                              <strong>
                                &gt;{" "}
                                {Math.max(...specificOperations.over.digits)}
                              </strong>
                            </p>
                          )}
                      </div>

                      {/* UNDER Customizável */}
                      <div className="bg-sky-900/30 border border-sky-500/40 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={specificOperations.under.enabled}
                            onChange={(e) =>
                              setSpecificOperations((prev) => ({
                                ...prev,
                                under: {
                                  ...prev.under,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="w-5 h-5 rounded"
                          />
                          <span className="font-bold text-sky-300">
                            UNDER Específico
                          </span>
                        </label>

                        <p className="text-xs text-gray-300 mb-3">
                          Selecione os dígitos que você quer operar UNDER (menor
                          que):
                        </p>

                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                            <button
                              key={digit}
                              onClick={() => {
                                setSpecificOperations((prev) => {
                                  const newDigits = prev.under.digits.includes(
                                    digit
                                  )
                                    ? prev.under.digits.filter(
                                        (d) => d !== digit
                                      )
                                    : [...prev.under.digits, digit].sort(
                                        (a, b) => a - b
                                      );
                                  return {
                                    ...prev,
                                    under: { ...prev.under, digits: newDigits },
                                  };
                                });
                              }}
                              disabled={!specificOperations.under.enabled}
                              className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                specificOperations.under.digits.includes(digit)
                                  ? "bg-sky-600 text-white scale-110"
                                  : "bg-white/10 hover:bg-white/20"
                              } ${!specificOperations.under.enabled ? "opacity-30 cursor-not-allowed" : ""}`}
                            >
                              {digit}
                            </button>
                          ))}
                        </div>

                        {specificOperations.under.enabled &&
                          specificOperations.under.digits.length > 0 && (
                            <p className="text-xs text-sky-300 mt-3">
                              Opera quando dígito for{" "}
                              <strong>
                                &lt;{" "}
                                {Math.min(...specificOperations.under.digits)}
                              </strong>
                            </p>
                          )}
                      </div>

                      {/* MATCHES Customizável */}
                      <div className="bg-pink-900/30 border border-pink-500/40 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={specificOperations.matches.enabled}
                            onChange={(e) =>
                              setSpecificOperations((prev) => ({
                                ...prev,
                                matches: {
                                  ...prev.matches,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="w-5 h-5 rounded"
                          />
                          <span className="font-bold text-pink-300">
                            MATCHES Específico
                          </span>
                        </label>

                        <p className="text-xs text-gray-300 mb-3">
                          Selecione o dígito que você quer que APAREÇA:
                        </p>

                        <div className="grid grid-cols-5 gap-2">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                            <button
                              key={digit}
                              onClick={() => {
                                setSpecificOperations((prev) => ({
                                  ...prev,
                                  matches: { ...prev.matches, digit },
                                }));
                              }}
                              disabled={!specificOperations.matches.enabled}
                              className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                specificOperations.matches.digit === digit
                                  ? "bg-pink-600 text-white scale-110"
                                  : "bg-white/10 hover:bg-white/20"
                              } ${!specificOperations.matches.enabled ? "opacity-30 cursor-not-allowed" : ""}`}
                            >
                              {digit}
                            </button>
                          ))}
                        </div>

                        {specificOperations.matches.enabled && (
                          <p className="text-xs text-pink-300 mt-3">
                            Opera quando dígito for{" "}
                            <strong>
                              = {specificOperations.matches.digit}
                            </strong>
                          </p>
                        )}
                      </div>

                      {/* DIFFERS Customizável */}
                      <div className="bg-violet-900/30 border border-violet-500/40 rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={specificOperations.differs.enabled}
                            onChange={(e) =>
                              setSpecificOperations((prev) => ({
                                ...prev,
                                differs: {
                                  ...prev.differs,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="w-5 h-5 rounded"
                          />
                          <span className="font-bold text-violet-300">
                            DIFFERS Customizável
                          </span>
                        </label>

                        <p className="text-xs text-gray-300 mb-3">
                          Selecione os dígitos que você quer EVITAR:
                        </p>

                        <div className="grid grid-cols-5 gap-2">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                            <button
                              key={digit}
                              onClick={() => {
                                setSpecificOperations((prev) => {
                                  const newDigits =
                                    prev.differs.digits.includes(digit)
                                      ? prev.differs.digits.filter(
                                          (d) => d !== digit
                                        )
                                      : [...prev.differs.digits, digit].sort(
                                          (a, b) => a - b
                                        );
                                  return {
                                    ...prev,
                                    differs: {
                                      ...prev.differs,
                                      digits: newDigits,
                                    },
                                  };
                                });
                              }}
                              disabled={!specificOperations.differs.enabled}
                              className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                specificOperations.differs.digits.includes(
                                  digit
                                )
                                  ? "bg-violet-600 text-white scale-110"
                                  : "bg-white/10 hover:bg-white/20"
                              } ${!specificOperations.differs.enabled ? "opacity-30 cursor-not-allowed" : ""}`}
                            >
                              {digit}
                            </button>
                          ))}
                        </div>

                        {specificOperations.differs.enabled &&
                          specificOperations.differs.digits.length > 0 && (
                            <p className="text-xs text-violet-300 mt-3">
                              Opera quando dígito for{" "}
                              <strong>
                                ≠ {specificOperations.differs.digits.join(", ")}
                              </strong>
                            </p>
                          )}
                      </div>
                    </div>

                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 mt-4">
                                <TrendingUp className="text-orange-400" />
                                <span className="text-gray-900">Sistema de Martingale</span>
                              </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={martingaleConfig.enabled}
                  onChange={(e) => {
                    setMartingaleConfig(prev => ({
                      ...prev,
                      enabled: e.target.checked,
                      currentLevel: 0,
                      currentStake: stake
                    }));
                  }}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold">Ativar Martingale</span>
              </label>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">
                    Multiplicador: <strong>{martingaleConfig.multiplier.toFixed(1)}x</strong>
                  </label>
                  <input
                    type="range"
                    min="1.5"
                    max="3"
                    step="0.1"
                    value={martingaleConfig.multiplier}
                    onChange={(e) => setMartingaleConfig(prev => ({
                      ...prev,
                      multiplier: parseFloat(e.target.value)
                    }))}
                    disabled={!martingaleConfig.enabled}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Após LOSS, stake será multiplicado por {martingaleConfig.multiplier.toFixed(1)}x
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    Níveis Máximos: <strong>{martingaleConfig.maxLevels}</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={martingaleConfig.maxLevels}
                    onChange={(e) => setMartingaleConfig(prev => ({
                      ...prev,
                      maxLevels: parseInt(e.target.value)
                    }))}
                    disabled={!martingaleConfig.enabled}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Máximo de {martingaleConfig.maxLevels} martingale(s) consecutivos
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={martingaleConfig.resetOnWin}
                    onChange={(e) => setMartingaleConfig(prev => ({
                      ...prev,
                      resetOnWin: e.target.checked
                    }))}
                    disabled={!martingaleConfig.enabled}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">Resetar stake ao vencer</span>
                </label>
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/40 rounded-lg p-4">
              <h3 className="font-bold mb-3 text-orange-300">⚠️ Simulação de Martingale</h3>
              
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">Stake inicial: <strong>${stake.toFixed(2)}</strong></p>
                
                {martingaleConfig.enabled && (
                  <>
                    <div className="border-t border-orange-500/30 pt-2 mt-2">
                      <p className="text-xs text-gray-400 mb-2">Progressão após LOSSes:</p>
                      {[...Array(martingaleConfig.maxLevels + 1)].map((_, level) => {
                        const levelStake = stake * Math.pow(martingaleConfig.multiplier, level);
                        const totalRisk = stake * (Math.pow(martingaleConfig.multiplier, level + 1) - 1) / (martingaleConfig.multiplier - 1);
                        
                        return (
                          <div key={level} className={`flex justify-between py-1 ${
                            level === martingaleConfig.currentLevel ? 'bg-orange-600/30 px-2 rounded' : ''
                          }`}>
                            <span className="text-xs">
                              {level === 0 ? 'Inicial' : `Nível ${level}`}:
                            </span>
                            <span className="font-bold">
                              ${levelStake.toFixed(2)}
                              {level > 0 && (
                                <span className="text-xs text-red-300 ml-2">
                                  (Risco: ${totalRisk.toFixed(2)})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-orange-500/30 pt-2 mt-3">
                      <p className="text-xs font-bold text-orange-300">
                        Nível Atual: {martingaleConfig.currentLevel}/{martingaleConfig.maxLevels}
                      </p>
                      <p className="text-xs font-bold text-orange-300">
                        Stake Atual: ${martingaleConfig.currentStake.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}

                {!martingaleConfig.enabled && (
                  <p className="text-xs text-gray-400 italic">
                    Ative o Martingale para ver a progressão
                  </p>
                )}
              </div>
            </div>
          </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Market Quality and Stats */}
          <div className="space-y-6">
            {/* Market Quality */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📈 Qualidade do Mercado
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Recomendação:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      analysisData?.should_trade
                        ? "text-green-800 bg-green-100"
                        : "text-red-800 bg-red-100"
                    }`}
                  >
                    {analysisData?.should_trade ? "🟢 PLAY" : "🔴 STOP"}
                  </span>
                </div>

                {analysisData &&
                  Object.entries(analysisData.market_quality).map(
                    ([symbol, quality]) => (
                      <div key={symbol} className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{symbol}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              quality.should_trade
                                ? "text-green-800 bg-green-100"
                                : "text-red-800 bg-red-100"
                            }`}
                          >
                            {quality.quality_score.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {quality.reasons.slice(0, 2).join(", ")}
                          {quality.reasons.length > 2 && "..."}
                        </div>
                      </div>
                    )
                  )}
              </div>
            </div>

            {/* Performance Stats */}
            {performance && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📊 Estatísticas
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Símbolos Monitorados:</span>
                    <span className="font-medium">
                      {performance.symbols_monitored}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Dígitos:</span>
                    <span className="font-medium">
                      {performance.total_digits_analyzed}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Sinais Gerados:</span>
                    <span className="font-medium">
                      {performance.total_signals}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Alta Confiança:</span>
                    <span className="font-medium text-green-600">
                      {performance.high_confidence_signals}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Média Confiança:</span>
                    <span className="font-medium text-yellow-600">
                      {performance.medium_confidence_signals}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Panel */}
            {config && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings size={20} />
                  Configurações
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limiar de Exaustão
                    </label>
                    <input
                      type="number"
                      value={config.exhaustion_threshold}
                      onChange={(e) =>
                        updateConfig({
                          exhaustion_threshold: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limiar de Ausência
                    </label>
                    <input
                      type="number"
                      value={config.absence_threshold}
                      onChange={(e) =>
                        updateConfig({
                          absence_threshold: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confiança Mínima
                    </label>
                    <input
                      type="number"
                      value={config.min_confidence}
                      onChange={(e) =>
                        updateConfig({
                          min_confidence: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Over 2
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.over2_enabled}
                        onChange={(e) =>
                          updateConfig({ over2_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Under 7
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.under7_enabled}
                        onChange={(e) =>
                          updateConfig({ under7_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Differs
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.differs_enabled}
                        onChange={(e) =>
                          updateConfig({ differs_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DerivAnalyzerDashboard;
