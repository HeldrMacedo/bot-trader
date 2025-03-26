"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState } from "react";
import TicksGraph from "./TicksGraph";

const TicksTestOLD = () => {
  const [ticks, setTicks] = useState({
    R_100: [],
    R_75: [],
    R_50: [],
    R_25: [],
    R_10: [],
  });
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
        parseInt(
          tick.raw.quote
            .toFixed(
              symbol == "R_100"
                ? 2
                : symbol == "R_25" || symbol == "R_10"
                ? 3
                : 4
            )
            .toString()
            .slice(-1)
        )
      );
      setTicks((prev) => ({ ...prev, [symbol]: listTicks }));
      ticksStream.onUpdate((tick) => {
        if (symbol == "R_25" || symbol == "R_10")
          console.log(symbol, tick.raw.quote);
        const lastDigit = parseInt(
          tick.raw.quote
            .toFixed(
              symbol == "R_100"
                ? 2
                : symbol == "R_25" || symbol == "R_10"
                ? 3
                : 4
            )
            .toString()
            .slice(-1)
        );
        setTicks((prev) => ({
          ...prev,
          [symbol]: [...prev[symbol], lastDigit].slice(-500),
        }));
      });
    };

    fetchTicks("R_100");
    fetchTicks("R_75");
    fetchTicks("R_50");
    fetchTicks("R_25");
    fetchTicks("R_10");

    return () => {
      connection.close();
    };
  }, []);

  return (
    <div>
      <span className="flex items-center gap-2 text-lg font-bold mb-4 mt-4 text-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
          />
        </svg>
        Distribuição
      </span>
      
      {/*<div className="flex flex-col md:flex-row gap-4">*/}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
          <TicksGraph
            ticksProp={ticks[volatility]}
            selectedLastTicksProp={10}
          />
        </div>

        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
          <TicksGraph
            ticksProp={ticks[volatility]}
            selectedLastTicksProp={25}
          />
        </div>

        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
          <TicksGraph
            ticksProp={ticks[volatility]}
            selectedLastTicksProp={50}
          />
        </div>
      </div>
        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow w-1/2 justify-end">
        <div
            onClick={() => setVolatility("R_100")}
            className="mb-4 p-1 bg-white rounded-md shadow-md"
            style={{
              cursor: "pointer",
              border: volatility === "R_100" ? "1px solid red" : "",
            }}
          >
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
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
            onClick={() => setVolatility("R_75")}
            className="mb-4 p-1 bg-white rounded-md shadow-md"
            style={{
              cursor: "pointer",
              border: volatility === "R_75" ? "1px solid red" : "",
            }}
          >
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
              Índice de volatilidade 75
            </h2>
            <div className="flex space-x-1">
              {ticks.R_75.slice(-10).map((digit, index) => (
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
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
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

          <div
            onClick={() => setVolatility("R_25")}
            className="mb-4 p-1 bg-white rounded-md shadow-md"
            style={{
              cursor: "pointer",
              border: volatility === "R_25" ? "1px solid red" : "",
            }}
          >
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
              Índice de volatilidade 25
            </h2>
            <div className="flex space-x-1">
              {ticks.R_25.slice(-10).map((digit, index) => (
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
            onClick={() => setVolatility("R_10")}
            className="mb-4 p-1 bg-white rounded-md shadow-md"
            style={{
              cursor: "pointer",
              border: volatility === "R_10" ? "1px solid red" : "",
            }}
          >
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
              Índice de volatilidade 10
            </h2>
            <div className="flex space-x-1">
              {ticks.R_10.slice(-10).map((digit, index) => (
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
