import { NextRequest } from 'next/server';
import AnalyzerManager from '../../analyzer-manager';

export async function POST(request: NextRequest) {
  try {
    const { api_token } = await request.json();

    if (!api_token) {
      return Response.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    await AnalyzerManager.initializeAnalyzer(api_token);

    return Response.json({
      status: 'connected',
      message: 'Successfully connected to Deriv API'
    });
  } catch (error) {
    console.error('Connection error:', error);
    return Response.json(
      { error: `Connection failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}