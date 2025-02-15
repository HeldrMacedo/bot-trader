"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState } from "react";
import TicksGraph from "./TicksGraph";

const TicksTest = () => {
  const [ticks, setTicks] = useState({ R_100: [], R_50: [] });
  const [volatility, setVolatility] = useState("R_100");

  useEffect(() => {
    const connection = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );
    const api = new DerivAPI({ connection });

    const fetchTicks = async (symbol) => {
      const ticksStream = await api.ticks(symbol);
      const listTicksReturn = await ticksStream.history({
        count: 500,
        end: new Date(),
      });
      const listTicks = listTicksReturn.map((tick) =>
        parseInt(tick.raw.quote.toFixed(2).toString().slice(-1))
      );
      setTicks((prev) => ({ ...prev, [symbol]: listTicks }));
      ticksStream.onUpdate((tick) => {
        const lastDigit = parseInt(
          tick.raw.quote.toFixed(2).toString().slice(-1)
        );
        setTicks((prev) => ({
          ...prev,
          [symbol]: [...prev[symbol], lastDigit].slice(-500),
        }));
      });
    };

    fetchTicks("R_100");
    fetchTicks("R_50");

    return () => {
      connection.close();
    };
  }, []);

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Distribuição</h1>
      <div className="grid grid-cols-4 gap-2">
        <TicksGraph ticksProp={ticks[volatility]} selectedLastTicksProp={10} />
        <TicksGraph ticksProp={ticks[volatility]} selectedLastTicksProp={25} />
        <TicksGraph ticksProp={ticks[volatility]} selectedLastTicksProp={50} />

        <div>
          <div
            onClick={() => setVolatility("R_100")}
            className="mb-4 p-1 bg-white rounded-md shadow-md"
            style={{
              cursor: "pointer",
              border: volatility === "R_100" ? "1px solid red" : "",
            }}
          >
            <h2 className="text-lg font-semibold mb-1">
              Índice de volatilidade 100
            </h2>
            <div className="flex space-x-1">
              {ticks.R_100.slice(-10).map((digit, index) => (
                <span
                  key={index}
                  className="p-2 bg-blue-500 text-white rounded-lg"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <div
            onClick={() => setVolatility("R_50")}
            className="mb-4 p-1 bg-white rounded-md shadow-md"
            style={{
              cursor: "pointer",
              border: volatility === "R_50" ? "1px solid red" : "",
            }}
          >
            <h2 className="text-lg font-semibold mb-1">
              Índice de volatilidade 50
            </h2>
            <div className="flex space-x-1">
              {ticks.R_50.slice(-10).map((digit, index) => (
                <span
                  key={index}
                  className="p-2 bg-blue-500 text-white rounded-lg"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicksTest;
