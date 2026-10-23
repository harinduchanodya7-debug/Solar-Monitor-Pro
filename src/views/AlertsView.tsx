/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Alerts & Protection System View
 */

import React from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { DEFAULT_THRESHOLDS } from '../lib/storage';

interface AlertsViewProps {
  onNavigate?: (view: any) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onNavigate }) => {
  const { alerts, acknowledgeAlert, clearAlerts, addAlert, config } = useSolar();
  const thresholds = config.alert_thresholds || DEFAULT_THRESHOLDS;

  const handleSimulateAlert = () => {
    addAlert({
      severity: 'warning',
      title: 'Simulated Grid Frequency Fluctuation',
      message: 'AC frequency deviated to 49.65 Hz momentarily. Diagnostic test event.',
      source: 'ac_inverter',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Alerts & System Protection</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event logging · Hardware safety interlocks · Custom BMS threshold monitors
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('settings')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-900/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Thresholds</span>
            </button>
          )}
          <button
            onClick={handleSimulateAlert}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Trigger Test Alert
          </button>
          <button
            onClick={clearAlerts}
            className="px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Active Configured Protection Thresholds Card */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Active Hardware Safety Limits & Interlocks
            </h2>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono underline"
            >
              Edit in Settings →
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <span className="text-slate-400 block text-[11px]">BATTERY OVER-VOLTAGE</span>
            <span className="text-amber-400 font-bold text-sm mt-1 block">
              &ge; {thresholds.battery_over_voltage_v.toFixed(1)} V (Cutoff)
            </span>
            <span className="text-[10px] text-slate-500">
              BMS High Cell Protection ({(thresholds.battery_over_voltage_v / 8).toFixed(2)}V/cell)
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <span className="text-slate-400 block text-[11px]">BATTERY UNDER-VOLTAGE</span>
            <span className="text-rose-400 font-bold text-sm mt-1 block">
              &le; {thresholds.battery_under_voltage_v.toFixed(1)} V (Cutoff)
            </span>
            <span className="text-[10px] text-slate-500">
              Cutoff Boundary ({(thresholds.battery_under_voltage_v / 8).toFixed(2)}V/cell)
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <span className="text-slate-400 block text-[11px]">INVERTER OVERLOAD</span>
            <span className="text-amber-400 font-bold text-sm mt-1 block">
              &gt; {thresholds.ac_inverter_overload_w} W (Alarm)
            </span>
            <span className="text-[10px] text-slate-500">Continuous 3000 W inverter limit</span>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <span className="text-slate-400 block text-[11px]">LOW SOC THRESHOLD</span>
            <span className="text-emerald-400 font-bold text-sm mt-1 block">
              &le; {thresholds.battery_low_soc_percent}% (Warn) / {thresholds.battery_critical_soc_percent}% (Crit)
            </span>
            <span className="text-[10px] text-slate-500">Capacity Preservation</span>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400">
          Alert Events ({alerts.length})
        </h3>

        {alerts.length === 0 ? (
          <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-slate-300 font-medium">All Systems Nominal</p>
            <p className="mt-1 text-slate-500">No active alerts or hardware faults recorded.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                alert.acknowledged
                  ? 'bg-[#0b1322]/60 border-slate-800/80 opacity-70'
                  : alert.severity === 'critical'
                  ? 'bg-rose-950/20 border-rose-800/50'
                  : alert.severity === 'warning'
                  ? 'bg-amber-950/20 border-amber-800/50'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.severity === 'critical' ? (
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{alert.title}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      · {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      · {alert.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                </div>
              </div>

              {!alert.acknowledged && (
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-medium shrink-0 transition-colors"
                >
                  Acknowledge
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
