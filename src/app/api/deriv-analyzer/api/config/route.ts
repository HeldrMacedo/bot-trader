import { NextRequest } from 'next/server';
import AnalyzerManager from '../../analyzer-manager';
import { Config } from '../../statistical-analyzer';

export async function GET(request: NextRequest) {
  try {
    const analyzer = AnalyzerManager.getAnalyzer();
    if (!analyzer) {
      return Response.json(
        { error: 'Not connected to Deriv API' },
        { status: 400 }
      );
    }

    const config = analyzer.getConfig();
    return Response.json({ config });
  } catch (error) {
    console.error('Config error:', error);
    return Response.json(
      { error: `Config retrieval failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const configUpdate: Config = await request.json();

    const analyzer = AnalyzerManager.getAnalyzer();
    if (!analyzer) {
      return Response.json(
        { error: 'Not connected to Deriv API' },
        { status: 400 }
      );
    }

    analyzer.updateConfig(configUpdate);

    return Response.json({
      status: 'updated',
      message: 'Configuration updated successfully',
      config: analyzer.getConfig()
    });
  } catch (error) {
    console.error('Config update error:', error);
    return Response.json(
      { error: `Config update failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}