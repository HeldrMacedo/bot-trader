import React from 'react';
import { Play } from 'lucide-react';

interface OperationModeProps {
	mode: 'manual' | 'auto';
	setMode: (mode: 'manual' | 'auto') => void;
}

export const OperationMode: React.FC<OperationModeProps> = ({ mode, setMode }) => {
	return (
		<div className='bg-principal rounded-xl shadow-sm border border-gray-200 p-6'>
			<h3 className='text-lg font-semibold text-gray-400 mb-4'>
				📈 Modo de Operação
			</h3>

			<div className='mb-4'>
				<div className='flex gap-2'>
					<button
						onClick={() => setMode('manual')}
						className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
							mode === 'manual'
								? 'bg-indigo-600 text-white'
								: 'bg-white/10 hover:bg-white/20'
						}`}
					>
						Manual
					</button>
					<button
						onClick={() => setMode('auto')}
						className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
							mode === 'auto'
								? 'bg-orange-600 text-white'
								: 'bg-white/10 hover:bg-white/20'
						}`}
					>
						Automático
					</button>
				</div>
			</div>
			<div>
				{mode === 'manual' ? (
					<div></div>
				) : (
					<div>
						<button className="flex justify-center w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-2 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
							<Play size={16} /> Iniciar
						</button>
					</div>
				)}
			</div>
		</div>
	);
};