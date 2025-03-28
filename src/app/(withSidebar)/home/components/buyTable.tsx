"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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

  const handleSelect = (number: number) => {
    setSelected(selected === number ? null : number);
  };

  // Atualiza a referência do token quando ele muda
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  // Função de autorização que pode ser usada em qualquer lugar
  const authorizeConnection = useCallback((socket: WebSocket) => {
    if (authTokenRef.current && socket.readyState === WebSocket.OPEN) {
      console.log("Enviando autorização...");
      socket.send(
        JSON.stringify({
          authorize: authTokenRef.current,
        })
      );
    }
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
      );

      socket.onopen = () => {
        console.log("✅ Conectado à Deriv API");
        setIsConnected(true);
        setErrorMessage("");

        // Autoriza imediatamente se tivermos um token
        if (authTokenRef.current) {
          authorizeConnection(socket);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Dados recebidos:", data);

          if (data.error) {
            console.error("❌ Erro da API:", data.error.message);
            setErrorMessage(`Erro: ${data.error.message}`);

            if (
              data.error.code === "AuthorizationRequired" &&
              authTokenRef.current
            ) {
              authorizeConnection(socket);
            }
            return;
          }

          if (data.authorize) {
            console.log("✅ Autorizado com sucesso");
            setIsAuthorized(true);
            return;
          }

          if (data.proposal) {
            setProposalId(data.proposal.id);
            console.log("Proposal ID recebido:", data.proposal.id);
          }

          if (data.buy) {
            setPurchaseStatus(
              `✅ ${isVirtual ? "Demonstração" : "Compra"} realizada! ID: ${
                data.buy.contract_id
              }`
            );
            console.log("Operação realizada:", data.buy);
          }
        } catch (error) {
          console.error("Erro ao processar mensagem:", error);
        }
      };

      socket.onclose = () => {
        console.warn("⚠️ WebSocket fechado. Tentando reconectar...");
        setIsConnected(false);
        setIsAuthorized(false);
        setTimeout(connectWebSocket, 5000);
      };

      socket.onerror = (err) => {
        console.error("❌ Erro de WebSocket:", err);
        setErrorMessage("Erro de conexão com WebSocket.");
        setIsConnected(false);
        setIsAuthorized(false);
      };

      wsRef.current = socket;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isVirtual, authorizeConnection]);

  const requestProposal = (contractType: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMessage("Conexão não está ativa");
      return;
    }

    if (authTokenRef.current) {
      authorizeConnection(wsRef.current);
    }

    setPurchaseStatus("");
    setErrorMessage("");
    setProposalId(null);

    const request = {
      proposal: 1,
      amount: 10,
      basis: "stake",
      contract_type: contractType,
      currency: currency || "USD",
      duration: 1,
      duration_unit: "t",
      symbol: isVirtual ? "1HZ100V" : "R_100",
    };

    console.log("Enviando proposta:", request);
    wsRef.current.send(JSON.stringify(request));
  };

  const buyContract = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMessage("Conexão não está ativa");
      return;
    }

    if (!proposalId) {
      setErrorMessage("Nenhuma proposta disponível");
      return;
    }

    if (authTokenRef.current) {
      authorizeConnection(wsRef.current);
    }

    setPurchaseStatus(
      `🔄 Processando ${isVirtual ? "demonstração" : "compra"}...`
    );

    const buyRequest = {
      buy: proposalId,
      price: 10,
    };

    console.log("Enviando ordem de compra:", buyRequest);
    wsRef.current.send(JSON.stringify(buyRequest));
  };

  const handleMultiplicadorChange = (value: string) => {
    console.log("Valor do multiplicador:", value);
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
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 1 1 1.591 1.59l-1.83 1.83h2.16M2.99 15.745h1.125a1.125 1.125 0 0 1 0 2.25H3.74m0-.002h.375a1.125 1.125 0 0 1 0 2.25H2.99"
            />
          </svg>

          <span>Dígitos</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((number) => (
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
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
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
        <h2 className="text-xl font-bold mb-4">
          {isVirtual ? "Demonstração" : "Comprar"} Contrato
        </h2>

        <div className="mb-4">
          <p>
            Status:{" "}
            {isConnected ? (
              <span className="text-green-600">Conectado</span>
            ) : (
              <span className="text-red-600">Desconectado</span>
            )}
          </p>
          <p>
            Conta:{" "}
            {isVirtual ? (
              <span className="text-blue-600">Virtual</span>
            ) : (
              <span className="text-green-600">Real</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <button
            className="bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            onClick={() => requestProposal("DIGITOVER")}
            disabled={!isConnected || !isAuthorized}
          >
            Acima de 5
          </button>

          <button
            className="bg-green-500 text-white p-3 rounded-md hover:bg-green-600 disabled:bg-green-300"
            onClick={() => requestProposal("DIGITEVEN")}
            disabled={!isConnected || !isAuthorized}
          >
            Par
          </button>

          <button
            className="bg-red-500 text-white p-3 rounded-md hover:bg-red-600 disabled:bg-red-300"
            onClick={() => requestProposal("DIGITODD")}
            disabled={!isConnected || !isAuthorized}
          >
            Ímpar
          </button>
        </div>

        <button
          className="bg-purple-500 text-white p-3 rounded-md hover:bg-purple-600 disabled:bg-gray-400 w-full"
          onClick={buyContract}
          disabled={!proposalId || !isConnected || !isAuthorized}
        >
          {isVirtual ? "Confirmar Compra (Virtual)" : "Confirmar Compra"}
        </button>

        {purchaseStatus && (
          <p
            className={`mt-4 ${isVirtual ? "text-blue-700" : "text-green-700"}`}
          >
            {purchaseStatus}
          </p>
        )}
        {errorMessage && <p className="mt-4 text-red-600">{errorMessage}</p>}
      </div>
      <div className="flex gap-2 mt-6 w-full">
        <div className="flex-1">
          <button className="flex w-full items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
              />
            </svg>
            Comprar Acima
          </button>
        </div>

        <div className="flex-1">
          <button className="flex w-full items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
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
