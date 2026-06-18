import { useMemo } from 'react';

export default function BotDashboard({ logs, running, resultsList = [] }: { logs: string[], running: boolean, resultsList?: any[] }) {

    const totals = useMemo(() => {
        const totalTrader = resultsList.filter((result) => result.isSimulation === 'REAL').length;
        const totalWin = resultsList
            .filter((result) => result.status === 'WIN' && result.isSimulation === 'REAL')
            .reduce((acc, result) => acc + Number(result.profit), 0);
        const totalLoss = resultsList
            .filter((result) => result.status === 'LOSS' && result.isSimulation === 'REAL')
            .reduce((acc, result) => acc + Number(result.profit), 0);
        const lucro = resultsList
            .filter((result) => result.isSimulation === 'REAL')
            .reduce(
                (acc, result) => acc + Number(result.profit),
                0,
            );
        return { totalTrader, totalWin, totalLoss, lucro };
    }, [resultsList]);

    return (
        <div className="bg-[#13111c] rounded-lg border border-gray-800 h-full flex flex-col overflow-hidden">
            {/* Top Section: Logs (approx 40% height) */}
            <div className="flex-none h-[40%] flex flex-col border-b border-gray-800 min-h-[200px]">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e1b2e]">
                    <h2 className="text-lg font-semibold text-white">Dashboard Logs</h2>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${running ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                        {running ? 'EXECUTANDO' : 'PARADO'}
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-gray-400 space-y-1 bg-[#0d0a18]">
                    {logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-600">
                            Aguardando início...
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="border-b border-gray-800/50 pb-1">{log}</div>
                        ))
                    )}
                </div>
            </div>

            {/* Bottom Section: Results Table (approx 60% height) */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-4 bg-[#1e1b2e] border-b border-gray-800">
                    <div className='gap-4 flex flex-wrap items-center'>
                        <h3 className='font-medium text-white mr-4'>Resultados</h3>
                        <div className='text-gray-300 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded'>Trades: {totals.totalTrader}</div>
                        <div className='text-gray-300 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded'>
                            Win:{' '}
                            <span className='text-green-400'>
                                {Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(totals.totalWin)}
                            </span>
                        </div>
                        <div className='text-gray-300 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded'>
                            Loss:{' '}
                            <span className='text-red-400'>
                                {Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(totals.totalLoss)}
                            </span>
                        </div>
                        <div className='text-gray-300 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded'>
                            Total:{' '}
                            <span
                                className={
                                    totals.lucro > 0 ? 'text-green-400' : 'text-red-400'
                                }
                            >
                                {Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(totals.lucro)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-[#13111c]">
                    <table className='min-w-full text-left text-sm text-gray-400'>
                        <thead className='bg-[#1e1b2e] text-gray-200 sticky top-0 shadow-sm z-10'>
                            <tr>
                                <th className='px-4 py-3 font-medium'>Time</th>
                                <th className='px-4 py-3 font-medium'>Symbol</th>
                                <th className='px-4 py-3 font-medium'>Type</th>
                                <th className='px-4 py-3 font-medium'>Target</th>
                                <th className='px-4 py-3 font-medium'>Exit</th>
                                <th className='px-4 py-3 font-medium'>Stake</th>
                                <th className='px-4 py-3 font-medium'>Status</th>
                                <th className='px-4 py-3 font-medium'>Profit/Loss</th>
                                <th className='px-4 py-3 font-medium'>Mode</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {resultsList.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-gray-600">
                                        Nenhum trade realizado ainda.
                                    </td>
                                </tr>
                            ) : (
                                resultsList.map((result, index) => (
                                    <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                                        <td className='px-4 py-2 whitespace-nowrap font-mono text-xs'>{result.timestamp.toLocaleString()}</td>
                                        <td className='px-4 py-2 whitespace-nowrap'>{result.symbol}</td>
                                        <td className='px-4 py-2 whitespace-nowrap font-bold'>{result.type}</td>
                                        <td className='px-4 py-2 whitespace-nowrap font-mono'>{result.target}</td>
                                        <td className='px-4 py-2 whitespace-nowrap font-mono'>{result.exit}</td>
                                        <td className='px-4 py-2 font-mono'>{result.stake}</td>
                                        <td className='px-4 py-2'>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-bold ${result.status === 'WIN' ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}
                                            >{result.status}</span>
                                        </td>
                                        <td className={`px-4 py-2 font-mono font-bold ${result.status === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.status === 'WIN' ? '+' : ''}{result.profit}
                                        </td>
                                        <td className={`px-4 py-2 whitespace-nowrap font-mono ${result.isSimulation === 'SIMULACAO' ? 'text-yellow-400' : ''}`}>
                                            {result.isSimulation === 'SIMULACAO' ? 'SIMULAÇÃO' : 'REAL'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
