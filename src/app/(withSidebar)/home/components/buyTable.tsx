"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface BuyTableProps {
  authToken?: string;
  currency?: string;
  isVirtual?: boolean;
}

const APP_ID = 70251;

const BuyTable = ({ authToken, currency, isVirtual }: BuyTableProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const authTokenRef = useRef(authToken);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

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

  return (
    <div className="p-6 bg-gray-100 rounded-lg">
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
        <p className={`mt-4 ${isVirtual ? "text-blue-700" : "text-green-700"}`}>
          {purchaseStatus}
        </p>
      )}
      {errorMessage && <p className="mt-4 text-red-600">{errorMessage}</p>}
    </div>
  );
};

export default BuyTable;
