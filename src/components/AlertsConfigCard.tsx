/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Alerts & Protection Thresholds Configuration Component
 */

import React, { useState, useEffect } from 'react';
import {
  BellRing,
  ShieldAlert,
  Battery,
  Zap,
  Activity,
  Volume2,
  VolumeX,
  RotateCcw,
  Save,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { AlertThresholdsConfig } from '../types/telemetry';
import { DEFAULT_THRESHOLDS } from '../lib/storage';
import { playAlertSound } from '../lib/audioAlert';

export const AlertsConfigCard: React.FC = () => {
  const { config, updateConfig, telemetry, addAlert } = useSolar();

  // Local draft state for thresholds form
  const [thresholds, setThresholds] = useState<AlertThresholdsConfig>(() => ({
    ...DEFAULT_THRESHOLDS,
    ...(config.alert_thresholds || {}),
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Keep local draft in sync if external config changes
  useEffect(() => {
    if (config.alert_thresholds) {
      setThresholds((prev) => ({
        ...prev,
        ...config.alert_thresholds,
      }));
    }
  }, [config.alert_thresholds]);

  // Handle number input change safely
  const handleNumericChange = (key: keyof AlertThresholdsConfig, rawValue: string) => {
    const parsed = parseFloat(rawValue);
    setThresholds((prev) => ({
      ...prev,
      [key]: isNaN(parsed) ? 0 : parsed,
    }));
    setSavedSuccess(false);
    setValidationError(null);
  };

  // Validate logical threshold constraints
  const validateThresholds = (): boolean => {
    if (thresholds.battery_under_voltage_v >= thresholds.battery_over_voltage_v) {
      setValidationError('Battery under-voltage cutoff must be lower than over-voltage cutoff.');
      return false;
    }
    if (thresholds.battery_low_voltage_warning_v <= thresholds.battery_under_voltage_v) {
      setValidationError('Battery low-voltage warning should be higher than the cutoff voltage.');
      return false;
    }
    if (thresholds.battery_low_voltage_warning_v >= thresholds.battery_over_voltage_v) {
      setValidationError('Battery low-voltage warning must be lower than over-voltage cutoff.');
      return false;
    }
    if (thresholds.battery_critical_soc_percent >= thresholds.battery_low_soc_percent) {
      setValidationError('Critical depleted SoC (%) must be lower than low SoC warning level.');
      return false;
    }
    if (thresholds.battery_high_soc_percent <= thresholds.battery_low_soc_percent) {
      setValidationError('High capacity SoC (%) must be higher than low SoC warning level.');
      return false;
    }
    if (thresholds.ac_voltage_low_v >= thresholds.ac_voltage_high_v) {
      setValidationError('AC low voltage limit must be lower than AC high voltage limit.');
      return false;
    }
    if (thresholds.ac_inverter_overload_w <= 0 || thresholds.battery_max_discharge_current_a <= 0) {
      setValidationError('Current and power limits must be positive numbers.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateThresholds()) return;

    updateConfig({
      alert_thresholds: thresholds,
    });

    if (thresholds.notifications_sound_enabled) {
      playAlertSound('info');
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    updateConfig({
      alert_thresholds: DEFAULT_THRESHOLDS,
    });
    setValidationError(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Quick Preset Handlers
  const applyPreset = (presetName: 'standard' | 'conservative' | 'high_power') => {
    let preset: AlertThresholdsConfig;
    if (presetName === 'conservative') {
      // Conservative 8S LiFePO4: 21.6V (2.7V/cell) to 28.4V (3.55V/cell), 25% low SoC
      preset = {
        ...DEFAULT_THRESHOLDS,
        battery_over_voltage_v: 28.4,
        battery_low_voltage_warning_v: 23.2,
        battery_under_voltage_v: 21.6,
        battery_low_soc_percent: 25,
        battery_critical_soc_percent: 15,
        battery_high_soc_percent: 95,
        battery_max_discharge_current_a: 60,
        battery_max_charge_current_a: 30,
        ac_inverter_overload_w: 2500,
      };
    } else if (presetName === 'high_power') {
      // High power: 29.2V (3.65V/cell), 20.8V (2.6V/cell), 100A discharge
      preset = {
        ...DEFAULT_THRESHOLDS,
        battery_over_voltage_v: 29.2,
        battery_low_voltage_warning_v: 22.4,
        battery_under_voltage_v: 20.8,
        battery_low_soc_percent: 15,
        battery_critical_soc_percent: 8,
        battery_high_soc_percent: 98,
        battery_max_discharge_current_a: 100,
        battery_max_charge_current_a: 50,
        ac_inverter_overload_w: 3000,
      };
    } else {
      preset = DEFAULT_THRESHOLDS;
    }

    setThresholds(preset);
    updateConfig({ alert_thresholds: preset });
    setValidationError(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestAudio = (sev: 'critical' | 'warning' | 'info') => {
    playAlertSound(sev);
    addAlert({
      severity: sev,
      title: `Audio Notification Test (${sev.toUpperCase()})`,
      message: `Audible synthesizer verified successfully on this browser device. Sound alert preference is ${thresholds.notifications_sound_enabled ? 'ENABLED' : 'DISABLED'}.`,
      source: 'connection',
    });
  };

  // Check live telemetry against configured thresholds for real-time validation preview
  const liveViolations: string[] = [];
  if (telemetry) {
    if (telemetry.battery_voltage_v !== null) {
      if (telemetry.battery_voltage_v >= thresholds.battery_over_voltage_v) {
        liveViolations.push(`Battery Voltage (${telemetry.battery_voltage_v} V) exceeds Over-Voltage cutoff (${thresholds.battery_over_voltage_v} V)`);
      } else if (telemetry.battery_voltage_v <= thresholds.battery_under_voltage_v) {
        liveViolations.push(`Battery Voltage (${telemetry.battery_voltage_v} V) is below Under-Voltage cutoff (${thresholds.battery_under_voltage_v} V)`);
      }
    }
    if (telemetry.battery_soc_percent !== null) {
      if (telemetry.battery_soc_percent <= thresholds.battery_critical_soc_percent) {
        liveViolations.push(`Battery SoC (${telemetry.battery_soc_percent}%) reached Critical Depletion threshold (${thresholds.battery_critical_soc_percent}%)`);
      } else if (telemetry.battery_soc_percent <= thresholds.battery_low_soc_percent) {
        liveViolations.push(`Battery SoC (${telemetry.battery_soc_percent}%) is below Low SoC warning (${thresholds.battery_low_soc_percent}%)`);
      }
    }
    if (telemetry.dc_load_current_a !== null && telemetry.dc_load_current_a > thresholds.dc_load_overcurrent_a) {
      liveViolations.push(`DC Load Current (${telemetry.dc_load_current_a} A) exceeds limit (${thresholds.dc_load_overcurrent_a} A)`);
    }
    if (telemetry.ac_active_power_w !== null && telemetry.ac_active_power_w > thresholds.ac_inverter_overload_w) {
      liveViolations.push(`Inverter Load (${telemetry.ac_active_power_w} W) exceeds continuous overload limit (${thresholds.ac_inverter_overload_w} W)`);
    }
  }

  return (
    <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <BellRing className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Alerts & Protection Thresholds Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Set custom voltage cutoffs, current ratings, and SoC boundaries for notifications and equipment safety
            </p>
          </div>
        </div>

        {/* Quick LiFePO4 Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
          </span>
          <button
            onClick={() => applyPreset('standard')}
            className="px-2.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors"
            title="Standard 8S LiFePO4: 29.2V / 21.0V / 20% SoC / 80A / 2800W"
          >
            LiFePO4 Standard
          </button>
          <button
            onClick={() => applyPreset('conservative')}
            className="px-2.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-900/40 rounded-lg transition-colors"
            title="Conservative battery life: 28.4V / 21.6V / 25% SoC / 60A / 2500W"
          >
            Long Life (80% DoD)
          </button>
          <button
            onClick={() => applyPreset('high_power')}
            className="px-2.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-900/40 rounded-lg transition-colors"
            title="High power headroom: 29.2V / 20.8V / 100A / 3000W"
          >
            High Performance
          </button>
        </div>
      </div>

      {/* Live Status Banner */}
      {liveViolations.length > 0 ? (
        <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">Live Telemetry Threshold Violations Detected:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-mono text-[11px]">
              {liveViolations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-emerald-950/20 border border-emerald-800/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>All live telemetry channels currently within configured safety boundaries.</span>
          </div>
          {telemetry && (
            <span className="text-[10px] font-mono text-emerald-400/80">
              Bat: {telemetry.battery_voltage_v ?? '--'}V · SoC: {telemetry.battery_soc_percent ?? '--'}% · Inverter: {telemetry.ac_active_power_w ?? '--'}W
            </span>
          )}
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Grid of Threshold Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Voltage Thresholds */}
        <div className="space-y-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              1. Voltage Thresholds (V)
            </h3>
          </div>

          {/* Battery Over-Voltage */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Battery Over-Voltage Cutoff</label>
              <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                {thresholds.battery_over_voltage_v.toFixed(1)} V
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="26.0"
                max="31.0"
                value={thresholds.battery_over_voltage_v}
                onChange={(e) => handleNumericChange('battery_over_voltage_v', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-mono text-slate-400">V</span>
            </div>
            <p className="text-[10px] text-slate-500">
              8S LiFePO4 absorption limit (default 29.2 V = 3.65 V/cell). Triggers critical alert.
            </p>
          </div>

          {/* Battery Low-Voltage Warning */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Battery Low-Voltage Warning</label>
              <span className="font-mono text-amber-400 text-[11px] font-semibold">
                {thresholds.battery_low_voltage_warning_v.toFixed(1)} V
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="21.5"
                max="26.0"
                value={thresholds.battery_low_voltage_warning_v}
                onChange={(e) => handleNumericChange('battery_low_voltage_warning_v', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-mono text-slate-400">V</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Early warning advisory before disconnect (default 22.4 V = 2.80 V/cell).
            </p>
          </div>

          {/* Battery Under-Voltage Cutoff */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Battery Under-Voltage Cutoff</label>
              <span className="font-mono text-rose-400 text-[11px] font-semibold">
                {thresholds.battery_under_voltage_v.toFixed(1)} V
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="19.0"
                max="24.0"
                value={thresholds.battery_under_voltage_v}
                onChange={(e) => handleNumericChange('battery_under_voltage_v', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-mono text-slate-400">V</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Critical BMS cutoff boundary (default 21.0 V = 2.625 V/cell). Disconnect load.
            </p>
          </div>

          {/* AC Line Voltage Limits */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="text-[11px] font-semibold text-slate-300">AC Line Voltage Window (PZEM-004T)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Max AC Voltage</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    min="230"
                    max="270"
                    value={thresholds.ac_voltage_high_v}
                    onChange={(e) => handleNumericChange('ac_voltage_high_v', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono tabular-nums"
                  />
                  <span className="text-[10px] font-mono text-slate-400">V</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Min AC Voltage</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    min="180"
                    max="225"
                    value={thresholds.ac_voltage_low_v}
                    onChange={(e) => handleNumericChange('ac_voltage_low_v', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono tabular-nums"
                  />
                  <span className="text-[10px] font-mono text-slate-400">V</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">Nominal 230V standard (205V - 250V tolerance band).</p>
          </div>
        </div>

        {/* Section 2: State of Charge (SoC) Thresholds */}
        <div className="space-y-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Battery className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              2. State of Charge (SoC %)
            </h3>
          </div>

          {/* Low SoC Warning */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Low Battery Warning Level</label>
              <span className="font-mono text-amber-400 text-[11px] font-semibold">
                {thresholds.battery_low_soc_percent} %
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={thresholds.battery_low_soc_percent}
                onChange={(e) => handleNumericChange('battery_low_soc_percent', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs font-mono text-slate-400">%</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Triggers battery conservation warning when capacity drops below this value (default 20%).
            </p>
          </div>

          {/* Critical SoC Depletion */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Critical Depleted Level</label>
              <span className="font-mono text-rose-400 text-[11px] font-semibold">
                {thresholds.battery_critical_soc_percent} %
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="2"
                max="30"
                value={thresholds.battery_critical_soc_percent}
                onChange={(e) => handleNumericChange('battery_critical_soc_percent', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs font-mono text-slate-400">%</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Critical exhaustion alert (default 10%). Deep discharge protection.
            </p>
          </div>

          {/* High SoC Full */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">High Capacity / Absorption Target</label>
              <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                {thresholds.battery_high_soc_percent} %
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="80"
                max="100"
                value={thresholds.battery_high_soc_percent}
                onChange={(e) => handleNumericChange('battery_high_soc_percent', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs font-mono text-slate-400">%</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Battery is considered fully replenished; float transition begins (default 98%).
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
            <div className="font-medium text-slate-300">Remaining Capacity Context:</div>
            <div>
              At nominal 100 Ah capacity, 20% SoC represents ~20 Ah remaining (~480 Wh usable energy).
            </div>
          </div>
        </div>

        {/* Section 3: Current & Power Limits */}
        <div className="space-y-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              3. Current & Power Limits
            </h3>
          </div>

          {/* Battery Max Discharge Current */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Max Battery Discharge Current</label>
              <span className="font-mono text-cyan-400 text-[11px] font-semibold">
                {thresholds.battery_max_discharge_current_a} A
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="5"
                min="10"
                max="150"
                value={thresholds.battery_max_discharge_current_a}
                onChange={(e) => handleNumericChange('battery_max_discharge_current_a', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs font-mono text-slate-400">A</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Prevents high thermal stress on 100Ah LiFePO4 cells (0.8C continuous = 80 A).
            </p>
          </div>

          {/* Battery Max Charge Current */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Max Battery Charge Current</label>
              <span className="font-mono text-cyan-400 text-[11px] font-semibold">
                {thresholds.battery_max_charge_current_a} A
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="5"
                min="5"
                max="80"
                value={thresholds.battery_max_charge_current_a}
                onChange={(e) => handleNumericChange('battery_max_charge_current_a', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs font-mono text-slate-400">A</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Recommended LiFePO4 charge rate 0.4C (default 40 A maximum).
            </p>
          </div>

          {/* DC Load Overcurrent */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">DC Load Branch Overcurrent</label>
              <span className="font-mono text-amber-400 text-[11px] font-semibold">
                {thresholds.dc_load_overcurrent_a} A
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="2"
                max="30"
                value={thresholds.dc_load_overcurrent_a}
                onChange={(e) => handleNumericChange('dc_load_overcurrent_a', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs font-mono text-slate-400">A</span>
            </div>
            <p className="text-[10px] text-slate-500">
              INA228 Channel 2 DC distribution branch limit (default 15 A).
            </p>
          </div>

          {/* AC Inverter Overload */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">Inverter Continuous Overload</label>
              <span className="font-mono text-rose-400 text-[11px] font-semibold">
                {thresholds.ac_inverter_overload_w} W
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                min="500"
                max="3500"
                value={thresholds.ac_inverter_overload_w}
                onChange={(e) => handleNumericChange('ac_inverter_overload_w', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs font-mono text-slate-400">W</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Inverter is rated for 3000 W; warning trips when load exceeds 2800 W (&gt;93% duty).
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Notification Preferences & Audio Chimes */}
      <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle options */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span>Notification & Audio Delivery</span>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900/90 transition-colors">
            <input
              type="checkbox"
              checked={thresholds.notifications_sound_enabled}
              onChange={(e) => {
                setThresholds((prev) => ({
                  ...prev,
                  notifications_sound_enabled: e.target.checked,
                }));
                setSavedSuccess(false);
              }}
              className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4"
            />
            <div className="text-xs">
              <div className="font-medium text-slate-200">Browser Audio Chime on Alert Trigger</div>
              <div className="text-[11px] text-slate-400">
                Synthesize acoustic warning beeps via Web Audio API on Windows PC Chrome/Edge
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900/90 transition-colors">
            <input
              type="checkbox"
              checked={thresholds.notify_on_stale_data}
              onChange={(e) => {
                setThresholds((prev) => ({
                  ...prev,
                  notify_on_stale_data: e.target.checked,
                }));
                setSavedSuccess(false);
              }}
              className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4"
            />
            <div className="text-xs">
              <div className="font-medium text-slate-200">Alert on Stale Telemetry (&gt;30s Offline)</div>
              <div className="text-[11px] text-slate-400">
                Display warning banner and record event when ESP32 connection drops
              </div>
            </div>
          </label>
        </div>

        {/* Audio Test & Diagnostics */}
        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Acoustic Synthesizer Verification</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Test browser audio output for each alert severity level without waiting for hardware events.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleTestAudio('info')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Test Info Ping</span>
            </button>
            <button
              onClick={() => handleTestAudio('warning')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Warning Chime</span>
            </button>
            <button
              onClick={() => handleTestAudio('critical')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Test Critical Alarm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer: Save, Reset, Confirmation */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={handleResetToDefaults}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset LiFePO4 Factory Defaults</span>
        </button>

        <div className="flex items-center gap-3 justify-end">
          {savedSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-4 h-4" /> Thresholds Saved Successfully!
            </span>
          )}

          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Alert Thresholds</span>
          </button>
        </div>
      </div>
    </div>
  );
};
