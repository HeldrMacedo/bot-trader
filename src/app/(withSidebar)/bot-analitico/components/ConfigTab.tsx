import React from 'react';
import { Target, TrendingUp, AlertTriangle, Brain } from 'lucide-react';
import {
  VOLATILITIES,
  VolatilityData,
  SpecificOperations,
  MartingaleConfig,
  MLConfig,
} from '../types';

interface ConfigTabProps {
  selectedVolatilities: string[];
  toggleVolatility: (symbol: string) => void;
  volatilityData: Record<string, VolatilityData>;
  specificOperations: SpecificOperations;
  setSpecificOperations: React.Dispatch<
    React.SetStateAction<SpecificOperations>
  >;
  stake: number;
  setStake: (value: number) => void;
  stopLoss: number;
  setStopLoss: (value: number) => void;
  stopWin: number;
  setStopWin: (value: number) => void;
  ticksQuantity: number;
  setTicksQuantity: (value: number) => void;
  minConfidence: number;
  setMinConfidence: (value: number) => void;
  exhaustionThreshold: number;
  setExhaustionThreshold: (value: number) => void;
  absenceThreshold: number;
  setAbsenceThreshold: (value: number) => void;
  martingaleConfig: MartingaleConfig;
  setMartingaleConfig: React.Dispatch<React.SetStateAction<MartingaleConfig>>;
  mlConfig: MLConfig;
  setMlConfig: React.Dispatch<React.SetStateAction<MLConfig>>;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
	selectedVolatilities,
  toggleVolatility,
  volatilityData,
  specificOperations,
  setSpecificOperations,
  stake,
  setStake,
  stopLoss,
  setStopLoss,
  stopWin,
  setStopWin,
  ticksQuantity,
  setTicksQuantity,
  minConfidence,
  setMinConfidence,
  exhaustionThreshold,
  setExhaustionThreshold,
  absenceThreshold,
  setAbsenceThreshold,
  martingaleConfig,
  setMartingaleConfig,
  mlConfig,
  setMlConfig,
}) => {
	return (
		<div>

			<div className='mb-8 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/30'>
        <h2 className='text-2xl font-bold mb-4 flex items-center gap-3'>
          <Brain className='text-purple-400' size={28} />
          <span className='bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
            Machine Learning
          </span>
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className='bg-gray-900/50 p-4 rounded-lg'>
            <label className='flex items-center gap-3 cursor-pointer mb-3'>
              <input
                type='checkbox'
                checked={mlConfig.useML}
                onChange={(e) => setMlConfig({...mlConfig, useML: e.target.checked})}
                className='w-5 h-5 rounded bg-gray-700'
              />
              <span className='font-bold text-lg text-white'>
                Ativar Machine Learning
              </span>
            </label>
            <p className='text-sm text-gray-400'>
              Use redes neurais para prever padrões e melhorar sinais
            </p>
          </div>

          <div className='bg-gray-900/50 p-4 rounded-lg'>
            <label className='flex items-center gap-3 cursor-pointer mb-3'>
              <input
                type='checkbox'
                checked={mlConfig.onlineLearning}
                onChange={(e) => setMlConfig({...mlConfig, onlineLearning: e.target.checked})}
                className='w-5 h-5 rounded bg-gray-700'
              />
              <span className='font-bold text-lg text-white'>
                Aprendizado Online
              </span>
            </label>
            <p className='text-sm text-gray-400'>
              Melhora continuamente com novos dados
            </p>
          </div>

          <div className='bg-gray-900/50 p-4 rounded-lg'>
            <label className='flex items-center gap-3 cursor-pointer mb-3'>
              <input
                type='checkbox'
                checked={mlConfig.trainingEnabled}
                onChange={(e) => setMlConfig({...mlConfig, trainingEnabled: e.target.checked})}
                className='w-5 h-5 rounded bg-gray-700'
              />
              <span className='font-bold text-lg text-white'>
                Treinamento Automático
              </span>
            </label>
            <p className='text-sm text-gray-400'>
              Treina modelos periodicamente
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <label className='block text-sm font-medium mb-2'>
              Limite de Confiança ML: <strong>{mlConfig.confidenceThreshold}%</strong>
            </label>
            <input
              type='range'
              min='50'
              max='95'
              value={mlConfig.confidenceThreshold}
              onChange={(e) => setMlConfig({...mlConfig, confidenceThreshold: parseInt(e.target.value)})}
              className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500'
            />
            <p className='text-xs text-gray-400 mt-1'>
              Só aceita sinais com confiança ML ≥ {mlConfig.confidenceThreshold}%
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium mb-2'>
              Janela de Features: <strong>{mlConfig.featureWindow} ticks</strong>
            </label>
            <input
              type='range'
              min='20'
              max='100'
              step='10'
              value={mlConfig.featureWindow}
              onChange={(e) => setMlConfig({...mlConfig, featureWindow: parseInt(e.target.value)})}
              className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500'
            />
            <p className='text-xs text-gray-400 mt-1'>
              Quantidade de ticks usados para análise ML
            </p>
          </div>
        </div>
      </div>



			{/* Seleção de Volatilidades */}

				<h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
					<Target className='text-yellow-400' />
					Volatilidades Monitoradas
				</h2>

				<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6'>
					{VOLATILITIES.map((vol) => (
						<button
							key={vol.symbol}
							onClick={() => toggleVolatility(vol.symbol)}
							className={`p-3 rounded-lg font-medium transition-all ${
								selectedVolatilities.includes(vol.symbol)
									? `bg-${vol.color}-600 text-white shadow-lg scale-105`
									: 'bg-white/10 hover:bg-white/20'
							}`}
						>
							<div className='text-xs opacity-80'>{vol.name}</div>
							<div className='text-lg font-bold mt-1'>
								{volatilityData[vol.symbol]?.currentTick?.digit ?? '-'}
							</div>
						</button>
					))}
				</div>
			

			<h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
				<Target className='text-purple-400' />
				<span>Operações Customizáveis</span>
			</h2>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* OVER Customizável */}
					<div className='bg-emerald-900/30 border border-emerald-500/40 rounded-lg p-4'>
						<label className='flex items-center gap-3 cursor-pointer mb-3'>
							<input
								type='checkbox'
								checked={specificOperations.over.enabled}
								onChange={(e) =>
									setSpecificOperations((prev) => ({
										...prev,
										over: {
											...prev.over,
											enabled: e.target.checked,
										},
									}))
								}
								className='w-5 h-5 rounded'
							/>
							<span className='font-bold text-emerald-300'>
								OVER Específico
							</span>
						</label>
						<p className='text-xs text-gray-300 mb-3'>
							Selecione os dígitos que você quer operar OVER (maior que):
						</p>

						<div className='grid grid-cols-5 gap-2'>
							{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((digit) => (
								<button
									key={digit}
									onClick={() => {
										setSpecificOperations((prev) => {
											const newDigits = prev.over.digits.includes(
												digit,
											)
												? prev.over.digits.filter(
														(d) => d !== digit,
													)
												: [...prev.over.digits, digit].sort(
														(a, b) => a - b,
													);
											return {
												...prev,
												over: { ...prev.over, digits: newDigits },
											};
										});
									}}
									disabled={!specificOperations.over.enabled}
									className={`py-2 px-3 rounded-lg font-bold transition-all ${
										specificOperations.over.digits.includes(digit)
											? 'bg-emerald-600 text-white scale-110'
											: 'bg-white/10 hover:bg-white/20'
									} ${!specificOperations.over.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
								>
									{digit}
								</button>
							))}
						</div>
						{specificOperations.over.enabled &&
							specificOperations.over.digits.length > 0 && (
								<p className='text-xs text-emerald-300 mt-3'>
									Opera quando dígito for{' '}
									<strong>
										&gt;{' '}
										{Math.max(...specificOperations.over.digits)}
									</strong>
								</p>
							)}
					</div>

					{/* UNDER Customizável */}
					<div className='bg-sky-900/30 border border-sky-500/40 rounded-lg p-4'>
						<label className='flex items-center gap-3 cursor-pointer mb-3'>
							<input
								type='checkbox'
								checked={specificOperations.under.enabled}
								onChange={(e) =>
									setSpecificOperations((prev) => ({
										...prev,
										under: {
											...prev.under,
											enabled: e.target.checked,
										},
									}))
								}
								className='w-5 h-5 rounded'
							/>
							<span className='font-bold text-sky-300'>
								UNDER Específico
							</span>
						</label>

						<p className='text-xs text-gray-300 mb-3'>
							Selecione os dígitos que você quer operar UNDER (menor que):
						</p>

						<div className='grid grid-cols-5 gap-2'>
							{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
								<button
									key={digit}
									onClick={() => {
										setSpecificOperations((prev) => {
											const newDigits = prev.under.digits.includes(
												digit,
											)
												? prev.under.digits.filter(
														(d) => d !== digit,
													)
												: [...prev.under.digits, digit].sort(
														(a, b) => a - b,
													);
											return {
												...prev,
												under: {
													...prev.under,
													digits: newDigits,
												},
											};
										});
									}}
									disabled={!specificOperations.under.enabled}
									className={`py-2 px-3 rounded-lg font-bold transition-all ${
										specificOperations.under.digits.includes(
											digit,
										)
											? 'bg-sky-600 text-white scale-110'
											: 'bg-white/10 hover:bg-white/20'
									} ${!specificOperations.under.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
								>
									{digit}
								</button>
							))}
						</div>

						{specificOperations.under.enabled &&
							specificOperations.under.digits.length > 0 && (
								<p className='text-xs text-sky-300 mt-3'>
									Opera quando dígito for{' '}
									<strong>
										&lt;{' '}
										{Math.min(...specificOperations.under.digits)}
									</strong>
								</p>
							)}
					</div>

					{/* MATCHES Customizável */}
					<div className='bg-pink-900/30 border border-pink-500/40 rounded-lg p-4'>
						<label className='flex items-center gap-3 cursor-pointer mb-3'>
							<input
								type='checkbox'
								checked={specificOperations.matches.enabled}
								onChange={(e) =>
									setSpecificOperations((prev) => ({
										...prev,
										matches: {
											...prev.matches,
											enabled: e.target.checked,
										},
									}))
								}
								className='w-5 h-5 rounded'
							/>
							<span className='font-bold text-pink-300'>
								MATCHES Específico
							</span>
						</label>

						<p className='text-xs text-gray-300 mb-3'>
							Selecione o dígito que você quer que APAREÇA:
						</p>

						<div className='grid grid-cols-5 gap-2'>
							{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
								<button
									key={digit}
									onClick={() => {
										setSpecificOperations((prev) => ({
											...prev,
											matches: { ...prev.matches, digit },
										}));
									}}
									disabled={!specificOperations.matches.enabled}
									className={`py-2 px-3 rounded-lg font-bold transition-all ${
										specificOperations.matches.digit === digit
											? 'bg-pink-600 text-white scale-110'
											: 'bg-white/10 hover:bg-white/20'
									} ${!specificOperations.matches.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
								>
									{digit}
								</button>
							))}
						</div>

						{specificOperations.matches.enabled && (
							<p className='text-xs text-pink-300 mt-3'>
								Opera quando dígito for{' '}
								<strong>
									= {specificOperations.matches.digit}
								</strong>
							</p>
						)}
					</div>

					{/* DIFFERS Customizável */}
					<div className='bg-violet-900/30 border border-violet-500/40 rounded-lg p-4'>
						<label className='flex items-center gap-3 cursor-pointer mb-3'>
							<input
								type='checkbox'
								checked={specificOperations.differs.enabled}
								onChange={(e) =>
									setSpecificOperations((prev) => ({
										...prev,
										differs: {
											...prev.differs,
											enabled: e.target.checked,
										},
									}))
								}
								className='w-5 h-5 rounded'
							/>
							<span className='font-bold text-violet-300'>
								DIFFERS Customizável
							</span>
						</label>

						<p className='text-xs text-gray-300 mb-3'>
							Selecione os dígitos que você quer EVITAR:
						</p>

						<div className='grid grid-cols-5 gap-2'>
							{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
								<button
									key={digit}
									onClick={() => {
										setSpecificOperations((prev) => {
											const newDigits =
												prev.differs.digits.includes(digit)
													? prev.differs.digits.filter(
															(d) => d !== digit,
														)
													: [...prev.differs.digits, digit].sort(
															(a, b) => a - b,
														);
											return {
												...prev,
												differs: {
													...prev.differs,
													digits: newDigits,
												},
											};
										});
									}}
									disabled={!specificOperations.differs.enabled}
									className={`py-2 px-3 rounded-lg font-bold transition-all ${
										specificOperations.differs.digits.includes(
											digit,
										)
											? 'bg-violet-600 text-white scale-110'
											: 'bg-white/10 hover:bg-white/20'
									} ${!specificOperations.differs.enabled ? 'opacity-30 cursor-not-allowed' : ''}`}
								>
									{digit}
								</button>
							))}
						</div>

						{specificOperations.differs.enabled &&
							specificOperations.differs.digits.length > 0 && (
								<p className='text-xs text-violet-300 mt-3'>
									Opera quando dígito for{' '}
									<strong>
										≠ {specificOperations.differs.digits.join(', ')}
									</strong>
								</p>
							)}
					</div>
				</div>

				{/* Coluna Direita - Configs de Stake e Martingale */}
				<div className=' mb-4'>
					<div className='grid grid-cols-2 mb-2 gap-4'>
						<div className='mb-2'>
							<label className='block text-sm mb-2'>
								Stake (USD)
							</label>
							<input
								type='number'
								value={stake}
								onChange={(e) => setStake(parseFloat(e.target.value))}
								className='w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white'
								step='0.01'
							/>
						</div>

						<div className='mb-2'>
							<label className='block text-sm mb-2'>Stop Loss</label>
							<input
								type='number'
								value={stopLoss}
								onChange={(e) => setStopLoss(parseFloat(e.target.value))}
								className='w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white'
							/>
						</div>

						<div className='mb-2'>
							<label className='block text-sm mb-2'>
								Stop Win
							</label>
							<input
								type='number'
								value={stopWin}
								onChange={(e) =>
									setStopWin(parseFloat(e.target.value))
								}
								className='w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white'
							/>
						</div>

						<div className='mb-2'>
							<label className='block text-sm mb-2'>
								Ticks Quantity
							</label>
							<input
								type='number'
								value={ticksQuantity}
								onChange={(e) =>
									setTicksQuantity(parseInt(e.target.value))
								}
								className='w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white'
							/>
						</div>
					</div>

					<div className='bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4'>
						<h3 className='text-sm font-bold mb-3 flex items-center gap-2'>
							<AlertTriangle className='text-yellow-400' size={16} />
							Controles de Assertividade
						</h3>

						<div className='space-y-3'>
							<div>
								<label className='block text-xs mb-1'>
									Confiança Mínima: <strong>{minConfidence}%</strong>
								</label>
								<input
									type='range'
									min='50'
									max='90'
									value={minConfidence}
									onChange={(e) =>
										setMinConfidence(parseInt(e.target.value))
									}
									className='w-full'
								/>
								<p className='text-xs text-gray-400 mt-1'>
									Só opera se confiança ≥ {minConfidence}%
								</p>
							</div>

							<div>
								<label className='block text-xs mb-1'>
									Limite Exaustão:{' '}
									<strong>{exhaustionThreshold} vezes</strong>
								</label>
								<input
									type='range'
									min='3'
									max='8'
									value={exhaustionThreshold}
									onChange={(e) =>
										setExhaustionThreshold(parseInt(e.target.value))
									}
									className='w-full'
								/>
								<p className='text-xs text-gray-400 mt-1'>
									Dígito exausto após aparecer {exhaustionThreshold}+
									vezes em 20 ticks
								</p>
							</div>

							<div>
								<label className='block text-xs mb-1'>
									Limite Ausência:{' '}
									<strong>{absenceThreshold} ticks</strong>
								</label>
								<input
									type='range'
									min='10'
									max='25'
									value={absenceThreshold}
									onChange={(e) =>
										setAbsenceThreshold(parseInt(e.target.value))
									}
									className='w-full'
								/>
								<p className='text-xs text-gray-400 mt-1'>
									Dígito ausente após {absenceThreshold}+ ticks sem
									aparecer
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<h2 className='text-xl font-bold mb-4 flex items-center gap-2 mt-4'>
				<TrendingUp className='text-orange-400' />
				<span>Sistema de Martingale</span>
			</h2>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				<div>
					<label className='flex items-center gap-3 cursor-pointer mb-4'>
						<input
							type='checkbox'
							checked={martingaleConfig.enabled}
							onChange={(e) => {
								setMartingaleConfig((prev) => ({
									...prev,
									enabled: e.target.checked,
									currentLevel: 0,
									currentStake: stake,
								}));
							}}
							className='w-5 h-5 rounded'
						/>
						<span className='font-bold'>Ativar Martingale</span>
					</label>

					<div className='space-y-4'>
						<div>
							<label className='block text-sm mb-2'>
								Multiplicador:{' '}
								<strong>
									{martingaleConfig.multiplier.toFixed(1)}x
								</strong>
							</label>
							<input
								type='range'
								min='1.5'
								max='3'
								step='0.1'
								value={martingaleConfig.multiplier}
								onChange={(e) =>
									setMartingaleConfig((prev) => ({
										...prev,
										multiplier: parseFloat(e.target.value),
									}))
								}
								disabled={!martingaleConfig.enabled}
								className='w-full'
							/>
							<p className='text-xs text-gray-400 mt-1'>
								Após LOSS, stake será multiplicado por{' '}
								{martingaleConfig.multiplier.toFixed(1)}x
							</p>
						</div>

						<div>
							<label className='block text-sm mb-2'>
								Níveis Máximos:{' '}
								<strong>{martingaleConfig.maxLevels}</strong>
							</label>
							<input
								type='range'
								min='1'
								max='5'
								value={martingaleConfig.maxLevels}
								onChange={(e) =>
									setMartingaleConfig((prev) => ({
										...prev,
										maxLevels: parseInt(e.target.value),
									}))
								}
								disabled={!martingaleConfig.enabled}
								className='w-full'
							/>
							<p className='text-xs text-gray-400 mt-1'>
								Máximo de {martingaleConfig.maxLevels} martingale(s)
								consecutivos
							</p>
						</div>

						<label className='flex items-center gap-3 cursor-pointer'>
							<input
								type='checkbox'
								checked={martingaleConfig.resetOnWin}
								onChange={(e) =>
									setMartingaleConfig((prev) => ({
										...prev,
										resetOnWin: e.target.checked,
									}))
								}
								disabled={!martingaleConfig.enabled}
								className='w-5 h-5 rounded'
							/>
							<span className='text-sm'>
								Resetar stake ao vencer
							</span>
						</label>
					</div>
				</div>

				<div className='bg-orange-900/20 border border-orange-500/40 rounded-lg p-4'>
					<h3 className='font-bold mb-3 text-orange-300'>
						⚠️ Simulação de Martingale
					</h3>

					<div className='space-y-2 text-sm'>
						<p className='text-gray-300'>
							Stake inicial: <strong>${stake.toFixed(2)}</strong>
						</p>

						{martingaleConfig.enabled && (
							<>
								<div className='border-t border-orange-500/30 pt-2 mt-2'>
									<p className='text-xs text-gray-400 mb-2'>
										Progressão após LOSSes:
									</p>
									{[...Array(martingaleConfig.maxLevels + 1)].map(
										(_, level) => {
											const levelStake =
												stake *
												Math.pow(
													martingaleConfig.multiplier,
													level,
												);
											const totalRisk =
												(stake *
													(Math.pow(
														martingaleConfig.multiplier,
														level + 1,
													) -
														1)) /
												(martingaleConfig.multiplier - 1);

											return (
												<div
													key={level}
													className={`flex justify-between py-1 ${
														level ===
														martingaleConfig.currentLevel
															? 'bg-orange-600/30 px-2 rounded'
															: ''
													}`}
												>
													<span className='text-xs'>
														{level === 0
															? 'Inicial'
															: `Nível ${level}`}
														:
													</span>
													<span className='font-bold'>
														${levelStake.toFixed(2)}
														{level > 0 && (
															<span className='text-xs text-red-300 ml-2'>
																(Risco: $
																{totalRisk.toFixed(2)})
															</span>
														)}
													</span>
												</div>
											);
										},
									)}
								</div>

								<div className='border-t border-orange-500/30 pt-2 mt-3'>
									<p className='text-xs font-bold text-orange-300'>
										Nível Atual: {martingaleConfig.currentLevel}
										/{martingaleConfig.maxLevels}
									</p>
									<p className='text-xs font-bold text-orange-300'>
										Stake Atual: $
										{martingaleConfig.currentStake.toFixed(2)}
									</p>
								</div>
							</>
						)}

						{!martingaleConfig.enabled && (
							<p className='text-xs text-gray-400 italic'>
								Ative o Martingale para ver a progressão
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};