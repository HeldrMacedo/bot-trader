import { BarChart3 } from 'lucide-react';
import React from 'react';
import { AnalysisData, TradingSignal } from '../types';

interface SignalsPanelProps {
	bestSignal: TradingSignal | null;
	analysisData: AnalysisData | null;
}

export const SignalsPanel: React.FC<SignalsPanelProps> = ({
	bestSignal,
	analysisData,
}) => {
	const getSignalColor = (assertiveness: string) => {
		switch (assertiveness) {
			case 'HIGH':
				return 'text-green-500 bg-green-500/10';
			case 'MEDIUM':
				return 'text-yellow-500 bg-yellow-500/10';
			case 'LOW':
				return 'text-red-500 bg-red-500/10';
			default:
				return 'text-gray-500 bg-gray-500/10';
		}
	};

	const getSignalBg = (assertiveness: string) => {
		switch (assertiveness) {
			case 'HIGH':
				return 'bg-green-500/20 border-green-500/30';
			case 'MEDIUM':
				return 'bg-yellow-500/20 border-yellow-500/30';
			case 'LOW':
				return 'bg-red-500/20 border-red-500/30';
			default:
				return 'bg-gray-500/20 border-gray-500/30';
		}
	};

	const [signalsHistory, setSignalsHistory] = React.useState<TradingSignal[]>([]);

	const getSignalKey = (signal: TradingSignal) => {
		const reasons = (signal.reasons || []).filter(Boolean).join('|');
		const confidence = Number.isFinite(signal.confidence)
			? (Math.round(signal.confidence * 10) / 10).toFixed(1)
			: 'NaN';
		return `${signal.strategy}|${signal.type}|${signal.symbol}|${signal.barrier ?? ''}|${confidence}|${reasons}`;
	};

	React.useEffect(() => {
		const incoming: TradingSignal[] = [
			...(analysisData?.signals || []),
			...(bestSignal ? [bestSignal] : []),
		];
		if (incoming.length === 0) return;

		setSignalsHistory((prev) => {
			const seen = new Set(prev.map(getSignalKey));
			const uniqueToAdd: TradingSignal[] = [];

			for (const s of incoming) {
				const key = getSignalKey(s);
				if (seen.has(key)) continue;
				seen.add(key);
				uniqueToAdd.push(s);
			}

			if (uniqueToAdd.length === 0) return prev;
			return [...uniqueToAdd, ...prev];
		});
	}, [analysisData?.signals, bestSignal]);

	const tableSignals = signalsHistory;

	return (
		<>
			{/* Best Signal Card */}
			{bestSignal && (
				<div
					className={`bg-principal rounded-xl shadow-sm border p-6 ${getSignalBg(bestSignal.assertiveness)}`}
				>
					<div className='flex items-start justify-between mb-4'>
						<div>
							<h3 className='text-lg font-semibold'>
								🎯 MELHOR ENTRADA
							</h3>
							<p>Based on real-time analysis</p>
						</div>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(bestSignal.assertiveness)}`}
						>
							{bestSignal.assertiveness} CONFIDENCE
						</span>
					</div>

					<div className='space-y-3'>
						<div className='flex justify-between items-center'>
							<span className='font-medium'>Estratégia:</span>
							<span className='text-blue-600 font-semibold'>
								{bestSignal.type}
							</span>
						</div>

						<div className='flex justify-between items-center'>
							<span className='font-medium'>Ativo:</span>
							<span>{bestSignal.symbol}</span>
						</div>

						<div className='flex justify-between items-center'>
							<span className='font-medium'>Confiança:</span>
							<span className=' font-semibold'>
								{bestSignal.confidence.toFixed(1)}%
							</span>
						</div>

						<div className='flex justify-between items-center'>
							<span className='font-medium'>Lucro Esperado:</span>
							<span
								className={`font-semibold ${bestSignal.expected_profit > 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								{bestSignal.expected_profit > 0 ? '+' : ''}
								{bestSignal.expected_profit.toFixed(4)}
							</span>
						</div>

						<div className='mt-4'>
							<h4 className='font-medium mb-2'>
								Gatilhos Detectados:
							</h4>
							<ul className='space-y-1'>
								{bestSignal.reasons.map((reason, index) => (
									<li
										key={index}
										className='text-sm flex items-start gap-2'
									>
										<div className='w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0'></div>
										{reason}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* All Signals */}
			<div className='bg-principal rounded-xl shadow-sm border border-gray-200 p-6'>
				<div className='flex items-center justify-between mb-4'>
					<h3 className='text-lg font-semibold'>
						📊 Todas as Sugestões
					</h3>
					<span className='text-sm'>
						{tableSignals.length} sinais encontrados
					</span>
				</div>

				<div className='overflow-x-auto rounded-lg mt-4'>
					{tableSignals.length > 0 && (
						<div className='rounded-lg max-h-96 overflow-y-auto'>
							<table className='min-w-full'>
								<thead className='bg-gray-50'>
									<tr>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Estratégia</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Tipo</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Ativo</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Barreira</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Confiança</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>ML</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Comb.</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Assert.</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Lucro</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Motivos</th>
										<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>Hora</th>
									</tr>
								</thead>
								<tbody>
									{tableSignals.map((signal, index) => (
										<tr key={index} className={`border-b ${getSignalBg(signal.assertiveness)}`}>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>{signal.strategy}</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap font-medium'>{signal.type}</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>{signal.symbol}</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>{signal.barrier ?? '-'}</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(signal.assertiveness)}`}>
													{Number.isFinite(signal.confidence) ? signal.confidence.toFixed(1) : '-'}%
												</span>
											</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>
												{Number.isFinite(signal.ml_confidence) ? `${signal.ml_confidence.toFixed(1)}%` : '-'}
											</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>
												{Number.isFinite(signal.combined_confidence) ? `${signal.combined_confidence.toFixed(1)}%` : '-'}
											</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>{signal.assertiveness}</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>{Number.isFinite(signal.expected_profit) ? signal.expected_profit.toFixed(4) : '-'}</td>
											<td className='px-4 py-2 text-sm'><div className='min-w-[420px]'>{(signal.reasons || []).filter(Boolean).join(' | ')}</div></td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>{signal.timestamp ? new Date(signal.timestamp).toLocaleTimeString() : '-'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{tableSignals.length === 0 && (
						<div className='text-center py-8'>
							<BarChart3
								size={48}
								className='mx-auto mb-4'
							/>
							<p>Nenhuma sugestão disponível no momento</p>
							<p className='text-sm'>
								Aguardando condições favoráveis de mercado
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
};