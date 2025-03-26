"use client";
import { useState, useEffect } from "react";


const APP_ID = 67957;
//const REDIRECT_URI = 'https://51e0-45-165-128-128.ngrok-free.app/api/callback'; // Substitua pela sua URI de redirecionamento
const REDIRECT_URI = "http://localhost:3000/home";

const Authentication = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  // Verificar autenticação inicial
  useEffect(() => {
    const storedAccounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
    if (storedAccounts.length > 0) {
      setAccounts(storedAccounts);
      setIsAuthenticated(true);
    }
  }, []);

  // Processar redirecionamento após login
  useEffect(() => {
    const parseQueryParams = () => {
      const params = new URLSearchParams(window.location.search);
      const accounts = [];
      
      // Extrair contas dos parâmetros de query
      let index = 1;
      while (params.get(`acct${index}`)) {
        accounts.push({
          account: params.get(`acct${index}`),
          token: params.get(`token${index}`),
          currency: params.get(`cur${index}`),
          is_virtual: params.get(`acct${index}`).startsWith('VRTC')
        });
        index++;
      }

      if (accounts.length > 0) {
        localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
        window.history.replaceState({}, document.title, window.location.pathname);
        setAccounts(accounts);
        setIsAuthenticated(true);
      }
    };

    parseQueryParams();
  }, []);

  // Autorizar conta selecionada
  const authorizeAccount = async (token) => {
    try {
      const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=' + APP_ID);
      
      await new Promise((resolve) => {
        ws.onopen = resolve;
      });

      ws.send(JSON.stringify({
        authorize: token
      }));

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
            accounts: response.authorize.account_list
          });
          ws.close();
        }
      };

    } catch (err) {
      setError('Erro na conexão com a API Deriv');
    }
  };

  // Handlers
  const handleLogin = () => {
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('deriv_accounts');
    setIsAuthenticated(false);
    setAccounts([]);
    setUserData(null);
    setError(null);
  };

  return (
    <div className="container text-gray-800">
      {!isAuthenticated ? (
        <button className="login-button flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" onClick={handleLogin}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
</svg>
Adicionar Conta
        </button>


      ) : (
        <div className="account-container">
          {error && <div className="error">{error}</div>}

          <div className="account-selector">
            <select 
              onChange={(e) => {
                const account = JSON.parse(e.target.value);
                setSelectedAccount(account);
                authorizeAccount(account.token);
              }}
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((account, index) => (
                <option key={index} value={JSON.stringify(account)}>
                  {account.is_virtual ? 'Conta Virtual' : 'Conta Real'} ({account.currency.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {userData && (
            <div className="user-info">
              <h2>Bem-vindo, {userData.fullname}</h2>
              <div className="details">
                <p>Email: {userData.email}</p>
                <p>Saldo: {userData.balance} {userData.currency}</p>
                <p>ID da Conta: {userData.loginid}</p>
                <p>Tipo de Conta: {userData.is_virtual ? 'Virtual' : 'Real'}</p>
              </div>

              <div className="accounts-list">
                <h3>Contas Disponíveis:</h3>
                <ul>
                  {userData.accounts.map((account, index) => (
                    <li key={index}>
                      {account.loginid} - {account.currency} ({account.account_type})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
export default Authentication;
