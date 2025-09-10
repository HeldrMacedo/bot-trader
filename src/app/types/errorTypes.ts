export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  source: 'trading' | 'connection' | 'validation' | 'system';
  details?: any;
}

export interface ErrorStats {
  errors: ErrorNotification[];
  lastError?: ErrorNotification;
  errorCount: number;
}