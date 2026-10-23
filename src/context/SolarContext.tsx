/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Main Telemetry & Hardware Control Context
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  TelemetryData,
  SystemConfig,
  AlertItem,
} from '../types/telemetry';
import { parseTelemetry, isTelemetryStale } from '../lib/telemetryParser';
import { generateDemoTelemetry, updateSimState, getSimState } from '../lib/demoSimulator';
import {
  DEFAULT_CONFIG,
  DEFAULT_THRESHOLDS,
  loadConfig,
  saveConfig,
  loadDemoModeState,
  saveDemoModeState,
  loadHistory,
  saveHistory,
  loadAlerts,
  saveAlerts,
  HistoryPoint,
} from '../lib/storage';
import { playAlertSound } from '../lib/audioAlert';

import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  testFirestoreConnection,
  saveTelemetrySampleToFirestore,
  fetchHistoryFromFirestore,
} from '../lib/firebase';

export type ConnectionStatus = 'connected' | 'connecting' | 'stale' | 'error' | 'offline';

export interface DiagnosticsInfo {
  isHttps: boolean;
  potentialMixedContent: boolean;
  roundTripMs: number | null;
  lastHttpStatus: number | null;
  lastResponseBytes: number | null;
  resolvedEndpoint: string;
}

interface SolarContextType {
  telemetry: TelemetryData | null;
  rawJsonString: string;
  isStale: boolean;
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  config: SystemConfig;
  updateConfig: (patch: Partial<SystemConfig>) => void;
  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;
  history: HistoryPoint[];
  alerts: AlertItem[];
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp' | 'acknowledged'>) => void;
  refreshNow: () => Promise<void>;
  triggerAcControl: (action: 'open' | 'close', authToken: string) => Promise<{ success: boolean; message: string }>;
  commandPending: boolean;
  lastCommandResult: { action: 'open' | 'close'; timestamp: number; success: boolean; message: string } | null;
  diagnostics: DiagnosticsInfo;

  // Cloud Mode & Firebase Authentication
  currentUser: User | null;
  isFirebaseReady: boolean;
  signInGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  queryCloudHistory: (startTs: number, endTs: number) => Promise<HistoryPoint[]>;
}

const SolarContext = createContext<SolarContextType | undefined>(undefined);

