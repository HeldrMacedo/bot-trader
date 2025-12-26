import React from 'react';
import { AnalysisData } from '../types';

interface AnalysisTabProps {
	analysisData: AnalysisData | null;
}

const getTop3Probs = (probs: number[]) => {
    if (!probs || probs.length === 0) return [];
    const sorted = [...probs]
        .map((prob, digit) => ({ digit, prob: prob * 100 }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3);
    return sorted;
};

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ analysisData }) => {
	return (
		<div>
			<h3 className='text-lg font-semibold  mb-4'>
				Análise Detalhada
			</h3>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				{analysisData &&
					Object.entries(analysisData.analyses).map(
						([symbol, analysis]) => {
							const mlProbs =
								analysis.ml_predictions?.next_digit_probabilities || [];
							const top3 = getTop3Probs(mlProbs);

							return (
								<div
									key={symbol}
									className='border border-gray-200 rounded-lg p-4'
								>
									<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
										<div className='space-y-1'>
											<h4 className='font-medium mb-2'>{symbol}</h4>
											<div className='text-sm'>
												Dígito Atual:{' '}
												<span className='font-medium'>
													{analysis.current_digit}
												</span>
											</div>
											<div className='text-sm'>
												Tendência:{' '}
												<span className='font-medium'>
													{analysis.trends.direction}
												</span>
											</div>
											<div className='text-sm'>
												Exaustão:{' '}
												<span className='font-medium'>
													{analysis.exhaustion.length}
												</span>{' '}
												dígitos
											</div>
											<div className='text-sm'>
												Ausência:{' '}
												<span className='font-medium'>
													{analysis.absence.length}
												</span>{' '}
												dígitos
											</div>
										</div>

										{top3.length > 0 && (
											<div>
												<h5 className='text-sm font-medium text-blue-600 mb-2'>
													Top 3 Probabilidades:
												</h5>
												<div className='text-sm space-y-1'>
													{top3.map(({ digit, prob }) => (
														<div key={digit}>
															Dígito {digit}: {prob.toFixed(1)}%
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							);
						}
					)}
			</div>
		</div>
	);
};