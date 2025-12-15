import React from 'react';

interface PerformanceStatsProps {
	performance: any;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ performance }) => {
	if (!performance) return null;

	return (
		<div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
			<h3 className='text-lg font-semibold text-gray-900 mb-4'>
				📊 Estatísticas
			</h3>

			<div className='space-y-3'>
				<div className='flex justify-between'>
					<span className='text-gray-600'>Símbolos Monitorados:</span>
					<span className='font-medium text-gray-900'>
						{performance.symbols_monitored}
					</span>
				</div>

				<div className='flex justify-between'>
					<span className='text-gray-600'>Total de Dígitos:</span>
					<span className='font-medium text-gray-900'>
						{performance.total_digits_analyzed}
					</span>
				</div>

				<div className='flex justify-between'>
					<span className='text-gray-600'>Sinais Gerados:</span>
					<span className='font-medium text-gray-900'>
						{performance.total_signals}
					</span>
				</div>

				<div className='flex justify-between'>
					<span className='text-gray-600'>Alta Confiança:</span>
					<span className='font-medium text-green-600'>
						{performance.high_confidence_signals}
					</span>
				</div>

				<div className='flex justify-between'>
					<span className='text-gray-600'>Média Confiança:</span>
					<span className='font-medium text-yellow-600'>
						{performance.medium_confidence_signals}
					</span>
				</div>
			</div>
		</div>
	);
};