import { Pause, Play, Wifi, WifiOff } from 'lucide-react';
import React from 'react';

interface ConnectionStatusProps {
	isConnected: boolean;
	isLoading: boolean;
	apiToken: string;
	setApiToken: (token: string) => void;
	handleConnect: () => void;
	handleDisconnect: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
	isConnected,
	isLoading,
	apiToken,
	setApiToken,
	handleConnect,
	handleDisconnect,
}) => {
	return (
		<div className='bg-white rounded-xl shadow-sm border bg-principal p-6 mb-6'>
			<div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
				<div className='flex items-center gap-3'>
					<div className='flex items-center gap-2'>
						{isConnected ? (
							<Wifi className='text-green-500' size={20} />
						) : isLoading ? (
							<div className='w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
						) : (
							<WifiOff className='text-red-500' size={20} />
						)}
						<span
							className={`font-medium ${isConnected ? 'text-green-600' : isLoading ? 'text-blue-600' : 'text-red-600'}`}
						>
							{isConnected
								? 'Connected'
								: isLoading
									? 'Connecting...'
									: 'Disconnected'}
						</span>
					</div>
				</div>

				<div className='flex gap-3'>
					{!isConnected ? (
						<div className='flex gap-2'>
							<input
								type='password'
								value={apiToken}
								onChange={(e) => setApiToken(e.target.value)}
								placeholder='Enter API Token'
								className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-8 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
							/>
							<button
								onClick={handleConnect}
								disabled={isLoading}
								className='flex items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
							>
								{isLoading ? (
									<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
								) : (
									<Play size={16} />
								)}
								Conectar
							</button>
						</div>
					) : (
						<button
							onClick={handleDisconnect}
							className='flex items-center gap-3 rounded-md pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs bg-red-600 hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
						>
							<Pause size={16} />
							Disconnect
						</button>
					)}
				</div>
			</div>
		</div>
	);
};