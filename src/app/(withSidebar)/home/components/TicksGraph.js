"use client";

import { useEffect, useState } from "react";

const TicksGraph = ({ ticksProp, selectedLastTicksProp }) => {
  const [ticks, setTicks] = useState([]);
  const [digitPercentages, setDigitPercentages] = useState([]);
  const [selectedLastTicks, setSelectedLastTicks] = useState(
    selectedLastTicksProp
  );

  useEffect(() => {
    setTicks(ticksProp);
  }, [ticksProp]);

  useEffect(() => {
    const digitCounts = Array(10).fill(0);

    ticks.slice(-selectedLastTicks).forEach((digit) => {
      digitCounts[digit]++;
    });

    const percentagesArray = digitCounts.map((count, digit) => ({
      digit,
      percentage: (count / selectedLastTicks) * 100 || 0,
    }));

    setDigitPercentages(percentagesArray);
  }, [ticks, selectedLastTicks]);

  const getBarColor = (percentage) => {
    if (percentage < 10) return "red";
    if (percentage >= 10 && percentage < 20) return "#c95512";
    if (percentage === 20) return "green";
    if (percentage > 20) return "yellow";
    return "blue";
  };

  const handleSelectChange = (event) => {
    setSelectedLastTicks(Number(event.target.value));
  };

  return (
    <div>
      <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg h-auto">
        <select
          className="text-black text-lg font-semibold mb-4"
          onChange={handleSelectChange}
          value={selectedLastTicks}
        >
          <option value="10">Últimos 10 dígitos</option>
          <option value="25">Últimos 25 dígitos</option>
          <option value="50">Últimos 50 dígitos</option>
          <option value="100">Últimos 100 dígitos</option>
          <option value="250">Últimos 250 dígitos</option>
          <option value="500">Últimos 500 dígitos</option>
        </select>
        <div className="grid grid-cols-10 items-end space-x-2 h-32">
          {digitPercentages.map((data, index) => (
            <div
              key={index}
              className="flex flex-col-reverse items-center h-full"
            >
              <div
                className="w-full"
                style={{
                  height: `${data.percentage * 2 + 1}%`,
                  backgroundColor: getBarColor(data.percentage),
                }}
              />
              <span className="block text-xs text-center text-white">
                {data.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-10 justify-between items-end space-x-2 text-center">
          {Array.from({ length: 10 }).map((_, index) => (
            <span className="text-xs text-center text-white" key={index}>
              {index}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TicksGraph;
