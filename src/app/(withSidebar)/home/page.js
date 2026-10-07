"use client";

import { useAuth } from "@/app/hooks/useAuth";
import ManualTrading from "./components/ManualTrading";

export default function HomePage() {
  const auth = useAuth();

  if (!auth)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white text-lg">
            Estamos verificando suas credenciais...
          </p>
        </div>
      </div>
    );
  return (    
     <ManualTrading />
    
  );
}
