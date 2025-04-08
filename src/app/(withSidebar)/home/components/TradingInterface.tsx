import { useEffect, useState } from 'react';
//import { DerivService } from '@/app/services/DerivServiceTest';
import { DerivService, AccountInfo, TokenData } from '@/app/services/DerivServiceTest';
import { Observer } from '@/app/services/simpleObserver';

interface AccountSelectorProps {
  onAccountChange: (accountInfo: any) => void;
}

export const TradingInterface =  ({ onAccountChange }: AccountSelectorProps) => {
  const deriv = DerivService.getInstance();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const savedAccounts = localStorage.getItem("deriv_accounts");
    if(savedAccounts) {
      const accounts: AccountInfo[] = JSON.parse(savedAccounts);
      if(accounts.length > 0) {
        setAccountInfo(accounts[0]);
      }
    }
  }, []);

  // Atualizar quando houver mudanças via observer
  useEffect(() => {
    const listener = deriv.observerInstance.on('account.update', (newAccount: AccountInfo) => {
      setAccountInfo(newAccount);
    });

    return () => deriv.observerInstance.removeById(listener);
  }, []);

  const handleAccountChange = async (token: string) => {
    if(!accountInfo) return;

    setLoading(true);
    try {
      // 1. Atualizar autenticação
      const authResponse = await deriv.send({ authorize: token });
      
      // 2. Atualizar dados locais
      const updatedAccount: AccountInfo = {
        ...accountInfo,
        activeToken: token,
        selectedLoginId: accountInfo.tokens.find(t => t.token === token)?.loginid || '',
        tokens: accountInfo.tokens.map(t => ({
          ...t,
          balance: t.token === token ? authResponse.authorize.balance : t.balance
        }))
      };

      // 3. Persistir e notificar
      localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
      deriv.setAccountData(updatedAccount);
      onAccountChange(updatedAccount);

    } catch (error) {
      console.error("Erro na autenticação:", error);
    }
    setLoading(false);
  };

  const handleAmountChange = (newAmount: number) => {
    if(!accountInfo) return;

    const updatedAccount: AccountInfo = {
      ...accountInfo,
      amount: newAmount
    };

    localStorage.setItem("deriv_accounts", JSON.stringify([updatedAccount]));
    deriv.setAccountData(updatedAccount);
    onAccountChange(updatedAccount);
  };

  if(!accountInfo) return <div>Carregando contas...</div>;

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      {/* Seletor de Conta */}
      <div>
        <label className="block text-sm font-medium mb-2">Conta:</label>
        <select
          value={accountInfo.activeToken}
          onChange={(e) => handleAccountChange(e.target.value)}
          className="w-full p-2 border rounded-md bg-white"
          disabled={loading}
        >
          {accountInfo.tokens.map((token) => (
            <option key={token.token} value={token.token}>
              {token.is_virtual ? 'Virtual' : 'Real'} - ${ new Intl.NumberFormat("en-Us", {
                              style: "currency",
                              currency: "USD",
                            }).format(token.balance || '0.00') }
            </option>
          ))}
        </select>
      </div>

      {/* Campo Valor Inicial */}
      <div>
        <label className="block text-sm font-medium mb-2">Valor Inicial ($):</label>
        <input
          type="number"
          step="0.01"
          min="0.10"
          max={accountInfo.tokens.find(t => t.token === accountInfo.activeToken)?.balance || 1000}
          value={accountInfo.amount}
          onChange={(e) => handleAmountChange(Number(e.target.value))}
          className="w-full p-2 border rounded-md bg-white"
          disabled={loading}
        />
        <div className="text-xs text-gray-500 mt-1">
          Saldo disponível: ${accountInfo.tokens.find(t => t.token === accountInfo.activeToken)?.balance?.toFixed(2)}
        </div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};