import React from 'react';

interface PerformanceStatsProps {
	performance: any;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ performance }) => {
	if (!performance) return null;

	return (
		<div className='bg-principal rounded-xl shadow-sm border border-gray-200 p-6'>
			<h3 className='text-lg font-semibold mb-4'>
				📊 Estatísticas
			</h3>

			<div className='space-y-3'>
				<div className='flex justify-between'>
					<span>Símbolos Monitorados:</span>
					<span className='font-medium '>
						{performance.symbols_monitored}
					</span>
				</div>

				<div className='flex justify-between'>
					<span>Total de Dígitos:</span>
					<span>
						{performance.total_digits_analyzed}
					</span>
				</div>

				<div className='flex justify-between'>
					<span>Sinais Gerados:</span>
					<span className='font-medium'>
						{performance.total_signals}
					</span>
				</div>

				<div className='flex justify-between'>
					<span>Alta Confiança:</span>
					<span className='font-medium text-green-600'>
						{performance.high_confidence_signals}
					</span>
				</div>

				<div className='flex justify-between'>
					<span>Média Confiança:</span>
					<span className='font-medium text-yellow-600'>
						{performance.medium_confidence_signals}
					</span>
				</div>
			</div>
		</div>
	);
};