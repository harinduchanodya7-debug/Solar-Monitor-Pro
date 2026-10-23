/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Device Connection & Network Diagnostics
 */

import React, { useState } from 'react';
import {
  Wifi,
  Globe,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  ExternalLink,
  Laptop,
  Server,
  Lock,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';

export const ConnectionView: React.FC = () => {
  const { config, updateConfig, diagnostics, connectionStatus, refreshNow, lastError } = useSolar();

  const [endpointInput, setEndpointInput] = useState(config.api_endpoint);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveEndpoint = () => {
    updateConfig({ api_endpoint: endpointInput.trim() });
    setTestResult(null);
    refreshNow();
  };

  const handlePingTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let url = endpointInput.trim();
    if (!url.endsWith('/telemetry')) {
      url = url.replace(/\/+$/, '') + '/telemetry';
    }

    if (isHttps && config.enable_local_proxy) {
      url = `/api/proxy?endpoint=${encodeURIComponent(url)}`;
    }

    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const t1 = performance.now();
      const latencyMs = Math.round(t1 - t0);

      if (res.ok) {
        setTestResult({
          tested: true,
          success: true,
          latencyMs,
          message: `Endpoint responded with HTTP ${res.status} OK in ${latencyMs} ms.`,
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          latencyMs,
          message: `ESP32 returned error status HTTP ${res.status} (${res.statusText}).`,
        });
      }
    } catch (err: unknown) {
      const t1 = performance.now();
      const latencyMs = Math.round(t1 - t0);
      const msg = err instanceof Error ? err.message : 'Network error';
      setTestResult({
        tested: true,
        success: false,
        latencyMs,
        message: `Failed to reach endpoint: ${msg}. Check Wi-Fi connection, CORS headers, or Mixed-Content restrictions.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Device Connection & Diagnostics</h1>
          <p className="text-xs text-slate-400 mt-1">
            ESP32 Wi-Fi Access Point · Local Network Endpoints · Browser Security Rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Current Status:</span>
          <span
            className={`text-xs font-mono font-bold uppercase ${
              connectionStatus === 'connected'
                ? 'text-emerald-400'
                : connectionStatus === 'stale'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Endpoint Configuration & Quick Ping Tool */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">ESP32 Local API Endpoint</h2>
        <p className="text-xs text-slate-400 mb-4">
          Default AP Gateway: <code className="text-emerald-400 font-mono">http://192.168.4.1/api</code>.
          You can also specify an mDNS hostname (e.g. <code className="text-slate-300 font-mono">http://solar.local/api</code>)
          or assigned home router LAN IP (e.g. <code className="text-slate-300 font-mono">http://192.168.1.150/api</code>).
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={endpointInput}
            onChange={(e) => setEndpointInput(e.target.value)}
            placeholder="http://192.168.4.1/api"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handleSaveEndpoint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            Save Endpoint
          </button>

          <button
            onClick={handlePingTest}
            disabled={isTesting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Pinging...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* Ping Test Result Banner */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">{testResult.success ? 'Ping Successful' : 'Ping Failed'}</div>
              <div className="mt-0.5 text-slate-300">{testResult.message}</div>
            </div>
          </div>
        )}

        {/* Local Proxy Toggle */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Enable Local Backend Proxy Relay</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Routes browser requests through the local Node.js server (`/api/proxy`) to bypass
              browser Mixed-Content and CORS restrictions on Windows PC.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={config.enable_local_proxy}
              onChange={(e) => updateConfig({ enable_local_proxy: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Windows PC Wi-Fi Connection Guide (Step-by-step) */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Laptop className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Windows 10/11 Wi-Fi Setup Guide for ESP32 Direct AP
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs">
                1
              </span>
              <span>Connect to Wi-Fi AP</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Open Windows Wi-Fi settings in your taskbar. Select the ESP32 network:
              <strong className="block text-slate-200 font-mono mt-1">SSID: SolarMonitor-AP</strong>
              <span className="text-slate-400 font-mono">Password: solar1234 (default)</span>
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs">
                2
              </span>
              <span>Verify IP Assignment</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Windows will receive an IP via DHCP:
              <span className="block text-slate-300 font-mono mt-1">Your PC IP: 192.168.4.2</span>
              <span className="text-emerald-400 font-mono">ESP32 Gateway: 192.168.4.1</span>
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs">
                3
              </span>
              <span>Launch Browser</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              In Chrome or Microsoft Edge, enter the dashboard. The local telemetry polling will
              automatically synchronize every 5 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Browser Restrictions & Practical Deployment Architecture */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Browser Security Realities: Mixed-Content & Private Network Access
          </h2>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Modern browsers (Google Chrome and Microsoft Edge on Windows) enforce strict security boundaries:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li>
              <strong className="text-slate-200">Mixed Content:</strong> A web application loaded over
              <code className="text-cyan-400 font-mono"> https:// </code> CANNOT make raw fetch calls to an
              unencrypted <code className="text-amber-400 font-mono"> http://192.168.4.1 </code> endpoint.
              The browser will silently block the request.
            </li>
            <li>
              <strong className="text-slate-200">CORS (Cross-Origin Resource Sharing):</strong> The ESP32 web server
              must include the header <code className="text-emerald-400 font-mono">Access-Control-Allow-Origin: *</code>
              in its HTTP responses.
            </li>
          </ul>

          <div className="mt-4 p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
            <h3 className="font-semibold text-slate-200 mb-2">Recommended Deployment Options:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <div className="font-medium text-emerald-400">Option A (Local Full-Stack Server)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Run <code className="text-slate-200 font-mono">npm run dev</code> on your Windows PC. Both the UI
                  and local proxy run over HTTP on <code className="text-slate-200 font-mono">http://localhost:3000</code>,
                  bypassing mixed content completely.
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <div className="font-medium text-cyan-400">Option B (Host Dashboard on ESP32)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Run <code className="text-slate-200 font-mono">npm run build</code> and upload the generated assets
                  to the ESP32’s LittleFS/SPIFFS flash memory. The browser loads the dashboard directly from
                  <code className="text-slate-200 font-mono"> http://192.168.4.1/</code> with zero CORS.
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <div className="font-medium text-indigo-400">Option C (Remote Cloud Ingestion)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Connect ESP32 to home Wi-Fi and push JSON telemetry over HTTPS to Firebase/Cloud endpoint.
                  Access from anywhere without local network restrictions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
