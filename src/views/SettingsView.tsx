/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Settings & API Contract Diagnostics View
 */

import React, { useState } from 'react';
import {
  Settings,
  Code,
  FileJson,
  Sliders,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { parseTelemetry } from '../lib/telemetryParser';
import { getSimState, updateSimState, SimulationState } from '../lib/demoSimulator';
import { AlertsConfigCard } from '../components/AlertsConfigCard';

export const SettingsView: React.FC = () => {
  const {
    config,
    updateConfig,
    rawJsonString,
    isDemoMode,
    setDemoMode,
    refreshNow,
    currentUser,
    isFirebaseReady,
    signInGoogle,
    signOutUser,
  } = useSolar();

  // Test payload validator state
  const [testPayloadInput, setTestPayloadInput] = useState('');
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    valid: boolean;
    errors: string[];
    warnings: string[];
    parsedData?: unknown;
  } | null>(null);

  // Demo simulation controls state
  const simState = getSimState();
  const [localSimState, setLocalSimState] = useState<SimulationState>(simState);

  const handleUpdateSim = (patch: Partial<SimulationState>) => {
    updateSimState(patch);
    setLocalSimState(getSimState());
    refreshNow();
  };

  const handleValidateCustomJson = () => {
    try {
      const parsed = JSON.parse(testPayloadInput);
      const res = parseTelemetry(parsed);
      setValidationResult({
        tested: true,
        valid: res.isValid,
        errors: res.errors,
        warnings: res.warnings,
        parsedData: res.data,
      });
    } catch (e) {
      setValidationResult({
        tested: true,
        valid: false,
        errors: [`JSON Syntax Error: ${e instanceof Error ? e.message : 'Invalid JSON'}`],
        warnings: [],
      });
    }
  };

  const loadExampleContractJson = () => {
    const example = {
      device_id: 'ESP32-SOLAR-001',
      timestamp: Date.now(),
      solar_voltage_v: 34.2,
      solar_current_a: 5.85,
      solar_power_w: 200.1,
      solar_energy_wh: 750.2,
      battery_voltage_v: 26.54,
      battery_current_a: 4.2,
      battery_power_w: 111.4,
      battery_soc_percent: 84.0,
      battery_remaining_ah: 84.0,
      battery_status: 'charging',
      dc_load_voltage_v: 24.1,
      dc_load_current_a: 1.15,
      dc_load_power_w: 27.7,
      dc_load_energy_wh: 145.0,
      ac_voltage_v: 230.8,
      ac_current_a: 2.4,
      ac_active_power_w: 520.0,
      ac_energy_kwh: 4.12,
      ac_frequency_hz: 50.01,
      ac_power_factor: 0.94,
      sensor_status: {
        ina228_ch0_solar: 'ok',
        ina228_ch1_battery: 'ok',
        ina228_ch2_dc_load: 'ok',
        tca9548a_mux: 'ok',
        pzem004t_ac: 'ok',
      },
      ac_contactor_feedback: true,
      ac_breaker_aux_status: true,
      ac_control_status: 'closed',
    };
    setTestPayloadInput(JSON.stringify(example, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings & API Diagnostics</h1>
          <p className="text-xs text-slate-400 mt-1">
            System configuration · API contract validation · Remote mode · Demo simulation physics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Schema Version:</span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">v1.2 (Unified Android/Web)</span>
        </div>
      </div>

      {/* Hardware System Rating Configuration */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Hardware System Ratings</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Solar Panel Rating */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Solar Array Rating (W)</label>
            <select
              value={config.solar_panel_watts}
              onChange={(e) => updateConfig({ solar_panel_watts: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={100}>100 W (Portable Foldable)</option>
              <option value={150}>150 W (Single Rigid Monocrystalline)</option>
              <option value={200}>200 W (Dual 100W Parallel)</option>
              <option value={250}>250 W (High Efficiency)</option>
              <option value={300}>300 W (Max Permitted Array)</option>
            </select>
            <span className="text-[10px] text-slate-500 block">Configurable 100W to 300W</span>
          </div>

          {/* Battery Capacity */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">LiFePO4 Capacity (Ah)</label>
            <input
              type="number"
              min={20}
              max={300}
              value={config.battery_capacity_ah}
              onChange={(e) => updateConfig({ battery_capacity_ah: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block">Default 100 Ah (2560 Wh)</span>
          </div>

          {/* Inverter Rating */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">AC Inverter Rating (W)</label>
            <input
              type="number"
              min={500}
              max={5000}
              value={config.inverter_rated_watts}
              onChange={(e) => updateConfig({ inverter_rated_watts: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block">230V AC Pure Sine Wave (3000W)</span>
          </div>

          {/* Polling Interval */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Telemetry Polling Rate</label>
            <select
              value={config.poll_interval_ms}
              onChange={(e) => updateConfig({ poll_interval_ms: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={2000}>2 seconds (High Frequency)</option>
              <option value={5000}>5 seconds (Standard Contract)</option>
              <option value={10000}>10 seconds (Low Bandwidth)</option>
              <option value={30000}>30 seconds (Conservation)</option>
            </select>
            <span className="text-[10px] text-slate-500 block">Standard: 5s while active</span>
          </div>
        </div>
      </div>

      {/* Alerts & Safety Protection Thresholds Configuration */}
      <AlertsConfigCard />

      {/* Demo Physics Simulation Controls (When Demo Mode Active) */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Demo Physics Engine Simulator Controls
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Simulation Mode:</span>
            <button
              onClick={() => setDemoMode(!isDemoMode)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                isDemoMode ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isDemoMode ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Test system behavior, BMS protection cutoffs, AC loads, and sensor faults safely inside
          the browser without physical hardware attached.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* AC Load Scenario */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">AC Inverter Load Profile</label>
            <select
              value={localSimState.ac_load_scenario}
              onChange={(e) =>
                handleUpdateSim({
                  ac_load_scenario: e.target.value as 'idle' | 'residential' | 'heavy' | 'overload',
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="idle">Idle (~45 W Standby)</option>
              <option value="residential">Residential (~500 W TV/Fridge)</option>
              <option value="heavy">Heavy (~2000 W Microwave/Tools)</option>
              <option value="overload">Overload (&gt;3100 W Trips Contactor)</option>
            </select>
          </div>

          {/* Solar Irradiance Override */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Solar Sunlight Override</label>
            <select
              value={
                localSimState.solar_intensity_override === null
                  ? 'auto'
                  : String(localSimState.solar_intensity_override)
              }
              onChange={(e) =>
                handleUpdateSim({
                  solar_intensity_override:
                    e.target.value === 'auto' ? null : Number(e.target.value),
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="auto">Auto (Sun Position from Clock)</option>
              <option value="1.0">Peak Noon Irradiance (100%)</option>
              <option value="0.5">Partially Overcast (50%)</option>
              <option value="0.15">Heavy Rain Clouds (15%)</option>
              <option value="0.0">Night / Pitch Black (0%)</option>
            </select>
          </div>

          {/* Sensor Fault Injection */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Sensor Fault Injection</label>
            <select
              value={localSimState.sensor_fault_target || 'none'}
              onChange={(e) =>
                handleUpdateSim({
                  sensor_fault_target: e.target.value === 'none' ? null : e.target.value,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="none">No Faults (All Sensors OK)</option>
              <option value="ina228_ch0_solar">Fail INA228 Ch0 (Solar PV)</option>
              <option value="ina228_ch1_battery">Fail INA228 Ch1 (Battery)</option>
              <option value="ina228_ch2_dc_load">Fail INA228 Ch2 (DC Load)</option>
              <option value="pzem004t_ac">Fail PZEM-004T (AC Power)</option>
            </select>
          </div>

          {/* Contactor Feedback Missing Toggle */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Aux Dry Contact Feedback</label>
            <select
              value={localSimState.contactor_feedback_enabled ? 'connected' : 'unwired'}
              onChange={(e) =>
                handleUpdateSim({
                  contactor_feedback_enabled: e.target.value === 'connected',
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="connected">Wired & Reporting Normally</option>
              <option value="unwired">Unwired (Test UNCONFIRMED Warning)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Remote Cloud Mode (Firebase Auth & Cloud Firestore) */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">Remote Cloud Mode (Firebase Firestore)</h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 border rounded text-xs font-mono font-semibold ${
                isFirebaseReady
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isFirebaseReady ? 'FIRESTORE ONLINE' : 'FIRESTORE CONNECTING'}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <p className="leading-relaxed text-slate-400">
            Cloud Firestore database has been provisioned and integrated. Telemetry samples and AC/DC power
            histories can be persisted to the cloud for secure remote access.
          </p>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Firebase Project ID:</span>
              <span className="text-slate-200">ai-studio-applet-webapp-30701</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Firestore Database ID:</span>
              <span className="text-emerald-400">ai-studio-solarmonitorpro-d39a6d26-70a8-4464-9674-184fd715b551</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Security Rules:</span>
              <span className="text-emerald-400">Hardened ABAC Rules Deployed</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cloud Ingest Endpoint:</span>
              <span className="text-slate-300">{config.cloud_ingest_endpoint}</span>
            </div>
          </div>

          {/* User Authentication & Cloud Sync Toggle */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold font-mono">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{currentUser.displayName || 'Authorized User'}</div>
                    <div className="text-[11px] font-mono text-slate-400">{currentUser.email}</div>
                  </div>
                  <button
                    onClick={() => signOutUser()}
                    className="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => signInGoogle()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                  <span className="text-[11px] text-slate-400">Required to authorize cloud write access</span>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs">
              <input
                type="checkbox"
                checked={config.cloud_mode_enabled}
                onChange={(e) => updateConfig({ cloud_mode_enabled: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
              />
              <span className="text-slate-200">Sync Telemetry to Cloud Firestore</span>
            </label>
          </div>
        </div>
      </div>

      {/* Interactive API Contract & Payload Schema Validator */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Interactive API Contract & JSON Schema Validator
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste or inspect raw ESP32 JSON payloads to test compliance with the unified specification
            </p>
          </div>

          <button
            onClick={loadExampleContractJson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Load Compliant Sample
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Input Editor */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Test Payload (JSON):</span>
              <span className="text-[10px] text-slate-500">Shared contract with native Android app</span>
            </label>
            <textarea
              rows={12}
              value={testPayloadInput}
              onChange={(e) => setTestPayloadInput(e.target.value)}
              placeholder="Paste raw ESP32 JSON here to validate..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-y"
            />
            <button
              onClick={handleValidateCustomJson}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Validate Payload Against Contract</span>
            </button>
          </div>

          {/* Right: Validation Result & Live Stream Viewer */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Validation Report / Live Incoming Stream:</span>
              <span className="text-[10px] text-slate-500">Strict Null-Safety Checked</span>
            </label>

            {validationResult?.tested ? (
              <div
                className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                  validationResult.valid
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Payload conforms to ESP32 Telemetry Contract</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Schema Validation Errors Detected</span>
                    </>
                  )}
                </div>

                {validationResult.errors.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-rose-300">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}

                {validationResult.warnings.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-amber-300">
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-[280px] overflow-y-auto">
                <div className="text-[10px] uppercase font-mono text-slate-500 mb-1">
                  Current Live Feed Raw JSON:
                </div>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                  {rawJsonString || 'No raw telemetry received yet.'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
