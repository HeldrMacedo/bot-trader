"use client";

import DerivAPI from "@deriv/deriv-api";
import { useEffect, useState, useRef  } from "react";
import TicksGraph from "./TicksGraph";
import Authentication, {AuthenticationHandle} from "./Authentication";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

const APP_ID = 67957;

const TicksTest = () => {
  const [ticks, setTicks] = useState({
    R_100: [],
    R_75: [],
    R_50: [],
    R_25: [],
    R_10: [],
  });
  const [volatility, setVolatility] = useState("R_100");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const authenticationRef = useRef<AuthenticationHandle>(null);

  useEffect(() => {
    const storedAccounts = JSON.parse(
      localStorage.getItem("deriv_accounts") || "[]"
    );
    console.log(storedAccounts);
    if (storedAccounts.length > 0) {
      setAccounts(storedAccounts);
    }
  }, []);

  const authorizeAccount = async (token) => {
    try {
      const ws = new WebSocket(
        "wss://ws.derivws.com/websockets/v3?app_id=" + APP_ID
      );

      await new Promise((resolve) => {
        ws.onopen = resolve;
      });

      ws.send(
        JSON.stringify({
          authorize: token,
        })
      );

      ws.onmessage = (message) => {
        const response = JSON.parse(message.data);

        if (response.error) {
          setError(response.error.message);
          ws.close();
          return;
        }

        if (response.authorize) {
          setUserData({
            ...response.authorize,
            balance: response.authorize.balance,
            accounts: response.authorize.account_list,
          });
          ws.close();
        }
      };
    } catch (err) {
      setError("Erro na conexão com a API Deriv");
    }
  };

  const handleLougout = () => {
    if (authenticationRef.current) {
      authenticationRef.current.handleLogout();
    }
    
  };

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
      <span className="flex justify-between gap-2 text-lg font-bold  text-gray-800 mb-4 mt-4">
        <div className="flex items-center gap-2">
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
        </div>
        <div>Índ. Volatilidade {volatility.split("_")[1]}</div>
      </span>

      {/*<div className="flex flex-col md:flex-row gap-4">*/}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 grid grid-cols-3 auto-rows-min gap-4 items-start">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={10}
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={25}
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow self-start">
            <TicksGraph
              ticksProp={ticks[volatility]}
              selectedLastTicksProp={50}
            />
          </div>
          <div className="grid col-span-3">
            <div className="flex justify-between w-full">
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
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                Conta conectada
              </div>
              <div>
                <Authentication ref={authenticationRef} />
              </div>
            </div>
            <div className="w-full bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow mt-4">
              <div className="flex justify-between w-full text-gray-800 border-b pb-4">
                <div>Bem vindo</div>
                <div className="flex gap-2">
                  <div className="border-r-[2px] pr-2">Wins: 0</div>
                  <div className="border-r-[2px] pr-2">Loss: 0</div>
                  <div className="border-r-[2px] pr-2">Resultado: $0</div>
                  <button onClick={handleLougout}>Logout</button>
                </div>
              </div>
              <div className="flex w-full gap-4">
                <div className="mt-2 w-full">
                  <label className="text-sm font-medium text-gray-700">
                    Conta:
                  </label>
                  <div className="grid grid-cols-1">
                    <select
                      onChange={(e) => {
                        const account = JSON.parse(e.target.value);
                        setSelectedAccount(account);
                        authorizeAccount(account.token);
                      }}
                      className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                    >
                      <option value="">Selecione uma Conta</option>
                      {accounts.map((account, index) => (
                        <option
                          key={index}
                          value={JSON.stringify(account)}
                          selected={account.is_virtual}
                        >
                          {account.is_virtual ? "Conta Virtual" : "Conta Real"}{" "}
                          ({account.currency.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-400"
                    />{" "}
                  </div>
                </div>
                <div className="mt-2 w-full">
                  <label
                    htmlFor="input-group-1"
                    className="text-sm font-medium text-gray-700"
                  >
                    Entrada inicial:
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
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
                          d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text text-gray-700 "
                      id="input-group-1"
                      className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 ps-10 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                      placeholder="name@flowbite.com"
                    />
                  </div>
                </div>
                <div className="mt-2 w-full">
                  <label
                    htmlFor="input-group-1"
                    className="text-sm font-medium text-gray-700"
                  >
                    Entrada Real (Com Gale):
                  </label>
                  <div className="relative mb-6">
                    <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
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
                          d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text text-gray-700 "
                      id="input-group-1"
                      className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 ps-10 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
                      placeholder="name@flowbite.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div
            onClick={() => setVolatility("R_100")}
            className="mb-4 p-2  text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
            style={{
              cursor: "pointer",
              border: volatility === "R_100" ? "1px solid #111827" : "",
            }}
          >
            <h2 className="text-base mb-1">Índice de volatilidade 100</h2>
            <div className="flex">
              {ticks.R_100.slice(-18).map((digit, index) => (
                <span key={index} className="pr-1 pl-1 text-[12px] border">
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <div
            onClick={() => setVolatility("R_75")}
            className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827] "
            style={{
              cursor: "pointer",
              border: volatility === "R_75" ? "1px solid #111827" : "",
            }}
          >
            <h2 className="text-base mb-1">Índice de volatilidade 75</h2>
            <div className="flex">
              {ticks.R_75.slice(-18).map((digit, index) => (
                <span key={index} className="pr-1 pl-1 text-[12px] border">
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <div
            onClick={() => setVolatility("R_50")}
            className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
            style={{
              cursor: "pointer",
              border: volatility === "R_50" ? "1px solid #111827" : "",
            }}
          >
            <h2 className="text-base mb-1">Índice de volatilidade 50</h2>
            <div className="flex">
              {ticks.R_50.slice(-18).map((digit, index) => (
                <span key={index} className="pr-1 pl-1 text-[12px] border">
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <div
            onClick={() => setVolatility("R_25")}
            className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
            style={{
              cursor: "pointer",
              border: volatility === "R_25" ? "1px solid #111827" : "",
            }}
          >
            <h2 className="text-base mb-1">Índice de volatilidade 25</h2>
            <div className="flex ">
              {ticks.R_25.slice(-18).map((digit, index) => (
                <span key={index} className="pr-1 pl-1 text-[12px] border">
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <div
            onClick={() => setVolatility("R_10")}
            className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
            style={{
              cursor: "pointer",
              border: volatility === "R_10" ? "1px solid #111827" : "",
            }}
          >
            <h2 className="text-base mb-1 ">Índice de volatilidade 10</h2>
            <div className="flex">
              {ticks.R_10.slice(-18).map((digit, index) => (
                <span key={index} className="pr-1 pl-1 text-[12px] border">
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
