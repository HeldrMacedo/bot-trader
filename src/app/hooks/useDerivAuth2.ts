// useDerivAuth — Hook de Autenticação Deriv

import { useState, useEffect, useCallback } from 'react';
import { derivAuth } from '../services/DerivAuthService';
import { DerivAccount, DerivAuthState } from '../services/bearbot.types';

export function useDerivAuth(): DerivAuthState & {
  login: () => void;
  loginWithToken: (token: string, isVirtual?: boolean) => void;
  logout: () => void;
  switchAccount: (token: string) => void;
  isLoading: boolean;
} {
  const [state, setState] = useState<DerivAuthState>({
    isAuthenticated: false,
    accounts: [],
    activeToken: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Verifica callback OAuth na URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('acct1')) {
      setState(s => ({ ...s, isLoading: true }));

      // Tenta legacy primeiro
      if (derivAuth.handleLegacyCallback()) {
        // Sucesso
      } else {
        // Tenta OAuth2
        derivAuth.handleCallback().catch(err => {
          console.error('OAuth callback error:', err);
          setState(s => ({ ...s, error: err.message, isLoading: false }));
        });
      }
    }

    // Carrega estado inicial
    const accounts = derivAuth.getAccounts();
    const activeToken = derivAuth.getActiveToken();
    setState({
      isAuthenticated: !!activeToken,
      accounts,
      activeToken,
      isLoading: false,
      error: null,
    });

    // Subscribe para mudanças
    const unsubscribe = derivAuth.subscribe((authState) => {
      setState({
        isAuthenticated: !!authState.activeToken,
        accounts: authState.accounts,
        activeToken: authState.activeToken,
        isLoading: false,
        error: null,
      });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(() => {
    // Configure com seu app_id e redirect_uri
    derivAuth.configure('SEU_APP_ID', `${window.location.origin}/callback`);
    derivAuth.initiateOAuthLogin();
  }, []);

  const loginWithToken = useCallback((token: string, isVirtual: boolean = false) => {
    derivAuth.loginWithToken(token, isVirtual);
  }, []);

  const logout = useCallback(() => {
    derivAuth.logout();
  }, []);

  const switchAccount = useCallback((token: string) => {
    derivAuth.switchAccount(token);
  }, []);

  return {
    ...state,
    login,
    loginWithToken,
    logout,
    switchAccount,
    isLoading: state.isLoading,
  };
}
