"use client";
import { useEffect, useState } from "react";
import { DerivService } from "@/app/services/DerivService";
import {ExclamationTriangleIcon, ClockIcon, InformationCircleIcon} from "@heroicons/react/24/outline";

export const BotTrade = () => {
  const [isStart, setIsStart] = useState(false);
  const [forgetId, setForgetId] = useState<string | null>(null);
  const [quantityTrade, setQuantityTrade] = useState<number>(0);
  const [quantityWin, setQuantityWin] = useState<number>(0);
  const [quantityLoss, setQuantityLoss] = useState<number>(0);
  const [listTrade, setListTrade] = useState<any[]>([]);

  const derivService = DerivService.getInstance();

  useEffect(() => {
    const listenerId = derivService.observerInstance.on("message", (data) => {
      if (
        data.msg_type === "transaction" &&
        data.transaction.action === "buy"
      ) {
        if (!forgetId) {
          setForgetId(data.subscription.id);
        }

        const contratcId = data.transaction.contract_id;
        derivService.subscribe({
          proposal_open_contract: 1,
          contract_id: contratcId,
        });
      }

      if (
        data.msg_type === "proposal_open_contract" &&
        (data.proposal_open_contract.status === "won" ||
          data.proposal_open_contract.status === "lost")
      ) {
        const isWin = data.proposal_open_contract.profit > 0;
      }
    });

    return () => {
      derivService.observerInstance.removeById(listenerId);
    };
  }, []);

  const handleStartBot = () => {
    setIsStart(true);
    derivService.subscribe({
      transaction: 1,
    });
  };

  const handleStopBot = () => {
    setIsStart(false);
    derivService.send({ forget: forgetId });
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-lg font-bold  text-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          className="size-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z"
          />
        </svg>
        Bot Trade
      </div>
      <div className="flex flex-col bg-white rounded-lg p-6 mt-4 shadow-md hover:shadow-lg transition-shadow">
        <div className="text-gray-800 text-sm flex">
          <div className="w-1/3">
            <span>Configuração</span>
          </div>
          <div className="w-2/3 flex justify-between">
            <span>Trade Action</span>
            {isStart ? (
              <button
                onClick={handleStopBot}
                className="flex items-center gap-3 rounded-md pr-4 pl-4 bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                  />
                </svg>
                Pause
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                className="flex items-center gap-3 rounded-md bg-green-600 pr-4 pl-4 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                  />
                </svg>
                Start
              </button>
            )}
          </div>
        </div>
        <hr className="my-2 mb-4" />
        <div className="flex">
          <div className="w-1/3 text-sm text-gray-800">
            <div className="flex gap-2 text-center">
              <div>
                <div>
                  <span>Trade</span>
                </div>
                <div>
                  <span className="text-indigo-600">{quantityTrade}</span>
                </div>
              </div>
              <div>
                <div>
                  <span>Win</span>
                </div>
                <div>
                  <span className="text-green-600">{quantityWin}</span>
                </div>
              </div>
              <div>
                <div>
                  <span>Loss</span>
                </div>
                <div>
                  <span className="text-red-600">{quantityLoss}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
            <div className="w-2/5">
              <span className="text-nowrap">Consecutive loss</span>
            </div>
            <div className="relative w-3/5">
                
                <input
                disabled={true}
                value={0}
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
            <div className="w-2/5">
              <span className="text-nowrap">Quantity loss</span>
            </div>
            <div className="relative w-3/5">
                <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                  <span className="text-gray-500"><ExclamationTriangleIcon className="w-4 h-4"/></span>
                </div>
                <input
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="w-2/5">
                <span className="text-nowrap">Stop Loss</span>
              </div>
              
              <div className="relative w-3/5">
                <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="w-2/5">
                <span className="text-nowrap">Stop Win</span>
              </div>

              <div className="relative w-3/5">
                <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="w-2/5">
                <span className="text-nowrap">Initial Value</span>
              </div>

              <div className="relative w-3/5">
                <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="w-2/5">
                <span className="text-nowrap">Stake Multiple</span>
              </div>

              <div className="relative w-3/5">
                <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              <div className="w-2/5 flex items-center gap-1">
                <span className="text-nowrap">Pause Time </span>
                <div className="bg-indigo-600 rounded-full w-4 h-4 text-center flex justify-center items-center group relative">
                  <span className="text-white text-[10px]">?</span>
                  <span
                      id="tooltip-logout"
                      role="tooltip"
                      className="absolute -top-10 left-1/2 -translate-x-1/2 w-max px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none
       before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-800"
                    >
                      Tempo em segundos
                    </span>
                </div>
              </div>

              <div className="relative w-3/5">
                <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
                  <span className="text-gray-500"><ClockIcon className="w-4 h-4"/></span>
                </div>
                <input
                  type="text"
                  id="entrada-inicial"
                  className="w-20 appearance-none rounded-md border border-gray-300 bg-white  pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                  placeholder="00:00"
                />
              </div>
            </div>
          </div>
          <div className="w-2/3">
            <div className="flex h-[180px] bg-black rounded-lg"></div>
            <div className="relative  shadow-md sm:rounded-lg mt-4 overflow-auto  h-[180px]">
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-sm text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-2">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Ref</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Code</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Start</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Exit</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">LDP</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Stake</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Payout</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Profit</div>
                    </th>
                    <th scope="col" className="px-6 py-2">
                      <div className="flex items-center">Strategy</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                    <th
                      scope="row"
                      className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                    >
                      Apple MacBook Pro 17
                    </th>
                    <td className="px-6 py-2">Silver</td>
                    <td className="px-6 py-2">Laptop</td>
                    <td className="px-6 py-2">$2999</td>
                    <td className="px-6 py-2">EXIT</td>
                    <td className="px-6 py-2">LDP</td>
                    <td className="px-6 py-2">Stake</td>
                    <td className="px-6 py-2">Payout</td>
                    <td className="px-6 py-2">Profit</td>
                    <td className="px-6 py-2">Strategy</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
