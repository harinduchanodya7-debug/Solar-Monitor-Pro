/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Top Bar Contract & Windows PC Navigation
 */

import React from 'react';
import {
  LayoutDashboard,
  Activity,
  BatteryCharging,
  Sun,
  Zap,
  Power,
  BarChart3,
  Bell,
  Wifi,
  ShieldAlert,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';

export type ViewId =
  | 'dashboard'
  | 'live'
  | 'battery'
  | 'solar'
  | 'dc-load'
  | 'ac-load'
  | 'history'
  | 'alerts'
  | 'connection'
  | 'ac-disconnect'
  | 'settings';

interface NavigationProps {
  currentView: ViewId;
  onSelectView: (view: ViewId) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onSelectView }) => {
  const { isDemoMode, setDemoMode, connectionStatus, refreshNow, telemetry, alerts } = useSolar();

  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  const navItems: { id: ViewId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'live', label: 'Live Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'battery', label: 'Battery', icon: <BatteryCharging className="w-4 h-4" /> },
    { id: 'solar', label: 'Solar PV', icon: <Sun className="w-4 h-4" /> },
    { id: 'dc-load', label: 'DC Load', icon: <Zap className="w-4 h-4" /> },
    { id: 'ac-load', label: 'AC Load', icon: <Power className="w-4 h-4" /> },
    { id: 'history', label: 'Power History', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="w-4 h-4" />,
      badge: unacknowledgedAlertsCount > 0 ? unacknowledgedAlertsCount : undefined,
    },
    { id: 'connection', label: 'Device Connection', icon: <Wifi className="w-4 h-4" /> },
    { id: 'ac-disconnect', label: 'AC Disconnect', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Diagnostics', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#070d17]/95 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1, 2, 3 Main Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              onSelectView('dashboard');
            }}
            className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap"
          >
            Solar Monitor Pro
          </a>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            · ESP32 INA228/PZEM
          </span>
        </div>

        {/* Zone 2: System Status & Telemetry Metadata */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
          <span>Device: {telemetry?.device_id || 'ESP32'}</span>
          <span aria-hidden="true">·</span>
          <span>
            Status:{' '}
            <span
              className={
                connectionStatus === 'connected'
                  ? 'text-emerald-400'
                  : connectionStatus === 'stale'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {connectionStatus.toUpperCase()}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Poll: 5s</span>
          {isDemoMode && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-semibold">[DEMO SIMULATION]</span>
            </>
          )}
        </div>

        {/* Zone 3: Primary Action & Mode Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
            <button
              onClick={() => setDemoMode(true)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                isDemoMode ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Mode
            </button>
            <button
              onClick={() => setDemoMode(false)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                !isDemoMode ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Real ESP32
            </button>
          </div>

          <button
            onClick={() => refreshNow()}
            title="Poll ESP32 now"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Windows PC Optimized Horizontal Scroll Tabs for all 11 Views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1 py-1.5 min-w-max">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
