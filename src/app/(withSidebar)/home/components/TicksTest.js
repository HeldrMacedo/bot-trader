"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const TicksTest = () => {
  const [ticks, setTicks] = useState([]);
  const [digitPercentages, setDigitPercentages] = useState([]);

  useEffect(() => {
    const connection = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );
    const api = new DerivAPI({ connection });

    const fetchTicks = async () => {
      const ticksStream = await api.ticks("R_100");
      ticksStream.onUpdate((tick) => {
        const lastDigit = parseInt(tick.raw.quote.toString().slice(-1));
        setTicks((prevTicks) => [...prevTicks, lastDigit].slice(-10));
      });
    };

    fetchTicks();

    return () => {
      connection.close();
    };
  }, []);

  useEffect(() => {
    const digitCounts = Array(10).fill(0);

    ticks.forEach((digit) => {
      digitCounts[digit]++;
    });

    const percentagesArray = digitCounts.map((count, digit) => ({
      digit,
      percentage: (count / ticks.length) * 100 || 0,
    }));

    setDigitPercentages(percentagesArray);
  }, [ticks]);

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Teste de Ticks</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Últimos 10 Dígitos</h2>
        <div className="flex space-x-2">
          {ticks.map((digit, index) => (
            <span key={index} className="p-2 bg-blue-500 text-white rounded-lg">
              {digit}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Porcentagem de Cada Número
        </h2>
        <div className="w-full h-64">
          <ResponsiveContainer width="25%" height="100%">
            <BarChart data={digitPercentages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="digit" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="percentage" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TicksTest;
