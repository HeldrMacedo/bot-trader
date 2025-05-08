"use client";
import { useEffect, useState } from "react";
import { Operation, User } from "@prisma/client";
import { getOperations } from "./actions";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { redirect } from "next/navigation";

type OperationWithUser = Operation & { user: User };

export default function OperationsPage() {
  const [operations, setOperations] = useState<OperationWithUser[]>([]);
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadOperations = async (reset = false) => {
    setLoading(true);
    const token = localStorage.getItem("access_token") || "";
    const result = await getOperations(
      search,
      reset ? 0 : operations.length,
      itemsPerPage,
      token
    );
    if (result.error == true) {
      redirect("/home");
    }

    if (reset) {
      setOperations(result.operations);
    } else {
      setOperations((prev) => [...prev, ...result.operations]);
    }

    setHasMore(operations.length + result.operations.length < result.total);
    setLoading(false);
  };

  useEffect(() => {
    loadOperations(true); // Carrega do zero ao buscar
  }, [search, itemsPerPage]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-gray-800">
      <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
        <DocumentTextIcon className="w-6 h-6" /> Operações
      </h1>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <input
          type="text"
          placeholder="Buscar por conta ou ID da operação..."
          className="p-2 border rounded-md w-full sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
          }}
          className="p-2 border rounded-md"
        >
          <option value={5}>5 itens</option>
          <option value={10}>10 itens</option>
          <option value={20}>20 itens</option>
          <option value={50}>50 itens</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID da Operação
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Conta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Depósito
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Resultado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuário
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {operations.map((op) => (
              <tr key={op.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {op.operationId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                  {op.account}
                  {op.account?.startsWith("VRTC") ? (
                    <span className="bg-yellow-500 text-black text-xs font-medium py-1 px-3 rounded-full shadow-md hover:bg-yellow-600">
                      Virtual
                    </span>
                  ) : (
                    <span className="bg-blue-600 text-white text-xs font-medium py-1 px-3 rounded-full shadow-md hover:bg-blue-700">
                      Real
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(op.operationDate).toLocaleString("pt-BR")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  R${" "}
                  {op.deposit.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap font-medium ${
                    op.result >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  R${" "}
                  {op.result.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{op.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => loadOperations()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Mostrar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
