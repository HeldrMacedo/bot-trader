import { useMemo } from 'react';

export default function ResultsTab({ resultsList }: { resultsList: any[] }) {
	const totals = useMemo(() => {
		const totalTrader = resultsList.length;
		const totalWin = resultsList
			.filter((result) => result.status === 'Won')
			.reduce((acc, result) => acc + Number(result.profit), 0);
		const totalLoss = resultsList
			.filter((result) => result.status === 'Lost')
			.reduce((acc, result) => acc + Number(result.profit), 0);
		const lucro = resultsList.reduce(
			(acc, result) => acc + Number(result.profit),
			0,
		);

		return { totalTrader, totalWin, totalLoss, lucro };
	}, [resultsList]);

	return (
		<div className='bg-gray-800 p-4 rounded-md shadow'>
			<h3 className=' font-medium text-white'>Trade Resultados</h3>
			<div className='gap-4 flex'>
				<div className='text-white text-sm'>Trade: {totals.totalTrader}</div>
				<div className='text-white text-sm'>
					Total Win:{' '}
					<span className='text-green-500'>
						{Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD',
						}).format(totals.totalWin)}
					</span>
				</div>
				<div className='text-white text-sm'>
					Total Loss:{' '}
					<span className='text-red-500'>
						{Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD',
						}).format(totals.totalLoss)}
					</span>
				</div>
				<div className='text-white text-sm'>
					Lucro:{' '}
					<span
						className={
							totals.lucro > 0 ? 'text-green-500' : 'text-red-500'
						}
					>
						{Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD',
						}).format(totals.lucro)}
					</span>
				</div>
			</div>
			<div className='overflow-x-auto rounded-lg mt-4'>
				<div className='rounded-lg max-h-48'>
					<table className='min-w-full'>
						<thead className='bg-gray-50'>
							<tr>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Time
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Symbol
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Type
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Target
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Exit
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Stake
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Status
								</th>
								<th className='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Profit/Loss
								</th>
							</tr>
						</thead>
						<tbody id='tradeHistoryBody'>
								{resultsList.map((result, index) => (
									<tr key={index}>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.time}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.symbol}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.type}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.target}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.exit}</td>
										<td className='px-4 py-2 text-sm font-mono'>{result.stake}</td>
										<td className='px-4 py-2 text-sm capitalize'>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${result.status === 'Won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
											>{result.status}</span>
										</td>
										<td className={`px-4 py-2 text-sm font-medium ${result.status === 'Won' ? 'text-green-600' : 'text-red-600'}`}>
											{result.status === 'Won' ? '+' : ''}{result.profit}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
