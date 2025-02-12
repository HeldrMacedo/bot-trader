"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState } from "react";
import TicksGraph from "./TicksGraph";

const TicksTest = () => {
  const [ticks, setTicks] = useState([]);

  useEffect(() => {
    const connection = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );
    const api = new DerivAPI({ connection });

    const fetchTicks = async () => {
      const ticksStream = await api.ticks("R_100");
      const listTicksReturn = await ticksStream.history({
        count: 500,
        end: new Date(),
      });
      const listTicks = listTicksReturn.map((tick) =>
        parseInt(tick.raw.quote.toFixed(2).toString().slice(-1))
      );
      setTicks(listTicks);
      ticksStream.onUpdate((tick) => {
        const lastDigit = parseInt(
          tick.raw.quote.toFixed(2).toString().slice(-1)
        );
        setTicks((prevTicks) => [...prevTicks, lastDigit].slice(-500));
      });
    };

    fetchTicks();

    return () => {
      connection.close();
    };
  }, []);

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Distribuição</h1>

      {/* <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Índice de volatilidade 100
        </h2>
        <div className="flex space-x-2">
          {ticks.slice(-10).map((digit, index) => (
            <span key={index} className="p-2 bg-blue-500 text-white rounded-lg">
              {digit}
            </span>
          ))}
        </div>
      </div> */}

      <div className="grid grid-cols-4 gap-2">
        <TicksGraph ticksProp={ticks} selectedLastTicksProp={10} />
        <TicksGraph ticksProp={ticks} selectedLastTicksProp={25} />
        <TicksGraph ticksProp={ticks} selectedLastTicksProp={50} />
        {/* */}
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Índice de volatilidade 100
            </h2>
            <div className="flex space-x-1">
              {ticks.slice(-10).map((digit, index) => (
                <span
                  key={index}
                  className="p-2 bg-blue-500 text-white rounded-lg"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>
          {/* <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Índice de volatilidade 75
            </h2>
            <div className="flex space-x-1">
              {ticks.slice(-10).map((digit, index) => (
                <span
                  key={index}
                  className="p-2 bg-blue-500 text-white rounded-lg"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div> */}
        </div>
        {/* */}
      </div>
    </div>
  );
};

export default TicksTest;
