import { Type, Target } from 'lucide-react';
import { text } from 'stream/consumers';

export default function ResultsTab({ resultsList }: { resultsList: any[] }) {
	return (
		<div className='bg-gray-800 p-4 rounded-md shadow'>
			<h3 className=' font-medium text-white'>Trade Resultados</h3>
			<div className='overflow-x-auto rounded-lg mt-4'>
				<div className='rounded-lg max-h-48'>
					<table className='min-w-full'>
						<thead className='bg-gray-50'>
							<tr>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Time
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Symbol
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Type
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Target
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Exit
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Stake
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Status
								</th>
								<th class='px-4 py-2 text-left text-sm font-medium text-gray-500'>
									Profit/Loss
								</th>
							</tr>
						</thead>
						<tbody id='tradeHistoryBody'>
							<tr>
								{resultsList.map((result, index) => (
									<tr key={index}>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.time}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.symbol}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.type}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.target}</td>
										<td className='px-4 py-2 text-sm whitespace-nowrap'>{result.exit}</td>
										<td class='px-4 py-2 text-sm font-mono'>{result.stake}</td>
										<td class='px-4 py-2 text-sm capitalize'>
											<span
												class='px-2 py-1 rounded-full text-xs font-medium
                bg-{result.status === 'Won' ? 'green' : 'red'}-100 text-{result.status === 'Won' ? 'green' : 'red'}-800'

											>{result.status}</span>
										</td>
										<td className='px-4 py-2 text-sm text-{result.status === 'Won' ? 'green' : 'red'}-600 font-medium'>
											{result.status === 'Won' ? '+' : '-'}
											{result.profitLoss}
										</td>
									</tr>
								))}
							</tr>


							<tr
								id='trade-302067944608'
								class='bg-green-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:36:34</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITOVER</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>2</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>6</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-green-100 text-green-800'
									>
										won
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-green-600 font-medium'>
									+0.37 USD
								</td>
							</tr>
							<tr
								id='trade-302066919848'
								class='bg-green-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:18:15</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITODD</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>-</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>7</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-green-100 text-green-800'
									>
										won
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-green-600 font-medium'>
									+0.88 USD
								</td>
							</tr>
							<tr
								id='trade-302066918928'
								class='bg-green-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:18:14</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITODD</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>-</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>7</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-green-100 text-green-800'
									>
										won
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-green-600 font-medium'>
									+0.88 USD
								</td>
							</tr>
							<tr
								id='trade-302066917408'
								class='bg-red-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:18:13</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITODD</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>-</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>0</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-red-100 text-red-800'
									>
										lost
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-red-600 font-medium'>
									-1.00 USD
								</td>
							</tr>
							<tr
								id='trade-302066914568'
								class='bg-green-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:18:09</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITODD</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>-</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>9</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-green-100 text-green-800'
									>
										won
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-green-600 font-medium'>
									+0.88 USD
								</td>
							</tr>
							<tr
								id='trade-302066912868'
								class='bg-green-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:18:08</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITODD</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>-</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>9</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-green-100 text-green-800'
									>
										won
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-green-600 font-medium'>
									+0.88 USD
								</td>
							</tr>
							<tr
								id='trade-302066909988'
								class='bg-red-50 hover:bg-opacity-75 transition-colors duration-200'
							>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>13:18:04</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>R_100</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>DIGITODD</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>-</td>
								<td class='px-4 py-2 text-sm whitespace-nowrap'>0</td>
								<td class='px-4 py-2 text-sm font-mono'>1.00</td>
								<td class='px-4 py-2 text-sm capitalize'>
									<span
										class='px-2 py-1 rounded-full text-xs font-medium
                bg-red-100 text-red-800'
									>
										lost
									</span>
								</td>
								<td class='px-4 py-2 text-sm text-red-600 font-medium'>
									-1.00 USD
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
