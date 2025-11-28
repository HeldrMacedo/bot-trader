import { NextRequest } from 'next/server';
import AnalyzerManager from '../../analyzer-manager';

export async function GET(request: NextRequest) {
  try {
    const analyzer = AnalyzerManager.getAnalyzer();
    if (!analyzer) {
      return Response.json(
        { error: 'Not connected to Deriv API' },
        { status: 400 }
      );
    }

    const signals = analyzer.getTradingSignals();
    return Response.json({ signals });
  } catch (error) {
    console.error('Signals error:', error);
    return Response.json(
      { error: `Signals retrieval failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}