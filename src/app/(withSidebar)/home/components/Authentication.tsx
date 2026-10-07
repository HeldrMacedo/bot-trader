"use client";
import { DerivService } from "@/app/services/DerivService";
import { useState, forwardRef, useImperativeHandle } from "react";

const APP_ID = process.env.NEXT_PUBLIC_APPID;
const REDIRECT_URI =
  "https://869a-2804-29b8-50df-f39f-d30c-dff0-594f-ed22.ngrok-free.app/home"; // Substitua pela sua URI de redirecionamento
// const REDIRECT_URI = "http://localhost:3000/home";
export interface AuthenticationHandle {
  handleLogout: () => void;
  getSelectedAccount: () => any;
}

const Authentication = forwardRef<AuthenticationHandle>((props, ref) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const derivService = DerivService.getInstance();

  useImperativeHandle(ref, () => ({
    handleLogout: () => {
      localStorage.removeItem("deriv_accounts");
      localStorage.removeItem("token_list");
      setIsAuthenticated(false);
      setAccounts([]);
      setUserData(null);
      setError(null);
    },
    getSelectedAccount: () => selectedAccount,
  }));


  const handleLogin = () => {
    derivService.loginDeriv();
  };

  const handleClearHistory = () => {
    derivService.clearHistory();
  };

  return (
    <div className="container text-gray-800">
      <div className="flex flex-col md:flex-row gap-2">
        <button
          className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={handleLogin}
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Adicionar Conta
        </button>
        <button onClick={handleClearHistory} className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
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
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          Limpar histórico
        </button>
      </div>
    </div>
  );
});

Authentication.displayName = "Authentication";
export default Authentication;
