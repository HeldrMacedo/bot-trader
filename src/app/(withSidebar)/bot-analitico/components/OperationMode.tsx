import React, { useState } from "react";
import { Play } from "lucide-react";
import { VOLATILITIES, Volatility } from "../types";
import { ChevronDownIcon, CodeBracketIcon } from "@heroicons/react/16/solid";
interface OperationModeProps {
  mode: "manual" | "auto";
  setMode: (mode: "manual" | "auto") => void;
}

export const OperationMode: React.FC<OperationModeProps> = ({
  mode,
  setMode,
}) => {
  const [tradeType, setTradeType] = useState<Number>(1);
	const [selected, setSelected] = useState<number | null>(null);
  const handleBuy = (type: any) => {};
  const handleSelect = (number: number) => {
   	const newSelected = selected === number ? null : number;
    setSelected(newSelected);
  }

  return (
    <div className="bg-principal rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-400 mb-4">
        📈 Modo de Operação
      </h3>

      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === "manual"
                ? "bg-indigo-600 text-white"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setMode("auto")}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === "auto"
                ? "bg-orange-600 text-white"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Automático
          </button>
        </div>
      </div>
      <div>
        {mode === "manual" ? (
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Volatilidade</label>
                <div className="grid grid-cols-1">
                  <select className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-3 pr-8 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6">
                    {VOLATILITIES.map((volatility) => (
                      <option key={volatility.symbol} value={volatility.symbol}>
                        {volatility.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-400"
                  />{" "}
                </div>
              </div>
              <div>
                <span className="text-sm">Tipo de Trade</span>
                <div className="grid grid-cols-1">
                  <select
                    value={String(tradeType)}
                    onChange={(e) => setTradeType(Number(e.target.value))}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-3 pr-8 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                  >
                    <option>Selecione um tipo</option>
                    <option value={1}>Acima/Abaixo</option>
                    <option value={2}>Par/Ímpar</option>
                    <option value={3}>Diferente</option>
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-400"
                  />{" "}
                </div>
              </div>

              <div>
                <label htmlFor="">Entrada:</label>
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 text-gray-400 start-0 flex items-center ps-3.5 pointer-events-none">
                    <span className="text-gray-400">$</span>
                  </div>
                  <input
                    type="text"
                    id="entrada-inicial"
                    className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-8 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                    placeholder="0.00"
                    value={0}
                    disabled={true}
                    onChange={(e) => ""}
                  />
                </div>
              </div>
              <div>
                <label>
                  <span>Multiplicador</span>
                </label>
                <div className="relative">
              <div className="absolute inset-y-0 text-gray-400 start-0 flex items-center ps-3.5 pointer-events-none">
                <span className="text-gray-500">X</span>
              </div>
              <input
                type="number"
                id="entrada-inicial"
                className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-8 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                value={0}
                onChange={(e) => ''}
              />
            </div>
              </div>
            </div>

			<div className="mb-4">
				<div className="flex flex-col gap-2 text-sm">
					<div className="flex gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
							className="size-6"
						>
							<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.745h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99"
							/>
						</svg>

						<span>Dígitos</span>
					</div>
					<div className="flex gap-2">
						{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
							return (
								<button
									key={digit}
									onClick={() => handleSelect(digit)}
									className={`py-2 px-3 flex-1 rounded-lg font-bold transition-all ${
										selected === digit
											? 'bg-sky-600 text-white scale-110'
											: 'bg-white/10 hover:bg-white/20'
									} `}
								>
									{digit}
								</button>
							);
						})}
					</div>
        		</div>
			</div>

			<div className="flex-1">
                {tradeType === 1 && (
                  <div className="flex  gap-5  w-full bloco-botao-comprar">
                    <div className="flex-1">
                      <button
                        onClick={() => handleBuy("DIGITOVER")}
                        className="flex w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="size-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
                          />
                        </svg>
                        Comprar Acima
                      </button>
                    </div>

                    <div className="flex-1">
                      <button
                        onClick={() => handleBuy("DIGITUNDER")}
                        className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="size-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181"
                          />
                        </svg>
                        Comprar Abaixo
                      </button>
                    </div>
                  </div>
                )}
                {tradeType === 2 && (
                  <div className="flex gap-5  w-full bloco-botao-comprar">
                    <div className="flex-1">
                      <button
                        onClick={() => handleBuy("DIGITEVEN")}
                        className="flex w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                      >
                        <i className="me-2">²</i>
                        Comprar Par
                      </button>
                    </div>

                    <div className="flex-1">
                      <button
                        onClick={() => handleBuy("DIGITODD")}
                        className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                      >
                        <i className="me-2">³</i>
                        Comprar Ímpar
                      </button>
                    </div>
                  </div>
                )}

                {tradeType === 3 && (
                  <div className="flex gap-5  w-full bloco-botao-comprar">
                    <div className="flex-1">
                      <button
                        onClick={() => handleBuy("DIGITDIFF")}
                        className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                      >
                        <CodeBracketIcon
                          aria-hidden="true"
                          className="size-5"
                        />
                        Comprar Diferente
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>
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
