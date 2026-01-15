import React, { useEffect, useRef } from 'react';
import { legacyScriptLoader } from '../services/LegacyScriptLoader';

declare global {
  interface Window {
    AppManager: any;
    LoadingManager: any;
    SessionManager: any;
    logConfig: any;
    getBaseUrl: () => string;
    getGeminiInstance: () => any;
    pageLoadTime: number;
    enableVipLogs: boolean;
    CommonHelpers: any;
    ConfigurationsView: any;
    MonitoringView: any;
    UIManager: any;
    initFrontendReconnection: () => void;
  }
}

const TradingInterface = () => {
  const appContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load all legacy JavaScript files in the correct order
    const loadLegacyScripts = async () => {
      try {
        await legacyScriptLoader.loadAllLegacyScripts();

        // Initialize the app manager after all dependencies are loaded
        if (window.AppManager) {
          window.AppManager.init();
        }
      } catch (error) {
        console.error('Error loading legacy scripts:', error);
      }
    };

    loadLegacyScripts();

    // Set up the app container
    if (appContainerRef.current) {
      appContainerRef.current.className = 'app-container';
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div className="relative">
      {/* Mobile Header */}
      <div className="mobile-header fixed top-0 left-0 right-0 bg-gray-800 z-50 h-16 flex items-center px-4 md:hidden">
        <button id="mobile-menu-toggle" className="mobile-menu-toggle mr-4" aria-label="Menu">
          <span className="hamburger-line block w-5 h-0.5 bg-white mb-1"></span>
          <span className="hamburger-line block w-5 h-0.5 bg-white mb-1"></span>
          <span className="hamburger-line block w-5 h-0.5 bg-white"></span>
        </button>
        <h1 className="mobile-header-title text-xl font-bold">Strategy Free</h1>
      </div>

      {/* Language Switcher */}
      <div 
        id="language-switcher-container" 
        style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999, display: 'none' }}
      ></div>

      {/* Mobile Sidebar Overlay */}
      <div className="mobile-sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-40 hidden"></div>

      {/* Mobile Sidebar */}
      <div 
        id="mobile-sidebar" 
        className="mobile-sidebar fixed top-0 left-0 h-full w-64 bg-gray-800 z-50 transform -translate-x-full transition-transform duration-300 md:hidden"
      >
        <div className="mobile-sidebar-content h-full flex flex-col">
          <div className="mobile-sidebar-header p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button 
              id="mobile-sidebar-close" 
              className="mobile-sidebar-close text-white text-2xl" 
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <div className="mobile-sidebar-body p-4 flex-1 overflow-y-auto" id="mobile-sidebar-body">
            {/* Mobile menu items will be populated here */}
          </div>
        </div>
      </div>

      {/* Main Application Container */}
      <div 
        id="app-container" 
        ref={appContainerRef}
        className="app-container pt-16 md:pt-0 min-h-screen bg-gray-900 transition-opacity duration-300"
        style={{ opacity: 1 }}
      >
        {/* Trade Messages Container */}
        <div 
          id="trade-messages-container" 
          className="trade-messages-container fixed bottom-4 right-4 w-80 max-h-96 overflow-y-auto bg-gray-800 rounded-lg shadow-lg z-30 hidden"
          style={{ display: 'none' }}
        >
          <div className="messages-list p-4" id="messages-list">
            <div className="no-messages text-center py-4 text-gray-400">Nenhum trade executado ainda</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingInterface;