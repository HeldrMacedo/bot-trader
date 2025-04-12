"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {DerivService} from "@/app/services/DerivService";

interface BuyTableProps {
  authToken?: string;
  currency?: string;
  isVirtual?: boolean;
  multiplicadorProp: (data: string) => void;
}


const APP_ID = process.env.NEXT_PUBLIC_APPID;

const BuyTable = ({ authToken, currency, isVirtual, multiplicadorProp }: BuyTableProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const authTokenRef = useRef(authToken);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [multiplicador, setMultiplicador] = useState("1");
  const derivService = DerivService.getInstance();
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  useEffect(() => {
    const contractListener = derivService.observerInstance.on('deriv.proposal_open_contract', (data) => {
      if (data.proposal_open_contract?.contract_id === activeContractId) {
        const status = data.proposal_open_contract.status;
        console.log('Status do contrato:', status);
        setPurchaseStatus(status);
        
        if (status === 'sold' || status === 'expired') {
          // Atualiza saldo e histórico quando o contrato fecha
          const account = derivService.getStorageDerivAccount()?.[0];
          if (account) {
            derivService.setAccountData(account);
          }
          setActiveContractId(null);
        }
      }
    });
  
    return () => {
      derivService.observerInstance.removeById(contractListener);
      if (activeContractId) {
        derivService.send({ forget: activeContractId });
      }
    };
  }, [activeContractId]);


  const handleBuy = async (contractType: string) => {
    try{
      
      if (!derivService.hasAuthorized) {
        throw new Error("Usuário não autenticado");
      }

      const accountInfo = derivService.getStorageDerivAccount()[0];
      if (!accountInfo) {
        setErrorMessage("Conta não encontrada");
        return;
      }

      if (!accountInfo.volatility || !accountInfo.barrier) {
        throw new Error('Configuração de trade incompleta');
      }

      const valorBase = accountInfo.amount;
      const valorReal = valorBase * parseInt(multiplicador);

      const buyID = generateValidID();
      const payload = {
        buy: buyID,
        price: valorReal,
        parameters: {
          amount: valorReal,
          //app_markup_percentage: "3",
          barrier: accountInfo.barrier.toString(),
          basis: "stake",
          contract_type: contractType,
          currency: "USD",
          duration: 1,
          duration_unit: "t",
          symbol: accountInfo.volatility,
        },
      };
      
      const buyResponse = await derivService.send(payload);
      //console.log("Buy Response:", buyResponse);
    
      if (buyResponse.error) {
        setErrorMessage(buyResponse.error.message);
        return; 
      }

      const contractId = buyResponse.buy.contract_id;
      setActiveContractId(contractId);
      setPurchaseStatus('open');

      await derivService.subscribe({
        proposal_open_contract: 1,
        contract_id: contractId
      });



    }catch(error){
      console.log(error);
    }
    
  }

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
    setSelected(derivService.currentBarrier);
  }, []);

  const handleSelect = (number: number) => {
    const newSelected = selected === number ? null : number;
    setSelected(newSelected);
    
    // Atualiza o barrier no serviço quando um novo dígito é selecionado
    if (newSelected !== null) {
      derivService.updateBarrier(newSelected);
    }
  };

  // Atualiza a referência do token quando ele muda
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);


  const handleMultiplicadorChange = (value: string) => {
    setMultiplicador(value);
    multiplicadorProp(value);
  };

  return (
    <div>
      <div className="bg-white rounded-lg mt-4 shadow-md p-6 hover:shadow-lg transition-shadow space-y-4 text-gray-800">
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
        <div className="flex gap-1">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              onClick={() => handleSelect(number)}
              className={`
            w-8 h-8 
            rounded-lg 
            border-2 
            flex items-center justify-center 
            transition-colors 
            text-lg 
            font-medium 
            ${
              selected === number
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
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
          <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
            <span className="text-gray-500">X</span>
          </div>
          <input
            type="number"
            id="entrada-inicial"
            className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
            value={multiplicador}
            onChange={(e) => handleMultiplicadorChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-6 w-full">
        <div className="flex-1">
          <button 
          onClick={() => handleBuy('DIGITOVER')}
          className="flex w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
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
          onClick={() => handleBuy('DIGITUNDER')} 
          className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
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

      <div className="flex gap-2 mt-6 w-full">
        <div className="flex-1">
          <button className="flex w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
          <i className="me-2">²</i>
            Comprar Par
          </button>
        </div>

        <div className="flex-1">
          <button className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
          <i className="me-2">³</i>
            Comprar Ímpar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyTable;
