/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Main Application Entry
 */

import React, { useState } from 'react';
import { SolarProvider } from './context/SolarContext';
import { Navigation, ViewId } from './components/Navigation';
import { StaleDataBanner } from './components/common/StaleDataBanner';
import { DashboardView } from './views/DashboardView';
import { LiveMonitoringView } from './views/LiveMonitoringView';
import { BatteryView } from './views/BatteryView';
import { SolarView } from './views/SolarView';
import { DcLoadView } from './views/DcLoadView';
import { AcLoadView } from './views/AcLoadView';
import { HistoryView } from './views/HistoryView';
import { AlertsView } from './views/AlertsView';
import { ConnectionView } from './views/ConnectionView';
import { AcDisconnectView } from './views/AcDisconnectView';
import { SettingsView } from './views/SettingsView';

function MainApp() {
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');

  return (
    <div className="min-h-screen bg-[#070d17] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Bar Navigation */}
      <Navigation currentView={currentView} onSelectView={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stale or Error Alert Banner */}
        <StaleDataBanner />

        {/* View Switcher */}
        {currentView === 'dashboard' && <DashboardView onNavigate={setCurrentView} />}
        {currentView === 'live' && <LiveMonitoringView />}
        {currentView === 'battery' && <BatteryView />}
        {currentView === 'solar' && <SolarView />}
        {currentView === 'dc-load' && <DcLoadView />}
        {currentView === 'ac-load' && <AcLoadView />}
        {currentView === 'history' && <HistoryView />}
        {currentView === 'alerts' && <AlertsView onNavigate={setCurrentView} />}
        {currentView === 'connection' && <ConnectionView />}
        {currentView === 'ac-disconnect' && <AcDisconnectView />}
        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Windows PC Browser Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060b13] py-4 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span>Solar Monitor Pro v1.2</span>
            <span>·</span>
            <span>ESP32 INA228 × 3 · PZEM-004T v3.0</span>
            <span>·</span>
            <span className="text-slate-400">Windows PC Edition</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>24V 100Ah LiFePO4</span>
            <span>·</span>
            <span>3000W 230V Inverter</span>
            <span>·</span>
            <span className="text-emerald-400">Continuous Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SolarProvider>
      <MainApp />
    </SolarProvider>
  );
}
