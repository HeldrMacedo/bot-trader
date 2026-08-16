"use client";

import { useModuleAccess } from "@/app/hooks/useModuleAccess";
import HasAcessComponet from "../components/hasAccessComponent";
import BearBotUltra from "./bearBotUltra2";

export default function Page() {
  const { hasAccess, loading } = useModuleAccess("BearBotUltra2.0");

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <p className="text-blue-500 text-sm font-medium">
              Verificando permissões...
            </p>
          </div>
        </div>
      ) : hasAccess ? (
        <BearBotUltra />
      ) : (
        <HasAcessComponet />
      )}
    </div>
  );
}
