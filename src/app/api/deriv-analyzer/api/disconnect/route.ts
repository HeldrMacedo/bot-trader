import { NextRequest } from 'next/server';
import AnalyzerManager from '../../analyzer-manager';

export async function POST(request: NextRequest) {
  try {
    await AnalyzerManager.stopAnalyzer();

    return Response.json({
      status: 'disconnected',
      message: 'Successfully disconnected from Deriv API'
    });
  } catch (error) {
    console.error('Disconnection error:', error);
    return Response.json(
      { error: `Disconnection failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}