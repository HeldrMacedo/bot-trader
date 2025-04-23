<div className="flex flex-col md:flex-row gap-4 md:gap-3">
<div className="w-full md:w-2/3 space-y-4">
  <div className="flex md:mr-[-0.25rem] lg:gap-3">
    <TicksGraph
      ticksProp={ticks[volatility]}
      selectedLastTicksProp={10}
    />
    <TicksGraph
      ticksProp={ticks[volatility]}
      selectedLastTicksProp={25}
    />
    <TicksGraph
      ticksProp={ticks[volatility]}
      selectedLastTicksProp={50}
    />
  </div>
  <div className="flex justify-between w-full">
    <div className="flex items-center gap-2 text-lg font-bold  text-gray-800">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
      Conta conectada
    </div>
    <div>
      <Authentication ref={authenticationRef} />
    </div>
  </div>
  {accountInfo && (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-center w-full text-gray-800 border-b pb-4">
        <div className="text-sm">
          Bem vindo: {accountInfo.name}
          {purchaseStatus === "open" && (
            <span className="ml-2 p-1 text-[11px] bg-indigo-500 text-white rounded-sm font-bold">
              Operando
            </span>
          )}
          {purchaseStatus === "Comprando" && (
            <span className="ml-2 p-1 text-[11px] bg-green-500 text-white rounded-sm font-bold">
              Comprando
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="border-r-[2px] pr-2 text-sm">
            Wins: {accountInfo.results.wins ?? 0}
          </div>
          <div className="border-r-[2px] pr-2 text-sm">
            Loss: {accountInfo.results.loss ?? 0}
          </div>
          <div
            className={`${
              accountInfo.results.result > 0
                ? "text-green-600"
                : "text-red-600"
            } border-r-[2px] pr-2 text-sm`}
          >
            Resultado:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(accountInfo.results.result ?? 0)}
          </div>
          <div className="group relative inline-block">
            <button
              className="flex items-center gap-2 rounded-md bg-red-600 px-1 py-1 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              onClick={handleLougout}
              aria-describedby="tooltip-logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </button>

            {/* Tooltip */}
            <span
              id="tooltip-logout"
              role="tooltip"
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-max px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none
       before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-800"
            >
              Desconectar
              <span className="sr-only">(Ação irreversível)</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex w-full gap-4">
        <div className="mt-2 w-full">
          <label className="text-sm font-medium text-gray-700">
            Conta:
          </label>
          <div className="grid grid-cols-1">
            <select
              value={accountInfo.activeToken}
              onChange={(e) => handleAccountChange(e.target.value)}
              disabled={loading}
              defaultValue={accountInfo.activeToken}
              className="col-start-1 row-start-1 w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
            >
              {accountInfo.tokens.map((token) => (
                <option key={token.token} value={token.token}>
                  {token.is_virtual ? "Virtual " : "Real "}
                  {new Intl.NumberFormat("en-Us", {
                    style: "currency",
                    currency: "USD",
                  }).format(token.balance || "0.00")}
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
            htmlFor="entrada-inicial"
            className="text-sm font-medium text-gray-700"
          >
            Entrada inicial:
          </label>
          <div className="relative mb-6">
            <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
              <span className="text-gray-500">$</span>
            </div>
            <input
              type="text"
              id="entrada-inicial"
              className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
              placeholder="0.00"
              value={valorEntrada}
              disabled={loading}
              onChange={(e) => formatInputMoney(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-2 w-full">
          <label
            htmlFor="entrada-real"
            className="text-sm font-medium text-gray-700"
          >
            Entrada Real (Com Gale):
          </label>
          <div className="relative mb-6">
            <div className="absolute inset-y-0 text-gray-700 start-0 flex items-center ps-3.5 pointer-events-none">
              <span className="text-gray-500">$</span>
            </div>
            <input
              type="text"
              id="entrada-real"
              readOnly
              value={`${valorReal}`}
              className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm/6"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
      {accountInfo.lastTrade && (
        <div className="flex w-full justify-between text-gray-800 bg-slate-100 p-2 text-sm">
          <div className="font-bold">Última Operação</div>
          <div>
            Tipo:{" "}
            {labelContractType(accountInfo.lastTrade.contract_type)}
          </div>
          <div>Digito Buscado: {accountInfo.lastTrade.barrier}</div>
          <div>
            Digito Encontrado: {accountInfo.lastTrade.resultBarrier}
          </div>
          <div>
            Entrada:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(accountInfo.lastTrade.amount)}
          </div>
          <div
            className={`${
              accountInfo.lastTrade.profit > 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            Resultado:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(accountInfo.lastTrade.profit)}
          </div>
        </div>
      )}
    </div>
  )}
</div>
<div className="w-full md:w-1/3 space-y-4">
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    {["R_100", "R_75", "R_50", "R_25", "R_10"].map((symbol) => (
      <div
        key={symbol}
        onClick={() => setVolatility(symbol)}
        className="mb-4 p-2 text-gray-800 rounded-md shadow-md border-b-[4px] border-b-[#111827]"
        style={{
          cursor: "pointer",
          border: volatility === symbol ? "1px solid #111827" : "",
        }}
      >
        <h2 className="text-base mb-1">
          Índice de volatilidade {symbol.split("_")[1]}
        </h2>
        <div className="m-auto overflow-hidden w-full">
          <div className="flex" style={{ 
              transform: 'translateX(-125px)', 
              transition: 'transform 0.2s' 
          }}>
        {ticks[symbol].slice(-18).map((digit, index) => {
          const shouldHighlight =
                activeDigit !== null &&
                ((hoveredTradeType === "above" &&
                  digit > activeDigit) ||
                  (hoveredTradeType === "below" &&
                    digit < activeDigit) ||
                  (hoveredTradeType === "even" && digit % 2 === 0) ||
                  (hoveredTradeType === "odd" && digit % 2 !== 0));

                  return (
                    <div
                      key={index}
                      className={`px-2 mx-[1px] text-[12px] border ${
                        shouldHighlight
                          ? "bg-slate-400 text-white border-slate-500"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      {digit}
                    </div>
                  );

                })}
          </div>
        </div>
      </div>
    ))}
  </div>
  <BuyTable
    authToken={selectedAccount?.token}
    currency={selectedAccount?.currency}
    isVirtual={selectedAccount?.is_virtual}
    multiplicadorProp={handleMultiplicador}
    onPurchaseStatusChange={setPurchaseStatus}
    onHoverTradeType={setHoveredTradeType}
    onDigitHover={setActiveDigit}
  />
</div>
</div>