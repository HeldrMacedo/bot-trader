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

    const analysis = analyzer.getCurrentAnalysis();
    return Response.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json(
      { error: `Analysis failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}