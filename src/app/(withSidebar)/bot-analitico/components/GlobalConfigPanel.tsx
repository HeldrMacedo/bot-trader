import React from 'react';
import { Settings } from 'lucide-react';

interface GlobalConfigPanelProps {
	config: any;
	updateConfig: (newConfig: any) => void;
}

export const GlobalConfigPanel: React.FC<GlobalConfigPanelProps> = ({ config, updateConfig }) => {
	if (!config) return null;

	return (
		<div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
			<h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
				<Settings size={20} />
				Configurações
			</h3>

			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Limiar de Exaustão
					</label>
					<input
						type='number'
						value={config.exhaustion_threshold}
						onChange={(e) =>
							updateConfig({
								exhaustion_threshold: parseInt(e.target.value),
							})
						}
						className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Limiar de Ausência
					</label>
					<input
						type='number'
						value={config.absence_threshold}
						onChange={(e) =>
							updateConfig({
								absence_threshold: parseInt(e.target.value),
							})
						}
						className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Confiança Mínima
					</label>
					<input
						type='number'
						value={config.min_confidence}
						onChange={(e) =>
							updateConfig({
								min_confidence: parseInt(e.target.value),
							})
						}
						className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
					/>
				</div>

				<div className='flex items-center justify-between'>
					<span className='text-sm font-medium text-gray-700'>
						Over 2
					</span>
					<label className='relative inline-flex items-center cursor-pointer'>
						<input
							type='checkbox'
							checked={config.over2_enabled}
							onChange={(e) =>
								updateConfig({ over2_enabled: e.target.checked })
							}
							className='sr-only peer'
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>

				<div className='flex items-center justify-between'>
					<span className='text-sm font-medium text-gray-700'>
						Under 7
					</span>
					<label className='relative inline-flex items-center cursor-pointer'>
						<input
							type='checkbox'
							checked={config.under7_enabled}
							onChange={(e) =>
								updateConfig({ under7_enabled: e.target.checked })
							}
							className='sr-only peer'
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>

				<div className='flex items-center justify-between'>
					<span className='text-sm font-medium text-gray-700'>
						Differs
					</span>
					<label className='relative inline-flex items-center cursor-pointer'>
						<input
							type='checkbox'
							checked={config.differs_enabled}
							onChange={(e) =>
								updateConfig({ differs_enabled: e.target.checked })
							}
							className='sr-only peer'
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
					</label>
				</div>
			</div>
		</div>
	);
};