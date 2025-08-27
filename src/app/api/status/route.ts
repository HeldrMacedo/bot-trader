import { NextRequest, NextResponse } from 'next/server';
import { CopyTradingManager } from '@/app/services/copyTradingManager';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token JWT necessário' }, { status: 401 });
    }
    
    const jwtToken = authHeader.split(' ')[1];
    const copyTradingManager = CopyTradingManager.getInstance();
    
    const status = copyTradingManager.getStatus(jwtToken);
    
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}