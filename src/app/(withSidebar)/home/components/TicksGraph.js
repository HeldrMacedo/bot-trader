"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

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
      <div className="flex h-[180px] w-[33.333%] grow-1 flex-col bg-principal rounded-lg shadow-md p-2">
        <div className="grid grid-cols-1">
            <select
              onChange={handleSelectChange}
              value={selectedLastTicks}
              className="
              col-start-1 
              row-start-1 
              w-full 
              appearance-none  
              border 
              border-gray-300
              bg-gray-800
              py-1.5 
              pl-3 
              pr-8 text-sm md:text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 "
            >
              <option value="10">Últimos 10 dígitos</option>
              <option value="25">Últimos 25 dígitos</option>
              <option value="50">Últimos 50 dígitos</option>
              <option value="100">Últimos 100 dígitos</option>
              <option value="250">Últimos 250 dígitos</option>
              <option value="500">Últimos 500 dígitos</option>
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-400"
            />
          </div>
          <div className="flex w-full h-full bg-gray-800">
            {digitPercentages.map((data, index) => (
              <div key={index} className="flex flex-col items-center h-full w-[10%]">
              <span className="mt-auto text-[10px]">
              {data.percentage.toFixed(0)}%
              </span>
              <div className="w-full transition-[height] duration-200 ease-linear" style={{
                  height: `${data.percentage * 2 + 1}%`,
                  backgroundColor: getBarColor(data.percentage),
                }}></div>
              <span className="text-[14px]">{index}</span>
            </div>
            ))}
            
          </div>
      </div>
    
  );
};

export default TicksGraph;
