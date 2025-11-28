import { NextRequest } from 'next/server';
import AnalyzerManager from '../../../analyzer-manager';

export async function GET(request: NextRequest) {
  try {
    const analyzer = AnalyzerManager.getAnalyzer();
    if (!analyzer) {
      return Response.json(
        { error: 'Not connected to Deriv API' },
        { status: 400 }
      );
    }

    const bestSignal = analyzer.getBestSignal();
    return Response.json({ best_signal: bestSignal });
  } catch (error) {
    console.error('Best signal error:', error);
    return Response.json(
      { error: `Best signal retrieval failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}