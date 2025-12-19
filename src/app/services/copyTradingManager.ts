import jwt from 'jsonwebtoken';
import { CopyTradingService } from './copyTradingService';

interface UserCopyTrading {
  userId: string;
  demoToken: string;
  realToken: string;
  copyTradingService: CopyTradingService;
  createdAt: Date;
  lastActivity: Date;
}

interface UserStats {
  userId?: string;
  demoAccount: {
    token?: string;
    isConnected?: boolean;
    transactions?: any[];
    totalProfit?: number;
    totalLoss?: number;
    consecutiveLosses?: number;
  };
  realAccount: {
    token?: string;
    isConnected?: boolean;
    transactions?: any[];
    totalProfit?: number;
    totalLoss?: number;
    totalWin?: number;
    totalValueWin?: number;
    totalValueLoss?: number;
  };
  copyTrading: {
    isRunning?: boolean;
    signalsReceived?: number;
    tradesExecuted?: number;
    errors?: number;
    isProcessingEnabled?: boolean;
    lastSignalTime?: string;
    lastTradeTime?: string;
  };
  consecutiveLosses?: number;
  realTransactions?: any[];
  console?: any[];
  timePause?: number;
  createdAt?: Date;
  lastActivity?: Date;
  balance?: number;
  errors?: any;
}

export class CopyTradingManager {
  private static instance: CopyTradingManager;
  private userServices = new Map<string, UserCopyTrading>();
  // Removido: cleanupInterval - limpeza automática desativada
  
  // Tempo limite de inatividade (30 minutos)
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000;

  private constructor() {
    // Removido: cleanup automático para evitar parar bots aguardando sinais
  }

  public static getInstance(): CopyTradingManager {
    if (!CopyTradingManager.instance) {
      CopyTradingManager.instance = new CopyTradingManager();
    }
    return CopyTradingManager.instance;
  }
  // Valida JWT e retorna userId
  private validateJWT(token: string): string {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      return decoded.userId;
    } catch (error) {
      throw new Error('Token JWT inválido');
    }
  }

  public startCopyTrading(jwtToken: string, demoToken: string, realToken: string, configure: any): { success: boolean; userId: string; message: string } {
    try {

      const userId = this.validateJWT(jwtToken);
       if (this.userServices.has(userId)) {
      const existing = this.userServices.get(userId)!;
      existing.copyTradingService.stop();
      this.userServices.delete(userId);
    }
    const copyTradingService = new CopyTradingService(demoToken, realToken, userId, configure);

    this.userServices.set(userId, {
      userId,
      demoToken,
      realToken,
      copyTradingService,
      createdAt: new Date(),
      lastActivity: new Date()
    });

    copyTradingService.start();

    return {
      success: true,
      userId,
      message: 'Copy trading iniciado com sucesso'
    };
    } catch (error) {
      return { success: false, userId: '', message: error.message };
    }   
  }

  public getStatus(jwtToken: string): UserStats | { isRunning: false; message: string } {
  const userId = this.validateJWT(jwtToken);
  const userService = this.userServices.get(userId);
  
  if (!userService) {
    return { isRunning: false, message: 'Copy trading não iniciado' };
  }

  // Atualizar última atividade
  userService.lastActivity = new Date();
  
  const stats = userService.copyTradingService.getStats();
  
  return {
    demoAccount: {
     
    },
    realAccount: {
      totalLoss: stats.realAccount?.totalLoss,
      totalWin: stats.realAccount?.totalWin,
      totalProfit: stats.realAccount?.totalProfit,
      totalValueWin: stats.realAccount?.totalValueWin,
      totalValueLoss: stats.realAccount?.totalValueLoss,
      transactions: stats.realAccount?.transactions || [],
    },
    copyTrading: {
      isRunning: stats.isRunning,
    },
    consecutiveLosses: stats.trading.consecutiveLosses,
    console: stats.console || [],
    realTransactions: stats.realTransactions || [],
    timePause: stats.timePause,
    balance: stats.balance,
    errors: stats.errors || { errors: [], lastError: null, errorCount: 0 }
  };
}

  public stopCopyTrading(jwtToken: string): { success: boolean; message: string } {
    const userId = this.validateJWT(jwtToken);
    const userService = this.userServices.get(userId);
    
    if (userService) {
      userService.copyTradingService.stop();
      this.userServices.delete(userId);
      return {
        success: true,
        message: 'Copy trading parado com sucesso'
      };
    }
    
    return {
      success: false,
      message: 'Nenhuma sessão ativa encontrada'
    };
  }

  // public cleanupUserSession(userId: string): void {
  //   const userService = this.userServices.get(userId);
  //   if (userService) {
  //     userService.copyTradingService.stop();
  //     this.userServices.delete(userId);
  //     console.log(`Sessão do usuário ${userId} limpa manualmente`);
  //   }
  // }

  public stopAllSessions(): { stoppedCount: number; message: string } {
    let stoppedCount = 0;
    
    for (const [userId, userService] of this.userServices) {
      try {
        userService.copyTradingService.stop();
        stoppedCount++;
      } catch (error) {
        console.error(`Error stopping session for user ${userId}:`, error);
      }
    }
    
    this.userServices.clear();
    
    return {
      stoppedCount,
      message: `Paradas ${stoppedCount} sessões`
    };
  }

  private maskToken(token: string): string {
    if (token.length <= 8) return '***';
    return token.substring(0, 4) + '***' + token.substring(token.length - 4);
  }

  private cleanupInactiveUsers(): void {
    const now = new Date();
    const usersToRemove: string[] = [];
    
    for (const [userId, userService] of this.userServices) {
      const inactiveTime = now.getTime() - userService.lastActivity.getTime();
      if (inactiveTime > this.INACTIVITY_TIMEOUT) {
        usersToRemove.push(userId);
      }
    }
    
    usersToRemove.forEach(userId => {
 
      const userService = this.userServices.get(userId);
      if (userService) {
        userService.copyTradingService.stop();
        this.userServices.delete(userId);
      }
    });
  }

  public getActiveUserCount(): number {
    return this.userServices.size;
  }

  public destroy(): void {
    // Parar todas as sessões
    for (const [userId, userService] of this.userServices) {
      try {
        userService.copyTradingService.stop();
      } catch (error) {
        console.error(`Error stopping service for user ${userId}:`, error);
      }
    }
    
    this.userServices.clear();
    
    // Removido: limpeza de interval (não mais necessário)
  }
}