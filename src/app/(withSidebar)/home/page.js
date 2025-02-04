"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { checkToken } from "@/app/services/userService";

export default function HomePage() {
  const auth = useAuth();
  if (!auth)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-black text-lg">
            Estamos verificando suas credenciais...
          </p>
        </div>
      </div>
    );
  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Conteúdo do dashboard.</p>
    </div>
  );
}
