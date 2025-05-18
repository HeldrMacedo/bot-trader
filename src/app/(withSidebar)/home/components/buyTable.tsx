"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DerivService } from "@/app/services/DerivService";
import { ChevronDownIcon, CodeBracketIcon } from "@heroicons/react/24/outline";
import { saveOperation } from "@/app/services/operationService";
import { toast } from "react-toastify";

interface BuyTableProps {
  authToken?: string;
  currency?: string;
  isVirtual?: boolean;
  multiplicadorProp: (data: string) => void;
  onPurchaseStatusChange: (status: string) => void;
  onHoverTradeType?: (
    type: "above" | "below" | "even" | "odd" | "diff" | null
  ) => void;
  onDigitHover?: (digit: number | null) => void;
}

const BuyTable = ({
  authToken,
  currency,
  isVirtual,
  multiplicadorProp,
  onPurchaseStatusChange,
  onHoverTradeType,
  onDigitHover,
}: BuyTableProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const authTokenRef = useRef(authToken);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selected, setSelected] = useState<number | null>(null);
  const [multiplicador, setMultiplicador] = useState("1");
  const derivService = DerivService.getInstance();
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [buyResponseId, setBuyResponseId] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<Number>(1);

  useEffect(() => {
    const contractListener = derivService.observerInstance.on(
      "deriv.proposal_open_contract",
      (data) => {
        if (data.proposal_open_contract?.contract_id === activeContractId) {
          const status = data.proposal_open_contract.status;
          onPurchaseStatusChange?.(status);

          if (data.proposal_open_contract.is_valid_to_sell) {
            derivService.send({ forget: data.subscription.id });
            onPurchaseStatusChange("");

            const accounts = derivService.getStorageDerivAccount();
            const account = accounts && accounts[0];
            if (!account) return;

            const finishedTradeList = {
              amount: data.proposal_open_contract.buy_price,
              barrier: handleBarrieType(data.proposal_open_contract),
              contract_type: data.proposal_open_contract.contract_type,
              finished: true,
              id: data.proposal_open_contract.id,
              market: data.proposal_open_contract.underlying,
              profit: data.proposal_open_contract.profit,
              resultBarrier:
                data.proposal_open_contract.exit_tick_display_value.slice(-1),
              status: status,
            };

            const token = localStorage.getItem("access_token");
            saveOperation({
              account: account.name,
              operationId: finishedTradeList.id,
              deposit: finishedTradeList.amount,
              result: finishedTradeList.profit,
              token: token,
              isVirtual: isVirtual,
            });

            account.finishedTradeList.push(finishedTradeList);

            const isWin = data.proposal_open_contract.profit > 0;
            account.results.wins += isWin ? 1 : 0;
            account.results.loss += isWin ? 0 : 1;
            account.results.result += data.proposal_open_contract.profit;
            account.lastTrade = finishedTradeList;

            derivService.setAccountData(account);
            derivService.saveAccount(account);

            setBuyResponseId(null);
          }
        }
      }
    );

    return () => {
      derivService.observerInstance.removeById(contractListener);
    };
  }, [buyResponseId]);

  const handleBarrieType = (data: any) => {
    if (
      data.contract_type === "DIGITEVEN" ||
      data.contract_type === "DIGITODD"
    ) {
      return data.contract_type === "DIGITEVEN" ? "Par" : "Ímpar";
    }

    return data.barrier;
  };

  const handleBuy = async (contractType: string) => {
    try {
      if (!derivService.hasAuthorized) {
        throw new Error("Usuário não autenticado");
      }

      const accountInfo = derivService.getStorageDerivAccount()[0];
      if (!accountInfo) {
        setErrorMessage("Conta não encontrada");
        return;
      }

      if (
        !accountInfo.volatility ||
        accountInfo.digits === undefined ||
        accountInfo.digits === null
      ) {
        throw new Error("Configuração de trade incompleta");
      }

      const valorBase = accountInfo.amount;
      const valorReal = valorBase * parseInt(multiplicador);

      const payload = {
        buy: 1,
        price: valorReal,
        parameters: {
          amount: valorReal,
          //app_markup_percentage: "3",
          basis: "stake",
          contract_type: contractType,
          currency: "USD",
          duration: 1,
          duration_unit: "t",
          symbol: accountInfo.volatility,
          ...(tradeType !== 2 && { barrier: accountInfo.digits }),
        },
      };

      const buyResponse = await derivService.send(payload);

      if (buyResponse.error) {
        setErrorMessage(buyResponse.error.message);
        return;
      }
      onPurchaseStatusChange("Comprando");
      const contractId = buyResponse.buy.contract_id;
      derivService.subscribe({
        proposal_open_contract: 1,
        contract_id: contractId,
      });
      setActiveContractId(contractId);
      if (buyResponse.echo_req) {
        setBuyResponseId(buyResponse.echo_req.buy);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const generateValidID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  useEffect(() => {
    setSelected(derivService.currentDigits);
  }, []);

  const handleSelect = (number: number) => {
    const newSelected = selected === number ? null : number;
    setSelected(newSelected);

    if (newSelected !== null) {
      derivService.updateDigits(newSelected);
    }
  };

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const handleMultiplicadorChange = (value: string) => {
    setMultiplicador(value);
    multiplicadorProp(value);
  };

  const onChangeTradeType = (value: Number) => {
    setTradeType(value);
  };

  const handleMouseEnter = (
    type: "above" | "below" | "even" | "odd" | "diff"
  ) => {
    onHoverTradeType?.(type);
    onDigitHover?.(selected);
  };

  const handleMouseLeave = () => {
    onHoverTradeType?.(null);
    onDigitHover?.(null);
  };

  return (
    <div className="flex gap-2">
      <div className="bg-principal w-3/5 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow space-y-4 text-gray-400">
        <div className="flex items-center gap-2 text-sm">
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
        <div className="flex flex-wrap justify-between items-center bloco-digits-sm-lg ">
          {Array.from({ length: 10 }, (_, i) => i).map((number) => (
            <button
              key={number}
              onClick={() => handleSelect(number)}
              className={`
            w-8 h-8  lg:w-10 lg:h-10 text-sm sm:text-base
            rounded-lg 
            border-2 
            flex items-center justify-center 
            transition-colors 
            font-medium 
            nowrap
            ${
              selected === number
                ? "bg-slate-400 text-white border-slate-500"
                : "bg-[#454a58] text-[oklch(92.9% 0.013 255.508)] border-gray-300 hover:bg-slate-400 hover:text-white"
            }
          `}
              aria-pressed={selected === number}
              role="button"
            >
              {number}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap  items-center bloco-digits-md lg:hidden">
          {Array.from({ length: 5 }, (_, i) => i).map((number) => (
            <button
              key={number}
              onClick={() => handleSelect(number)}
              className={`
            w-8 h-8  lg:w-10 lg:h-10 text-sm sm:text-base
            rounded-lg 
            border-2 
            flex items-center justify-center 
            transition-colors 
            font-medium 
            nowrap
            ${
              selected === number
                ? "bg-slate-400 text-white border-slate-500"
                : "bg-[#454a58] text-[oklch(92.9% 0.013 255.508)] border-gray-300 hover:bg-slate-400 hover:text-white"
            }
          `}
              aria-pressed={selected === number}
              role="button"
            >
              {number}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap  items-center bloco-digits-md lg:hidden">
          {Array.from({ length: 5 }, (_, i) => i + 5).map((number) => (
            <button
              key={number}
              onClick={() => handleSelect(number)}
              className={`
            w-8 h-8  lg:w-10 lg:h-10 text-sm sm:text-base
            rounded-lg 
            border-2 
            flex items-center justify-center 
            transition-colors 
            font-medium 
            nowrap
            ${
              selected === number
                 ? "bg-slate-400 text-white border-slate-500"
                : "bg-[#454a58] text-[oklch(92.9% 0.013 255.508)] border-gray-300 hover:bg-slate-400 hover:text-white"
            }
          `}
              aria-pressed={selected === number}
              role="button"
            >
              {number}
            </button>
          ))}
        </div>
        <hr />
        <div className="lg:flex gap-2">
          <div className="lg:w-1/2">
            <div className="flex items-center gap-2 text-sm">
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
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>

              <span>Multiplicador Gale</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 text-gray-400 start-0 flex items-center ps-3.5 pointer-events-none">
                <span className="text-gray-500">X</span>
              </div>
              <input
                type="number"
                id="entrada-inicial"
                className="w-full appearance-none rounded-md border border-gray-300 bg-gray-800 py-1.5 pl-8 pr-3 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
                value={multiplicador}
                onChange={(e) => handleMultiplicadorChange(e.target.value)}
              />
            </div>
          </div>
          <div className="lg:w-1/2">
            <div>
              <span className="text-sm">Tipo de Trade</span>
              <div className="grid grid-cols-1">
                <select
                value={String(tradeType)}
                  onChange={(e) => onChangeTradeType(Number(e.target.value))}
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
          </div>
        </div>
      </div>

      <div className="w-2/5 flex items-center">
        {tradeType === 1 && (
          <div className="flex flex-col gap-5  w-full bloco-botao-comprar">
            <div className="flex-1">
              <button
                onClick={() => handleBuy("DIGITOVER")}
                onMouseEnter={() => handleMouseEnter("above")}
                onMouseLeave={handleMouseLeave}
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
                onMouseEnter={() => handleMouseEnter("below")}
                onMouseLeave={handleMouseLeave}
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
          <div className="flex flex-col gap-5  w-full bloco-botao-comprar">
            <div className="flex-1">
              <button
                onClick={() => handleBuy("DIGITEVEN")}
                onMouseEnter={() => handleMouseEnter("even")}
                onMouseLeave={handleMouseLeave}
                className="flex w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                <i className="me-2">²</i>
                Comprar Par
              </button>
            </div>

            <div className="flex-1">
              <button
                onClick={() => handleBuy("DIGITODD")}
                onMouseEnter={() => handleMouseEnter("odd")}
                onMouseLeave={handleMouseLeave}
                className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <i className="me-2">³</i>
                Comprar Ímpar
              </button>
            </div>
          </div>
        )}

        {tradeType === 3 && (
          <div className="flex flex-col gap-5  w-full bloco-botao-comprar">
            <div className="flex-1">
              <button
                onClick={() => handleBuy("DIGITDIFF")}
                onMouseEnter={() => handleMouseEnter("diff")}
                onMouseLeave={handleMouseLeave}
                className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-4 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <CodeBracketIcon aria-hidden="true" className="size-5" />
                Comprar Diferente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyTable;
