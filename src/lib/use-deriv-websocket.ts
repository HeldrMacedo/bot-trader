/**
 * React hook for managing WebSocket connection to Deriv Analyzer API
 * Provides real-time updates for analysis and trading signals
 */

import { useState, useEffect, useRef } from 'react';
import { AnalysisResponse } from './deriv-api-client';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastUpdate: string | null;
  analysis: AnalysisResponse | null;
  error: string | null;
}

const useDerivWebSocket = () => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    lastUpdate: null,
    analysis: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  useEffect(() => {
    connectWebSocket();

    return () => {
      cleanup();
    };
  }, []);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Create WebSocket connection to the API
      const ws = new WebSocket('ws://localhost:8000/ws/updates');
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data: AnalysisResponse = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            analysis: data,
            lastUpdate: new Date().toISOString(),
          }));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setState(prev => ({ ...prev, error: 'Error parsing data from server' }));
        }
      };

      ws.onclose = (event) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setState(prev => ({
            ...prev,
            error: `Failed to reconnect after ${maxReconnectAttempts} attempts`
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ ...prev, error: 'Failed to create WebSocket connection', isConnecting: false }));
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  };

  const cleanup = () => {
    disconnectWebSocket();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const reconnect = () => {
    disconnectWebSocket();
    setTimeout(connectWebSocket, 1000);
  };

  return {
    ...state,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    reconnect,
  };
};

export default useDerivWebSocket;