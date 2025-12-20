import { TradingSignal } from '@/lib/deriv-api-client';
import { BarChart3 } from 'lucide-react';
import React from 'react';
import { AnalysisData } from '../types';

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
						{analysisData?.signals.length || 0} sinais encontrados
					</span>
				</div>

				<div className='space-y-3 max-h-96 overflow-y-auto'>
					{(analysisData?.signals || []).map((signal, index) => (
						<div
							key={index}
							className={`p-4 rounded-lg border ${getSignalBg(signal.assertiveness)}`}
						>
							<div className='flex justify-between items-start mb-2'>
								<div>
									<h4 className='font-medium'>
										{signal.type}
									</h4>
									<p className='text-sm'>{signal.symbol}</p>
								</div>
								<div className='text-right'>
									<div
										className={`px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(signal.assertiveness)}`}
									>
										{signal.confidence.toFixed(1)}%
									</div>
									<div className='text-xs mt-1'>
										{signal.assertiveness}
									</div>
								</div>
							</div>

							<div className='text-sm'>
								{signal.reasons.slice(0, 2).map((reason, i) => (
									<div
										key={i}
										className='flex items-start gap-2 mt-1'
									>
										<div className='w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0'></div>
										{reason}
									</div>
								))}
								{signal.reasons.length > 2 && (
									<div className='text-xs mt-1'>
										+{signal.reasons.length - 2} more triggers...
									</div>
								)}
							</div>
						</div>
					))}

					{(!analysisData || analysisData.signals.length === 0) && (
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