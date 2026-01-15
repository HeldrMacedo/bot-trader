'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Dynamically import components to avoid SSR issues
const TradingInterface = dynamic(() => import('../components/TradingInterface'), { ssr: false });
const LoadingScreen = dynamic(() => import('../components/LoadingScreen'), { ssr: false });

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [showInterface, setShowInterface] = useState(false);

  useEffect(() => {
    // Simulate initialization process
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setShowInterface(true), 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Strategy Free - AI Trading Bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2024" />
        <link rel="shortcut icon" href="/favicon.ico?v=2024" />
        <link rel="apple-touch-icon" href="/favicon.svg?v=2024" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2024" />
        <link rel="stylesheet" href="/style.css" />
        <link rel="stylesheet" href="/custom-blocks-style.css" />
        <link rel="stylesheet" href="/custom-overrides.css?v=20260108" />
        <link rel="stylesheet" href="/final-rule-params-alignment.css" />
        <link rel="stylesheet" href="/css/ai-chat-modal.css" />
        <link rel="stylesheet" href="/js/chart-modal.css" />
        <link rel="stylesheet" href="/css/responsive.css" />
        <link rel="stylesheet" href="/css/market-analyzers.css" />
        <link rel="stylesheet" href="/css/robot-editor.css?v=20260108" />
        <link rel="stylesheet" href="/css/language-switcher.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        
        {/* Blockly Scripts */}
        <script src="https://unpkg.com/blockly/blockly.min.js" />
        <script src="https://unpkg.com/blockly/blocks.min.js" />
        <script src="https://unpkg.com/blockly/javascript.min.js" />
        <script src="https://unpkg.com/blockly/msg/en.js" />
        <script src="https://unpkg.com/blockly/msg/pt-br.js" />
      </Head>

      <main className="min-h-screen bg-gray-900 text-white">
        {isLoading && <LoadingScreen />}
        {showInterface && <TradingInterface />}
      </main>
    </>
  );
}