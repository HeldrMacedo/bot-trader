import { NextRequest, NextResponse } from 'next/server';
import { CopyTradingManager } from '../../services/copyTradingManager';
import { verifyAdminToken } from '@/app/(withSidebar)/operations/actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stopAll } = body;
    const authHeader = request.headers.get('authorization');
    
    const copyTradingManager = CopyTradingManager.getInstance();

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token JWT necessário' }, { status: 401 });
    }

    const jwtToken = authHeader.split(' ')[1];

    // Parar todas as sessões (apenas admin): derruba os bots de todos os usuários
    if (stopAll === true) {
      if (!(await verifyAdminToken(jwtToken))) {
        return NextResponse.json({ error: 'Apenas administradores podem parar todas as sessões' }, { status: 403 });
      }

      const result = copyTradingManager.stopAllSessions();
      
      return NextResponse.json({ 
        message: result.message,
        stoppedSessions: result.stoppedCount,
        timestamp: new Date().toISOString()
      });
    }
    
    // Parar sessão específica do usuário
    const result = copyTradingManager.stopCopyTrading(jwtToken);
    
    if (result.success) {
      return NextResponse.json({ 
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Error stopping copy trading:', error);
    return NextResponse.json(
      { error: 'Failed to stop copy trading', details: error.message },
      { status: 500 }
    );
  }
}