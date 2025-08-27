"use client";
import { useModuleAccess } from "@/app/hooks/useModuleAccess";
import { useEffect, useState, useRef, useCallback } from "react";
import BotReal from "./botReal";
import HasAcessComponet from "./hasAccessComponent";
import BotTraderX from "./bottraderx";

export default function BotTrade() {
  const [isTest, setIsTest] = useState(false);
  const { hasAccess, loading } = useModuleAccess("BotTrader");

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
      ) : hasAccess ? ( <BotTraderX /> ) : ( <HasAcessComponet /> )}

    </div>
  );
}
