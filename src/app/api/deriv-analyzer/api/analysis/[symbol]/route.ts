import { NextRequest } from 'next/server';
import AnalyzerManager from '../../../analyzer-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;

    const analyzer = AnalyzerManager.getAnalyzer();
    if (!analyzer) {
      return Response.json(
        { error: 'Not connected to Deriv API' },
        { status: 400 }
      );
    }

    const analysis = analyzer.getSymbolAnalysis(symbol);
    if (!analysis) {
      return Response.json(
        { error: `Symbol ${symbol} not found` },
        { status: 404 }
      );
    }

    return Response.json(analysis);
  } catch (error) {
    console.error('Symbol analysis error:', error);
    return Response.json(
      { error: `Symbol analysis failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}