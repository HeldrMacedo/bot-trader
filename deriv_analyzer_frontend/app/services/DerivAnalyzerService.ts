// DerivAnalyzerService.ts - Frontend service to communicate with our backend
// This service follows the same pattern as wsListener.ts but for frontend-backend communication

import { EventEmitter } from 'events';

export class DerivAnalyzerService extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(private backendUrl: string = 'ws://localhost:8000') {
    super();
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.backendUrl);

      this.ws.onopen = () => {
        console.log('Connected to Deriv Analyzer backend');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('data', data);
          this.emit('realtimeUpdate', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.emit('error', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from Deriv Analyzer backend');
        this.isConnected = false;
        this.emit('disconnected');

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          console.error('Max reconnection attempts reached');
          this.emit('reconnectFailed');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Error connecting to backend:', error);
      this.emit('error', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  send(message: string): void {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  isConnectedToBackend(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // API methods to communicate with the backend
  async fetchStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/api/status`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching status:', error);
      throw error;
    }
  }

  async fetchAnalysis(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/api/analysis`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching analysis:', error);
      throw error;
    }
  }
}