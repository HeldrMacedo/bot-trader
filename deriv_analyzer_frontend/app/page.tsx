'use client';

import { useState, useEffect } from 'react';
import { FaChartLine, FaBolt, FaSignal, FaCog } from 'react-icons/fa';
import { DerivAnalyzerService } from './services/DerivAnalyzerService';

export default function Home() {
  const [wsData, setWsData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [apiStatus, setApiStatus] = useState<any>(null);

  useEffect(() => {
    const analyzerService = new DerivAnalyzerService();
    
    analyzerService.on('connected', () => {
      console.log('Connected to WebSocket via service');
      setConnectionStatus('connected');
    });
    
    analyzerService.on('realtimeUpdate', (data) => {
      setWsData(data);
    });
    
    analyzerService.on('disconnected', () => {
      console.log('Disconnected from WebSocket via service');
      setConnectionStatus('disconnected');
    });
    
    analyzerService.on('error', (error) => {
      console.error('WebSocket error via service:', error);
      setConnectionStatus('error');
    });
    
    analyzerService.connect();
    
    // Fetch API status
    const fetchApiStatus = async () => {
      try {
        const status = await analyzerService.fetchStatus();
        setApiStatus(status);
      } catch (error) {
        console.error('Error fetching API status:', error);
      }
    };
    
    fetchApiStatus();
    
    // Poll API status every 5 seconds
    const interval = setInterval(fetchApiStatus, 5000);
    
    return () => {
      analyzerService.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <header className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white flex items-center">
            <FaChartLine className="mr-3 text-blue-400" />
            Deriv Real-Time Analyzer
          </h1>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : connectionStatus === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500' 
                  : connectionStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`}></div>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Market Analysis Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Market Quality</h2>
            <div className="text-4xl font-bold text-white">
              {wsData?.marketAnalysis?.overallQuality ? 
                `${wsData.marketAnalysis.overallQuality.toFixed(2)}%` : 'N/A'}
            </div>
            <p className="mt-2 text-gray-300">
              {wsData?.marketAnalysis?.shouldTrade ? 
                'Good trading conditions' : 'Wait for better conditions'}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Active Suggestions</h2>
            <div className="text-4xl font-bold text-white">
              {wsData?.suggestions?.length || 0}
            </div>
            <p className="mt-2 text-gray-300">
              High confidence: {wsData?.marketAnalysis?.highConfidenceSuggestions || 0}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-purple-400">System Status</h2>
            <div className="text-4xl font-bold text-white">
              {apiStatus?.connected ? '✓' : '✗'}
            </div>
            <p className="mt-2 text-gray-300">
              Clients: {apiStatus?.clients || 0}
            </p>
          </div>
        </div>

        {/* Best Suggestion */}
        {wsData?.bestSuggestion && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <FaBolt className="mr-3" />
              Best Trading Opportunity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-lg"><span className="font-semibold">Symbol:</span> {wsData.bestSuggestion.symbol}</p>
                <p className="text-lg"><span className="font-semibold">Strategy:</span> {wsData.bestSuggestion.strategy}</p>
              </div>
              <div>
                <p className="text-lg"><span className="font-semibold">Confidence:</span> {wsData.bestSuggestion.confidence}%</p>
                <p className="text-lg"><span className="font-semibold">Assertiveness:</span> {wsData.bestSuggestion.assertiveness}</p>
              </div>
            </div>
            <p className="mt-3 text-gray-200">{wsData.bestSuggestion.reason}</p>
          </div>
        )}

        {/* All Suggestions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FaSignal className="mr-3 text-yellow-400" />
            Trading Suggestions
          </h2>
          {wsData?.suggestions && wsData.suggestions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Strategy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Assertiveness</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {wsData.suggestions.map((suggestion: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-750' : 'bg-gray-800'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">{suggestion.symbol}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{suggestion.strategy}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          suggestion.confidence >= 80 
                            ? 'bg-green-100 text-green-800' 
                            : suggestion.confidence >= 70
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {suggestion.confidence}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{suggestion.assertiveness}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 max-w-xs">{suggestion.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No suggestions available yet. Waiting for market analysis...</p>
          )}
        </div>

        {/* Tick Data */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FaCog className="mr-3 text-cyan-400" />
            Real-time Tick Data
          </h2>
          {wsData?.tickData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(wsData.tickData).map(([symbol, data]: [string, any]) => (
                <div key={symbol} className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg text-blue-300">{symbol}</h3>
                  <p className="text-white">Quote: <span className="font-mono">{data.quote}</span></p>
                  <p className="text-white">Last Digit: <span className="font-mono text-xl font-bold">{data.digit}</span></p>
                  <p className="text-gray-400 text-sm">Updated: {new Date(data.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Waiting for tick data...</p>
          )}
        </div>
      </main>
    </div>
  );
}