export const SolarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<SystemConfig>(loadConfig);
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(loadDemoModeState);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [rawJsonString, setRawJsonString] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>(loadHistory);
  const [alerts, setAlerts] = useState<AlertItem[]>(loadAlerts);
  const [commandPending, setCommandPending] = useState<boolean>(false);
  const [lastCommandResult, setLastCommandResult] = useState<{
    action: 'open' | 'close';
    timestamp: number;
    success: boolean;
    message: string;
  } | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo>({
    isHttps: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
    potentialMixedContent: false,
    roundTripMs: null,
    lastHttpStatus: null,
    lastResponseBytes: null,
    resolvedEndpoint: config.api_endpoint,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState<boolean>(false);

  // Monitor Firebase Auth state & Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection().then((ready) => {
      setIsFirebaseReady(ready);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      console.error('Sign-out failed:', err);
    }
  };

  const queryCloudHistory = async (startTs: number, endTs: number): Promise<HistoryPoint[]> => {
    const devId = telemetry?.device_id || 'ESP32-SOLAR-001';
    return await fetchHistoryFromFirestore(devId, startTs, endTs);
  };

  const lastSuccessfulSampleRef = useRef<TelemetryData | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const staleCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateConfig = (patch: Partial<SystemConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  };

  const setDemoMode = (demo: boolean) => {
    setIsDemoModeState(demo);
    saveDemoModeState(demo);
    setLastError(null);
  };

  const addAlert = useCallback(
    (item: Omit<AlertItem, 'id' | 'timestamp' | 'acknowledged'>) => {
      setAlerts((prev) => {
        // Avoid duplicate alert of same title within 60s
        const now = Date.now();
        const existing = prev.find((a) => a.title === item.title && now - a.timestamp < 60000);
        if (existing) return prev;

        const newAlert: AlertItem = {
          ...item,
          id: `alert-${now}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          acknowledged: false,
        };

        // Synthesize browser audio notification if configured
        if (config.alert_thresholds?.notifications_sound_enabled !== false) {
          playAlertSound(item.severity);
        }

        const updated = [newAlert, ...prev].slice(0, 80);
        saveAlerts(updated);
        return updated;
      });
    },
    [config.alert_thresholds?.notifications_sound_enabled]
  );

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
      saveAlerts(updated);
      return updated;
    });
  };

  const clearAlerts = () => {
    setAlerts([]);
    saveAlerts([]);
  };

  // Helper to record data point to history with complete AC and DC separation
  const recordHistorySample = useCallback((data: TelemetryData) => {
    setHistory((prev) => {
      const lastPoint = prev[prev.length - 1];
      // Only append if at least 10 seconds elapsed since last history point
      if (lastPoint && data.timestamp - lastPoint.timestamp < 10000) {
        return prev;
      }

      const newPoint: HistoryPoint = {
        timestamp: data.timestamp,

        // AC Power History (PZEM-004T v3.0)
        ac_voltage_v: data.ac_voltage_v,
        ac_current_a: data.ac_current_a,
        ac_active_power_w: data.ac_active_power_w,
        ac_energy_kwh: data.ac_energy_kwh,
        ac_frequency_hz: data.ac_frequency_hz,
        ac_power_factor: data.ac_power_factor,

        // DC Power History: Channel 0 Solar PV (INA228 via TCA9548A)
        solar_voltage_v: data.solar_voltage_v,
        solar_current_a: data.solar_current_a,
        solar_power_w: data.solar_power_w,
        solar_energy_wh: data.solar_energy_wh,

        // DC Power History: Channel 1 Battery Bank (INA228 via TCA9548A)
        battery_voltage_v: data.battery_voltage_v,
        battery_current_a: data.battery_current_a,
        battery_power_w: data.battery_power_w,
        battery_soc_percent: data.battery_soc_percent,
        battery_remaining_ah: data.battery_remaining_ah,

        // DC Power History: Channel 2 DC System Load (INA228 via TCA9548A)
        dc_load_voltage_v: data.dc_load_voltage_v,
        dc_load_current_a: data.dc_load_current_a,
        dc_load_power_w: data.dc_load_power_w,
        dc_load_energy_wh: data.dc_load_energy_wh,
      };

      const updated = [...prev, newPoint].slice(-2000);
      saveHistory(updated);

      // Sync to Cloud Firestore when Cloud Mode is enabled and authenticated
      if (config.cloud_mode_enabled && auth.currentUser) {
        saveTelemetrySampleToFirestore(data.device_id, newPoint).catch((err) => {
          console.warn('Firestore telemetry sync error:', err);
        });
      }

      // Also forward timestamped sample to backend history logger asynchronously
      try {
        fetch('/api/telemetry/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPoint),
        }).catch(() => {
          // Ignore offline errors for background history logging
        });
      } catch {
        // Ignored
      }

      return updated;
    });
  }, []);

  // Check hardware alert triggers
  const evaluateAlertConditions = useCallback(
    (data: TelemetryData) => {
      const thresholds = config.alert_thresholds || DEFAULT_THRESHOLDS;

      // 1. Battery Voltage Cutoffs & Warnings
      if (data.battery_voltage_v !== null) {
        if (data.battery_voltage_v >= thresholds.battery_over_voltage_v) {
          addAlert({
            severity: 'critical',
            title: 'Battery Over-Voltage Cutoff Warning',
            message: `Battery pack voltage reached ${data.battery_voltage_v.toFixed(2)} V (exceeds ${thresholds.battery_over_voltage_v} V cutoff threshold).`,
            source: 'battery',
          });
        } else if (data.battery_voltage_v <= thresholds.battery_under_voltage_v) {
          addAlert({
            severity: 'critical',
            title: 'Battery Under-Voltage Cutoff Warning',
            message: `Battery pack voltage at ${data.battery_voltage_v.toFixed(2)} V (under ${thresholds.battery_under_voltage_v} V cutoff threshold). Disconnect loads immediately.`,
            source: 'battery',
          });
        } else if (
          thresholds.battery_low_voltage_warning_v &&
          data.battery_voltage_v <= thresholds.battery_low_voltage_warning_v
        ) {
          addAlert({
            severity: 'warning',
            title: 'Battery Low Voltage Warning',
            message: `Battery pack voltage dropped to ${data.battery_voltage_v.toFixed(2)} V (below ${thresholds.battery_low_voltage_warning_v} V warning stage).`,
            source: 'battery',
          });
        }
      }

      // 2. Battery State of Charge (SoC %)
      if (data.battery_soc_percent !== null) {
        if (data.battery_soc_percent <= thresholds.battery_critical_soc_percent) {
          addAlert({
            severity: 'critical',
            title: 'Critical Battery Depletion',
            message: `Battery capacity dropped to ${data.battery_soc_percent}% (critical threshold ${thresholds.battery_critical_soc_percent}%).`,
            source: 'battery',
          });
        } else if (data.battery_soc_percent <= thresholds.battery_low_soc_percent) {
          addAlert({
            severity: 'warning',
            title: 'Low Battery State of Charge',
            message: `Battery capacity is at ${data.battery_soc_percent}% (below ${thresholds.battery_low_soc_percent}% warning threshold). Conserve energy.`,
            source: 'battery',
          });
        }
      }

      // 3. Battery Current Limits
      if (data.battery_current_a !== null) {
        const dischargeCurrent = data.battery_current_a < 0 ? Math.abs(data.battery_current_a) : (data.battery_status === 'discharging' ? data.battery_current_a : 0);
        if (dischargeCurrent > thresholds.battery_max_discharge_current_a) {
          addAlert({
            severity: 'warning',
            title: 'High Battery Discharge Current',
            message: `Battery discharge current reached ${dischargeCurrent.toFixed(1)} A (exceeds ${thresholds.battery_max_discharge_current_a} A limit).`,
            source: 'battery',
          });
        }

        const chargeCurrent = data.battery_current_a > 0 ? data.battery_current_a : 0;
        if (chargeCurrent > thresholds.battery_max_charge_current_a) {
          addAlert({
            severity: 'warning',
            title: 'High Battery Charge Current',
            message: `Battery charging current reached ${chargeCurrent.toFixed(1)} A (exceeds ${thresholds.battery_max_charge_current_a} A limit).`,
            source: 'battery',
          });
        }
      }

      // 4. DC Load Branch Overcurrent
      if (data.dc_load_current_a !== null && data.dc_load_current_a > thresholds.dc_load_overcurrent_a) {
        addAlert({
          severity: 'warning',
          title: 'DC Load Overcurrent Detected',
          message: `DC load circuit current reached ${data.dc_load_current_a.toFixed(2)} A (exceeds ${thresholds.dc_load_overcurrent_a} A threshold). Check DC branches for overload.`,
          source: 'dc_load',
        });
      }

      // 5. Inverter Active Power Overload
      if (data.ac_active_power_w !== null && data.ac_active_power_w > thresholds.ac_inverter_overload_w) {
        addAlert({
          severity: 'critical',
          title: 'Inverter Overload Protection Alert',
          message: `AC inverter output reached ${data.ac_active_power_w.toFixed(0)} W (exceeds configured threshold of ${thresholds.ac_inverter_overload_w} W).`,
          source: 'ac_inverter',
        });
      }

      // 6. AC Line Voltage Window (Over/Under Voltage)
      if (data.ac_voltage_v !== null && data.ac_voltage_v > 50) {
        if (data.ac_voltage_v > thresholds.ac_voltage_high_v) {
          addAlert({
            severity: 'warning',
            title: 'AC High Voltage Warning',
            message: `AC line voltage reached ${data.ac_voltage_v.toFixed(1)} V (exceeds high limit ${thresholds.ac_voltage_high_v} V).`,
            source: 'ac_inverter',
          });
        } else if (data.ac_voltage_v < thresholds.ac_voltage_low_v) {
          addAlert({
            severity: 'warning',
            title: 'AC Low Voltage / Sag Warning',
            message: `AC line voltage dropped to ${data.ac_voltage_v.toFixed(1)} V (below low limit ${thresholds.ac_voltage_low_v} V).`,
            source: 'ac_inverter',
          });
        }
      }

      // Check sensor faults
      const statuses = data.sensor_status;
      if (statuses.ina228_ch0_solar === 'fault') {
        addAlert({
          severity: 'critical',
          title: 'Solar Sensor Fault (INA228 Ch0)',
          message: 'INA228 channel 0 multiplexer read failure. Check I2C bus wiring and TCA9548A.',
          source: 'sensors',
        });
      }
      if (statuses.pzem004t_ac === 'fault') {
        addAlert({
          severity: 'warning',
          title: 'AC Power Sensor Fault (PZEM-004T)',
          message: 'PZEM-004T UART communication timeout. Verify 5V/GND, RX/TX swap, and 100A CT clamp.',
          source: 'sensors',
        });
      }

      // Contactor status check
      if (data.ac_control_status === 'tripped') {
        addAlert({
          severity: 'critical',
          title: 'AC Contactor Hardware Trip Detected',
          message: 'AC contactor was tripped by system protection interlock. Do not attempt auto-reconnect.',
          source: 'contactor',
        });
      }
    },
    [addAlert, config.alert_thresholds]
  );

  // Poll cycle
  const fetchTelemetry = useCallback(async () => {
    if (isDemoMode) {
      // Synthetic realistic simulation
      const demoData = generateDemoTelemetry(config);
      setRawJsonString(JSON.stringify(demoData, null, 2));
      setTelemetry(demoData);
      lastSuccessfulSampleRef.current = demoData;
      setConnectionStatus('connected');
      setLastError(null);
      setDiagnostics((prev) => ({
        ...prev,
        roundTripMs: 12,
        lastHttpStatus: 200,
        lastResponseBytes: 1024,
        resolvedEndpoint: 'Demo Simulation Engine (ESP32-SOLAR-DEMO)',
      }));
      recordHistorySample(demoData);
      evaluateAlertConditions(demoData);
      return;
    }

    // Real device mode
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let targetUrl = config.api_endpoint;

    // Detect mixed content
    const isTargetHttp = targetUrl.startsWith('http://');
    const isMixedContent = isHttps && isTargetHttp;

    if (isMixedContent && config.enable_local_proxy) {
      // Use local server proxy to bypass mixed content restriction
      targetUrl = `/api/proxy?endpoint=${encodeURIComponent(config.api_endpoint + '/telemetry')}`;
    } else {
      // Direct access (e.g., when hosted on local HTTP or local network)
      if (!targetUrl.endsWith('/telemetry')) {
        targetUrl = targetUrl.replace(/\/+$/, '') + '/telemetry';
      }
    }

    setDiagnostics((prev) => ({
      ...prev,
      isHttps,
      potentialMixedContent: isMixedContent && !config.enable_local_proxy,
      resolvedEndpoint: targetUrl,
    }));

    if (isMixedContent && !config.enable_local_proxy) {
      const err =
        'Mixed-Content Blocked: This page is loaded over HTTPS and cannot access private HTTP endpoint directly. Enable "Use Local Proxy" in settings or run Solar Monitor Pro over HTTP.';
      setLastError(err);
      setConnectionStatus('error');
      addAlert({
        severity: 'critical',
        title: 'Mixed Content Network Restriction',
        message: err,
        source: 'connection',
      });
      return;
    }

    const tStart = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      setConnectionStatus((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const tEnd = performance.now();
      const roundTripMs = Math.round(tEnd - tStart);

      setDiagnostics((prev) => ({
        ...prev,
        roundTripMs,
        lastHttpStatus: response.status,
      }));

      if (!response.ok) {
        throw new Error(`ESP32 returned HTTP error status ${response.status} (${response.statusText})`);
      }

      const text = await response.text();
      setRawJsonString(text);
      setDiagnostics((prev) => ({
        ...prev,
        lastResponseBytes: text.length,
      }));

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        throw new Error('Response is not valid JSON. Ensure ESP32 web server returns application/json.');
      }

      const parseResult = parseTelemetry(parsedJson);
      if (!parseResult.isValid || !parseResult.data) {
        throw new Error(`Schema parse error: ${parseResult.errors.join(', ')}`);
      }

      // Successful sample received
      consecutiveFailuresRef.current = 0;
      setTelemetry(parseResult.data);
      lastSuccessfulSampleRef.current = parseResult.data;
      setConnectionStatus(parseResult.data.is_stale ? 'stale' : 'connected');
      setLastError(null);

      recordHistorySample(parseResult.data);
      evaluateAlertConditions(parseResult.data);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      consecutiveFailuresRef.current += 1;
      const errorMsg =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Connection timed out after 4.5 seconds. Check if ESP32 Wi-Fi AP is in range.'
            : err.message
          : 'Unknown network error';

      setLastError(errorMsg);

      // CRITICAL RULE: Retain last valid sample with stale flag
      if (lastSuccessfulSampleRef.current) {
        setTelemetry({
          ...lastSuccessfulSampleRef.current,
          is_stale: true,
        });
        setConnectionStatus('stale');
      } else {
        setConnectionStatus('error');
      }

      if (consecutiveFailuresRef.current === 1 || consecutiveFailuresRef.current % 10 === 0) {
        addAlert({
          severity: 'warning',
          title: 'ESP32 Connection Offline',
          message: errorMsg,
          source: 'connection',
        });
      }
    }
  }, [isDemoMode, config, recordHistorySample, evaluateAlertConditions, addAlert]);

  // Refresh trigger
  const refreshNow = useCallback(async () => {
    await fetchTelemetry();
  }, [fetchTelemetry]);

  // Polling setup
  useEffect(() => {
    fetchTelemetry();

    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = setInterval(() => {
      fetchTelemetry();
    }, config.poll_interval_ms);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [fetchTelemetry, config.poll_interval_ms]);

  // Stale check timer (runs every 2 seconds to check if data is > 30s old)
  useEffect(() => {
    if (staleCheckTimerRef.current) clearInterval(staleCheckTimerRef.current);
    staleCheckTimerRef.current = setInterval(() => {
      setTelemetry((prev) => {
        if (!prev) return prev;
        const stale = isTelemetryStale(prev.timestamp, config.stale_threshold_ms);
        if (stale !== prev.is_stale) {
          if (stale && connectionStatus === 'connected') {
            setConnectionStatus('stale');
          }
          return { ...prev, is_stale: stale };
        }
        return prev;
      });
    }, 2000);

    return () => {
      if (staleCheckTimerRef.current) clearInterval(staleCheckTimerRef.current);
    };
  }, [config.stale_threshold_ms, connectionStatus]);

  // Contactor control execution
  const triggerAcControl = async (
    action: 'open' | 'close',
    authToken: string
  ): Promise<{ success: boolean; message: string }> => {
    setCommandPending(true);

    try {
      if (isDemoMode) {
        // Simulate command latency
        await new Promise((resolve) => setTimeout(resolve, 800));

        updateSimState({
          contactor_closed: action === 'close',
        });

        // Trigger immediate telemetry update
        const updated = generateDemoTelemetry(config);
        setTelemetry(updated);

        const result = {
          action,
          timestamp: Date.now(),
          success: true,
          message: `Demo command '${action.toUpperCase()}' dispatched successfully. Contactor is now ${action === 'close' ? 'ENERGIZED (CLOSED)' : 'DE-ENERGIZED (OPEN)'}.`,
        };
        setLastCommandResult(result);
        addAlert({
          severity: 'info',
          title: `Contactor ${action === 'close' ? 'Closed' : 'Opened'}`,
          message: result.message,
          source: 'contactor',
        });
        return { success: true, message: result.message };
      }

      // Real hardware control endpoint
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      let endpoint = `${config.api_endpoint.replace(/\/+$/, '')}/control/ac-disconnect`;

      if (isHttps && config.enable_local_proxy) {
        endpoint = `/api/control/ac-disconnect`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action,
          timestamp: Date.now(),
          auth_token: authToken,
          target_device: telemetry?.device_id || 'ESP32-SOLAR-001',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || `Control command rejected by ESP32 (HTTP ${res.status})`);
      }

      const msg = json.message || `Command '${action}' accepted by controller.`;
      const result = {
        action,
        timestamp: Date.now(),
        success: true,
        message: msg,
      };
      setLastCommandResult(result);

      // Force immediate poll to verify hardware feedback
      setTimeout(() => {
        fetchTelemetry();
      }, 500);

      return { success: true, message: msg };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to transmit contactor command';
      const result = {
        action,
        timestamp: Date.now(),
        success: false,
        message: msg,
      };
      setLastCommandResult(result);
      addAlert({
        severity: 'critical',
        title: 'AC Contactor Control Failed',
        message: msg,
        source: 'contactor',
      });
      return { success: false, message: msg };
    } finally {
      setCommandPending(false);
    }
  };

  const isStale = Boolean(telemetry?.is_stale || connectionStatus === 'stale');

  return (
    <SolarContext.Provider
      value={{
        telemetry,
        rawJsonString,
        isStale,
        connectionStatus,
        lastError,
        config,
        updateConfig,
        isDemoMode,
        setDemoMode,
        history,
        alerts,
        acknowledgeAlert,
        clearAlerts,
        addAlert,
        refreshNow,
        triggerAcControl,
        commandPending,
        lastCommandResult,
        diagnostics,
        currentUser,
        isFirebaseReady,
        signInGoogle,
        signOutUser,
        queryCloudHistory,
      }}
    >
      {children}
    </SolarContext.Provider>
  );
};

export function useSolar(): SolarContextType {
  const context = useContext(SolarContext);
  if (!context) {
    throw new Error('useSolar must be used within a SolarProvider');
  }
  return context;
}
