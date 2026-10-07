import { NextRequest, NextResponse } from 'next/server';
import { CopyTradingManager } from '@/app/services/copyTradingManager';

export async function POST(request: Request) {
  try {
    const { demoToken, realToken, configure } = await request.json();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token JWT necessário' }, { status: 401 });
    }
    const jwt = authHeader.substring(7);

    const tradingConfig = {
      quantityLoss: configure?.quantityLoss || 0,
      stopLoss: configure?.stopLoss || 0,
      stopWin: configure?.stopWin || 0,
      initialValue: configure?.initialValue || 0.35,
      stakeMultiple: configure?.stakeMultiple || 1,
      pauseTime: configure?.pauseTime || 0,
      pauseTimeLoss: configure?.pauseTimeLoss || false,
      pauseTimeWin: configure?.pauseTimeWin || false,
      maxMartingale: configure?.maxMartingale || 0,
      onMaxMartingale: configure?.onMaxMartingale || 'reset',
      testMode: configure?.testMode || false,
    };
    
    const result = await CopyTradingManager.getInstance().startCopyTrading(
      jwt, 
      demoToken, 
      realToken,
      tradingConfig
    );
    
    if (!result.success) {
      // Sem userId o JWT nem foi aceito; com userId a falha foi na conexão com a Deriv
      const status = result.userId ? 502 : 401;
      return NextResponse.json({ ...result, error: result.message }, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}