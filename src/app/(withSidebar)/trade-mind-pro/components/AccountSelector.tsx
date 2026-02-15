import { AccountInfo, DerivService } from '@/app/services/DerivService';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';

export default function AccountSelector() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
    // Listen for storage changes in case other tabs update it
    window.addEventListener('storage', loadAccounts);

    // Subscribe to DerivService account updates
    const deriv = DerivService.getInstance();
    const handleAccountUpdate = (updatedAccount: AccountInfo | null) => {
        if (updatedAccount) {
             // Reload accounts from storage or update state directly
             loadAccounts(); 
        }
    };
    
    const listenerId = deriv.observerInstance.on('account.update', handleAccountUpdate);

    return () => {
        window.removeEventListener('storage', loadAccounts);
        deriv.observerInstance.removeById(listenerId);
    };
  }, []);

  const loadAccounts = () => {
    const accountsStr = localStorage.getItem('deriv_accounts');
    if (accountsStr) {
      try {
        const parsedAccounts: AccountInfo[] = JSON.parse(accountsStr);
        setAccounts(parsedAccounts);
        
        // Find active account
        const storedActiveToken = localStorage.getItem('activeToken') || (parsedAccounts[0]?.activeToken);
        if (storedActiveToken) {
            setActiveToken(storedActiveToken);
            // In a real scenario, we might need to find which AccountInfo holds this token
            // The AccountInfo structure has 'tokens' array.
            const account = parsedAccounts.find(acc => acc.tokens.some(t => t.token === storedActiveToken)) || parsedAccounts[0];
            setSelectedAccount(account);
        }
      } catch (e) {
        console.error("Error loading accounts", e);
      }
    }
  };

  const handleAccountChange = async (token: string, isVirtual: boolean) => {
    setLoading(true);
    setIsOpen(false);
    try {
        const deriv = DerivService.getInstance();
        const authResponse = await deriv.send({ authorize: token });
        console.log("Auth Response:", authResponse);
        // Update local state and storage
        const updatedAccounts = accounts.map(acc => {
            const hasToken = acc.tokens.some(t => t.token === token);
            if (hasToken) {
                return {
                    ...acc,
                    activeToken: token,
                    selectedLoginId: acc.tokens.find(t => t.token === token)?.loginid || "",
                    tokens: acc.tokens.map(t => ({
                        ...t,
                        balance: t.token === token ? authResponse.authorize.balance : t.balance
                    }))
                };
            }
            return acc;
        });

        localStorage.setItem("deriv_accounts", JSON.stringify(updatedAccounts));
        //localStorage.setItem("activeToken", token); // Compatibility
        
        deriv.setAccountData(updatedAccounts.find(acc => acc.tokens.some(t => t.token === token))!);
        
        setActiveToken(token);
        setSelectedAccount(updatedAccounts.find(acc => acc.tokens.some(t => t.token === token))!);
        
        // Trigger event for other components if needed
        window.dispatchEvent(new Event('accountSwitched'));

    } catch (error) {
        console.error("Error switching account", error);
    } finally {
        setLoading(false);
    }
  };

  const currentTokenData = selectedAccount?.tokens.find(t => t.token === activeToken);

  if (!selectedAccount) return null;

  return (
    <div className="mb-4 relative z-20">
      <div className="bg-[#1e1b2e] border border-gray-700 rounded-lg p-3">
         {/* Dropdown Trigger */}
         <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between text-white hover:bg-gray-800 rounded p-2 transition-colors"
            disabled={loading}
         >
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentTokenData?.is_virtual ? 'bg-blue-400' : 'bg-green-500'}`}></span>
                <div className="text-left">
                    <div className="text-sm font-bold">
                        {loading ? 'Carregando...' : (currentTokenData?.is_virtual ? 'Conta Demo' : 'Conta Real')}
                    </div>
                    <div className="text-xs text-gray-400">{currentTokenData?.loginid}</div>
                </div>
            </div>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
         </button>

         {/* Dropdown Menu */}
         {isOpen && (
             <div className="absolute top-full left-0 w-full mt-1 bg-[#2c3e50] border border-gray-600 rounded-lg shadow-xl overflow-hidden">
                 {selectedAccount.tokens.map((token) => (
                     <button
                        key={token.token}
                        onClick={() => handleAccountChange(token.token, token.is_virtual)}
                        className={`w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors ${activeToken === token.token ? 'bg-gray-700/50' : ''}`}
                     >
                         <div className="flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${token.is_virtual ? 'bg-blue-400' : 'bg-green-500'}`}></span>
                             <div className="text-left">
                                 <div className="text-sm text-white font-medium">{token.is_virtual ? 'Conta Demo' : 'Conta Real'}</div>
                                 <div className="text-xs text-gray-300">{token.loginid}</div>
                             </div>
                         </div>
                         {token.balance !== undefined && (
                             <div className="text-sm font-mono text-gray-200">
                                 {token.cur} {token.balance.toFixed(2)}
                             </div>
                         )}
                     </button>
                 ))}
             </div>
         )}

         {/* Balance Display */}
         <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between px-2">
             <div className="flex items-center gap-2 text-gray-300">
                 <span className="text-lg">💰</span>
                 <div className="text-xs font-medium">Saldo da Conta</div>
             </div>
             <div className="text-right">
                 <div className="text-lg font-bold text-white tracking-wide">
                     <span className="text-xs text-gray-400 mr-1">{currentTokenData?.cur}</span>
                     {currentTokenData?.balance?.toFixed(2) || '0.00'}
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
}
