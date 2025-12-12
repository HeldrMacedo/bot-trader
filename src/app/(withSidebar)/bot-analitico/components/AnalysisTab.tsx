import React from 'react';
import { AnalysisData } from '../types';

interface AnalysisTabProps {
	analysisData: AnalysisData | null;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ analysisData }) => {
	return (
		<div>
			<h3 className='text-lg font-semibold text-gray-900 mb-4'>
				Análise Detalhada
			</h3>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				{analysisData &&
					Object.entries(analysisData.analyses).map(
						([symbol, analysis]) => (
							<div
								key={symbol}
								className='border border-gray-200 rounded-lg p-4'
							>
								<h4 className='font-medium text-gray-900 mb-2'>
									{symbol}
								</h4>
								<div className='text-sm space-y-1 text-gray-900'>
									<div>
										Dígito Atual:{' '}
										<span className='font-medium'>
											{analysis.current_digit}
										</span>
									</div>
									<div>
										Tendência:{' '}
										<span className='font-medium'>
											{analysis.trends.trend}
										</span>
									</div>
									<div>
										Exaustão:{' '}
										<span className='font-medium'>
											{analysis.exhaustion.length}
										</span>{' '}
										dígitos
									</div>
									<div>
										Ausência:{' '}
										<span className='font-medium'>
											{analysis.absence.length}
										</span>{' '}
										dígitos
									</div>
								</div>
							</div>
						),
					)}
			</div>
		</div>
	);
};