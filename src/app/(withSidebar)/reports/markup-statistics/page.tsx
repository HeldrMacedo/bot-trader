"use client";

import { useAuth } from "@/app/hooks/useAuth";
import MarkupStatisticsReport from "./components/MarkupStatisticsReport";

export default function MarkupStatisticsPage() {
  const auth = useAuth();

  if (!auth)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-lg">
            Estamos verificando suas credenciais...
          </p>
        </div>
      </div>
    );

  // Verificar se o usuário tem permissão para acessar esta página
//   if (auth.role !== "admin") {
//     return (
//       <div className="bg-principal p-6 rounded-lg shadow-md text-gray-400">
//         <h1 className="text-xl font-bold mb-6">Acesso Negado</h1>
//         <p>Você não tem permissão para acessar esta página.</p>
//       </div>
//     );
//   }

  return (
    <div className="mx-auto max-w-[1500px]">
      <MarkupStatisticsReport />
    </div>
  );
}