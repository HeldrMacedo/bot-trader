'use client';
import derivApiClient, { TradingSignal } from '@/lib/deriv-api-client';
import { Activity, BarChart3, Settings, Target } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// Types
import {
	AnalysisData,
	MartingaleConfig,
	SpecificOperations,
	VolatilityData,
} from './types';

// Components
import { ConnectionStatus } from './components/ConnectionStatus';
import { SignalsPanel } from './components/SignalsPanel';
import { DashboardTab } from './components/DashboardTab';
import { AnalysisTab } from './components/AnalysisTab';
import { ConfigTab } from './components/ConfigTab';
import { OperationMode } from './components/OperationMode';
import { PerformanceStats } from './components/PerformanceStats';
import { GlobalConfigPanel } from './components/GlobalConfigPanel';

export default function DerivAnalyzerDashboard() {
	// Connection State
	const [isConnected, setIsConnected] = useState(false);
	const [apiToken, setApiToken] = useState('ehOXyajRlX3TdOu');
	const [isLoading, setIsLoading] = useState(false);
	const wsRef = React.useRef<WebSocket | null>(null);
	const reconnectAttemptsRef = React.useRef(0);
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
	const [performance, setPerformance] = useState<any>(null);

	// UI State
	const [activeTab, setActiveTab] = useState('dashboard');

	// Trading Config State
	const [stake, setStake] = useState<number>(1);
	const [stopLoss, setStopLoss] = useState<number>(50);
	const [takeProfit, setTakeProfit] = useState<number>(100);
	const [minConfidence, setMinConfidence] = useState<number>(70);
	const [maxTrades, setMaxTrades] = useState<number>(50);
	const [exhaustionThreshold, setExhaustionThreshold] = useState<number>(5);
	const [absenceThreshold, setAbsenceThreshold] = useState<number>(15);
	const [mode, setMode] = useState<'manual' | 'auto'>('manual');

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
			over: { enabled: false, digits: [0, 1, 2, 3, 4] },
			under: { enabled: false, digits: [7, 8, 9] },
			matches: { enabled: false, digit: 5 },
			differs: { enabled: false, digits: [0, 5, 9] },
		});

	// --- Effects ---
	useEffect(() => {
		if (isConnected) {
			loadInitialData();
		}
	}, [isConnected]);

	useEffect(() => {
		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

	// --- Methods ---
	const loadInitialData = async () => {
		try {
			const [configRes, perfRes] = await Promise.all([
				derivApiClient.getConfig(),
				derivApiClient.getPerformance(),
			]);
			setConfig(configRes.config);
			setPerformance(perfRes);
		} catch (error) {
			console.error('Error loading initial data:', error);
		}
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
					if (data.msg_type === 'authorize') {
						if (data.error) {
							console.error('Authorization error:', data.error);
							alert('Authorization failed: ' + data.error.message);
							ws.close();
						} else {
							console.log('Authorized successfully', data);
						}
					}
				} catch (e) {
					console.error('Error parsing message:', e);
				}
			};

			ws.onclose = () => {
				console.log('Deriv WebSocket disconnected');
				setIsConnected(false);
				attemptReconnect();
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
		try {
			const response = await derivApiClient.updateConfig(newConfig);
			setConfig(response.config);
			alert('Configuration updated successfully');
		} catch (error) {
			console.error('Config update error:', error);
			alert('Failed to update configuration: ' + (error as Error).message);
		}
	};

	const toggleVolatility = (symbol: string) => {
		setSelectedVolatilities((prev) => {
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
				/>

				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
					{/* Left Column - Signals and Analysis */}
					<div className='lg:col-span-2 space-y-6'>
						<SignalsPanel
							bestSignal={bestSignal}
							analysisData={analysisData}
						/>

						{/* Tab Navigation */}
						<div className='mt-6 bg-white rounded-xl shadow-sm border border-gray-200'>
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
									].map((tab) => (
										<button
											key={tab.id}
											onClick={() => setActiveTab(tab.id)}
											className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
												activeTab === tab.id
													? 'border-blue-500 text-blue-600'
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
										takeProfit={takeProfit}
										setTakeProfit={setTakeProfit}
										maxTrades={maxTrades}
										setMaxTrades={setMaxTrades}
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
							</div>
						</div>
					</div>

					{/* Right Column - Market Quality and Stats */}
					<div className='space-y-6'>
						<OperationMode mode={mode} setMode={setMode} />
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