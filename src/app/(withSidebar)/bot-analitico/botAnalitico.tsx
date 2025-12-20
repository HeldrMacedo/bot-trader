'use client';
import { Activity, BarChart3, CheckCircle, Settings, Target } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// Types
import {
	AnalysisData,
	MartingaleConfig,
	SpecificOperations,
	TradingSignal,
	VolatilityData,
	VOLATILITIES,
	Account,
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

import ResultsTab from './components/ResultsTab';
import { AnalysisEngine } from './lib/analysis-engine';
import { config } from 'process';
import moment from 'moment';


export default function DerivAnalyzerDashboard() {
	// Connection State
	const [isConnected, setIsConnected] = useState(false);
	const [apiToken, setApiToken] = useState('ehOXyajRlX3TdOu');
	const [isLoading, setIsLoading] = useState(false);
	const wsRef = React.useRef<WebSocket | null>(null);
	const reconnectAttemptsRef = React.useRef(0);
	const analysisEngineRef = React.useRef<AnalysisEngine | null>(null);
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

	// --- Effects ---
	useEffect(() => {
		analysisEngineRef.current = new AnalysisEngine({
			minConfidence,
			exhaustionThreshold,
			absenceThreshold,
			ticksToAnalyze: ticksQuantity,
			specificOperations,
		});
	}, []);

	useEffect(() => {
		if (analysisEngineRef.current) {
			analysisEngineRef.current.updateConfig({
				minConfidence,
				exhaustionThreshold,
				absenceThreshold,
				ticksToAnalyze: ticksQuantity,
				specificOperations,
			});
		}
	}, [
		minConfidence,
		exhaustionThreshold,
		absenceThreshold,
		ticksQuantity,
		specificOperations,
	]);

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
	}, [isConnected, selectedVolatilities]); // Re-subscribe if selection changes

	useEffect(() => {
		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

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
					// if (data.msg_type != 'tick') {
					// 	console.log('Received message:', data);
					// }
					
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
							const digit = Math.floor(price * 1000) % 10; // Assuming 3 decimal places for Volatility indices usually, but better to check pip size. 
							// Actually Deriv volatility indices often have different pip sizes.
							// Robust digit extraction:
							const strPrice = price.toString();
							const lastChar = strPrice.charAt(strPrice.length - 1);
							const digitVal = parseInt(lastChar, 10);
							
							if (!isNaN(digitVal) && analysisEngineRef.current) {
								analysisEngineRef.current.addTick(symbol, digitVal, price, times[index]);
							}
						});
					} else if (data.msg_type === 'tick') {
						const tick = data.tick;
						const symbol = tick.symbol;
						const price = tick.quote;
						
						const strPrice = price.toString();
						const lastChar = strPrice.charAt(strPrice.length - 1);
						const digit = parseInt(lastChar, 10);

						if (!isNaN(digit) && analysisEngineRef.current) {
							const analysis = analysisEngineRef.current.addTick(symbol, digit, price, tick.epoch);
							
							// Update Analysis Data State
							setAnalysisData(prev => {
								const newAnalyses = { ...prev?.analyses, [symbol]: analysis };
								
								// Generate signals
								const signals = analysisEngineRef.current?.generateSignals(newAnalyses) || [];
								
                                // Update Performance Stats
                                setPerformance(prevPerf => ({
                                    ...prevPerf,
                                    total_signals: prevPerf.total_signals + signals.length,
                                    high_confidence_signals: prevPerf.high_confidence_signals + signals.filter(s => s.assertiveness === 'HIGH').length,
                                    medium_confidence_signals: prevPerf.medium_confidence_signals + signals.filter(s => s.assertiveness === 'MEDIUM').length,
                                    symbols_monitored: Object.keys(newAnalyses).length,
                                    total_digits_analyzed: prevPerf.total_digits_analyzed + 1,
                                    timestamp: new Date().toISOString()
                                }));

								// Update best signal
								if (signals.length > 0) {
									setBestSignal(signals.sort((a, b) => b.confidence - a.confidence)[0]);
								}

								return {
									analyses: newAnalyses,
									signals: signals,
									market_quality: prev?.market_quality || {},
									should_trade: signals.length > 0,
									timestamp: new Date().toISOString()
								};
 							});
 						}
 					} else if (data.msg_type === 'proposal_open_contract') {
						const contract = data.proposal_open_contract;
						if (contract.is_sold) {
							const profit = contract.profit;
							const isWin = profit > 0;
							
							// Update Martingale
							setMartingaleConfig(prev => {
								if (!prev.enabled) {
									// Even if disabled, we should reset trading flag
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
										// Max level reached, reset
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
			}

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
	};

	const updateConfig = async (newConfig: any) => {
        // Since we removed the backend API, we just update local state if needed.
        // Most config is already local state.
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
											className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
												activeTab === tab.id
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
								{activeTab === 'signals' && (
									<div>
										<h3 className='text-lg font-semibold text-gray-900 mb-4'>
											Sinais de Trading
										</h3>
										<p className='text-gray-600'>
											Sinais gerados com base na análise estatística.
										</p>
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
						/>
						<PerformanceStats performance={performance} />
						<GlobalConfigPanel
							config={config}
							updateConfig={updateConfig}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
