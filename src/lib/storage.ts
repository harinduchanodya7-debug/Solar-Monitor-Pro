/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Local Persistence & History Manager
 */

import { SystemConfig, TelemetryData, AlertItem, AlertThresholdsConfig } from '../types/telemetry';

export const DEFAULT_THRESHOLDS: AlertThresholdsConfig = {
  battery_over_voltage_v: 29.2, // 8S LiFePO4 absorption limit (3.65V / cell)
  battery_under_voltage_v: 21.0, // 8S LiFePO4 critical cutoff (2.625V / cell)
  battery_low_voltage_warning_v: 22.4, // Warning stage (2.80V / cell)
  battery_low_soc_percent: 20, // Low state of charge warning
  battery_critical_soc_percent: 10, // Depleted stage
  battery_high_soc_percent: 98, // Nearly full / absorption stage
  battery_max_discharge_current_a: 80, // High discharge warning (A)
  battery_max_charge_current_a: 40, // High charging current warning (A)
  dc_load_overcurrent_a: 15, // DC circuit overcurrent (A)
  ac_inverter_overload_w: 2800, // Inverter high continuous load (>93% of 3000W)
  ac_voltage_high_v: 250, // AC line overvoltage limit (V)
  ac_voltage_low_v: 205, // AC line undervoltage limit (V)
  notifications_sound_enabled: true,
  notify_on_stale_data: true,
};

export const DEFAULT_CONFIG: SystemConfig = {
  solar_panel_watts: 200, // 200 W (configurable 100 to 300)
  battery_capacity_ah: 100, // 100 Ah LiFePO4
  battery_nominal_voltage: 24, // 24 V nominal
  inverter_rated_watts: 3000, // 3000 W rated
  api_endpoint: 'http://192.168.4.1/api',
  poll_interval_ms: 5000, // 5 seconds
  stale_threshold_ms: 30000, // 30 seconds
  enable_local_proxy: true,
  hardware_contactor_installed: true,
  cloud_mode_enabled: false,
  cloud_ingest_endpoint: 'https://telemetry-gateway.example.com/api/v1/ingest',
  alert_thresholds: DEFAULT_THRESHOLDS,
};

const CONFIG_KEY = 'solar_monitor_config_v1';
const HISTORY_KEY = 'solar_monitor_history_v2'; // Upgraded key for complete AC/DC separation
const ALERTS_KEY = 'solar_monitor_alerts_v1';
const DEMO_MODE_KEY = 'solar_monitor_is_demo_v1';

export function loadConfig(): SystemConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        alert_thresholds: {
          ...DEFAULT_THRESHOLDS,
          ...(parsed.alert_thresholds || {}),
        },
      };
    }
  } catch (e) {
    console.warn('Failed to load config from localStorage:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(cfg: SystemConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Failed to save config to localStorage:', e);
  }
}

export function loadDemoModeState(): boolean {
  try {
    const raw = localStorage.getItem(DEMO_MODE_KEY);
    return raw !== null ? raw === 'true' : true;
  } catch {
    return true;
  }
}

export function saveDemoModeState(isDemo: boolean): void {
  try {
    localStorage.setItem(DEMO_MODE_KEY, String(isDemo));
  } catch (e) {
    console.warn('Failed to save demo mode state:', e);
  }
}

/**
 * Complete, strictly separated telemetry sample for AC and DC histories
 */
export interface HistoryPoint {
  timestamp: number;

  // AC Power History (PZEM-004T v3.0)
  ac_voltage_v: number | null;
  ac_current_a: number | null;
  ac_active_power_w: number | null;
  ac_energy_kwh: number | null;
  ac_frequency_hz: number | null;
  ac_power_factor: number | null;

  // DC Power History: Channel 0 Solar PV (INA228 via TCA9548A MUX)
  solar_voltage_v: number | null;
  solar_current_a: number | null;
  solar_power_w: number | null;
  solar_energy_wh: number | null;

  // DC Power History: Channel 1 Battery Bank (INA228 via TCA9548A MUX)
  battery_voltage_v: number | null;
  battery_current_a: number | null; // Signed: positive = charging, negative = discharging
  battery_power_w: number | null;
  battery_soc_percent: number | null;
  battery_remaining_ah: number | null;

  // DC Power History: Channel 2 DC System Load (INA228 via TCA9548A MUX)
  dc_load_voltage_v: number | null;
  dc_load_current_a: number | null;
  dc_load_power_w: number | null;
  dc_load_energy_wh: number | null;
}

/**
 * Generates an initial realistic history baseline for the last 24 hours
 * with accurate, strictly independent AC and DC physics
 */
export function generateSyntheticHistory(pointsCount = 96): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const now = Date.now();
  const stepMs = (24 * 3600 * 1000) / pointsCount; // 15-minute resolution

  let runningSolarWh = 0;
  let runningDcLoadWh = 0;
  let runningAcKwh = 2.15;

  for (let i = pointsCount - 1; i >= 0; i--) {
    const ts = now - i * stepMs;
    const date = new Date(ts);
    const hour = date.getHours() + date.getMinutes() / 60;

    // 1. DC Solar Generation (Ch 0)
    let solar_w = 0;
    let solar_v = 1.5;
    let solar_a = 0;

    if (hour >= 6.5 && hour <= 17.5) {
      const angle = ((hour - 6.5) / 11.0) * Math.PI;
      const irradiance = Math.sin(angle) * (0.85 + Math.random() * 0.25);
      solar_w = Math.max(0, Math.round(195 * irradiance * 10) / 10);
      solar_v = Math.round((33.2 + (Math.random() - 0.5) * 1.2) * 10) / 10;
      solar_a = solar_v > 0 ? Math.round((solar_w / solar_v) * 100) / 100 : 0;
    }
    runningSolarWh += (solar_w * 15) / 60; // 15 mins of solar watts

    // 2. DC System Load (Ch 2)
    const dc_v = Math.round((24.2 + (Math.random() - 0.5) * 0.3) * 100) / 100;
    const dc_w = Math.round((28.0 + (Math.random() - 0.5) * 10) * 10) / 10;
    const dc_a = Math.round((dc_w / dc_v) * 100) / 100;
    runningDcLoadWh += (dc_w * 15) / 60;

    // 3. AC Power & PZEM-004T (Inverter AC Output)
    const ac_v = Math.round((230.5 + (Math.random() - 0.5) * 2.5) * 10) / 10;
    const ac_hz = Math.round((50.01 + (Math.random() - 0.5) * 0.05) * 100) / 100;
    let ac_w = 85 + Math.random() * 40;
    let ac_pf = 0.88;

    if (hour >= 18 && hour <= 22) {
      // Evening cooking / entertainment peak
      ac_w = 480 + Math.random() * 320;
      ac_pf = 0.94;
    } else if (hour >= 7 && hour <= 9) {
      // Morning kettle / appliances
      ac_w = 360 + Math.random() * 220;
      ac_pf = 0.92;
    }
    ac_w = Math.round(ac_w * 10) / 10;
    const ac_a = Math.round((ac_w / (ac_v * ac_pf)) * 100) / 100;
    runningAcKwh += (ac_w * 15) / (60 * 1000);

    // 4. DC Battery Bank (Ch 1)
    // Battery net power = Solar input - DC Load - Inverter DC draw (~91% efficiency)
    const inverterDcDraw = (ac_w / 0.91) + 15;
    const batNetPower = Math.round((solar_w - dc_w - inverterDcDraw) * 10) / 10;
    
    // Battery SOC calculation
    let soc = 74;
    if (hour >= 13 && hour <= 17) {
      soc = 91 + Math.random() * 6;
    } else if (hour >= 4 && hour <= 7) {
      soc = 52 + Math.random() * 8;
    } else {
      soc = 68 + Math.random() * 12;
    }
    soc = Math.max(10, Math.min(100, Math.round(soc * 10) / 10));

    // Approximate LiFePO4 pack voltage
    const bat_v = Math.round((26.3 + ((soc - 50) / 50) * 0.6 + (batNetPower > 0 ? 0.3 : -0.3)) * 100) / 100;
    const bat_a = Math.round((batNetPower / bat_v) * 100) / 100;
    const rem_ah = Math.round((soc / 100) * 100 * 10) / 10;

    points.push({
      timestamp: ts,

      // AC History
      ac_voltage_v: ac_v,
      ac_current_a: ac_a,
      ac_active_power_w: ac_w,
      ac_energy_kwh: Math.round(runningAcKwh * 100) / 100,
      ac_frequency_hz: ac_hz,
      ac_power_factor: ac_pf,

      // DC History (Ch 0)
      solar_voltage_v: solar_v,
      solar_current_a: solar_a,
      solar_power_w: solar_w,
      solar_energy_wh: Math.round(runningSolarWh * 10) / 10,

      // DC History (Ch 1)
      battery_voltage_v: bat_v,
      battery_current_a: bat_a,
      battery_power_w: batNetPower,
      battery_soc_percent: soc,
      battery_remaining_ah: rem_ah,

      // DC History (Ch 2)
      dc_load_voltage_v: dc_v,
      dc_load_current_a: dc_a,
      dc_load_power_w: dc_w,
      dc_load_energy_wh: Math.round(runningDcLoadWh * 10) / 10,
    });
  }

  return points;
}

export function loadHistory(): HistoryPoint[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load history from localStorage:', e);
  }
  const synthetic = generateSyntheticHistory();
  saveHistory(synthetic);
  return synthetic;
}

export function saveHistory(points: HistoryPoint[]): void {
  try {
    // Retain up to 2000 points in client local storage
    const trimmed = points.slice(-2000);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save history to localStorage:', e);
  }
}

export function loadAlerts(): AlertItem[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load alerts from localStorage:', e);
  }
  return [
    {
      id: 'alert-init-1',
      timestamp: Date.now() - 3600000 * 2,
      severity: 'info',
      title: 'Telemetry Session Initialized',
      message: 'Solar Monitor Pro active. Baseline calibration ready.',
      acknowledged: true,
      source: 'connection',
    },
  ];
}

export function saveAlerts(alerts: AlertItem[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(-100)));
  } catch (e) {
    console.warn('Failed to save alerts:', e);
  }
}

/**
 * Exports complete history with separate AC and DC columns.
 * CRITICAL RULE: AC and DC metrics are kept separate and never summed.
 */
export function exportHistoryCsv(history: HistoryPoint[]): void {
  const headers = [
    'Timestamp ISO',
    'Unix Epoch Ms',
    // AC Section (PZEM-004T)
    'AC Voltage (V)',
    'AC Current (A)',
    'AC Active Power (W)',
    'AC Energy (kWh)',
    'AC Frequency (Hz)',
    'AC Power Factor',
    // DC Section (INA228 Ch0 Solar)
    'Solar PV Voltage (V)',
    'Solar PV Current (A)',
    'Solar PV Power (W)',
    'Solar PV Energy (Wh)',
    // DC Section (INA228 Ch1 Battery)
    'Battery Voltage (V)',
    'Battery Current (A)',
    'Battery Net Power (W)',
    'Battery SOC (%)',
    'Battery Capacity (Ah)',
    // DC Section (INA228 Ch2 DC Load)
    'DC Load Voltage (V)',
    'DC Load Current (A)',
    'DC Load Power (W)',
    'DC Load Energy (Wh)',
  ];

  const rows = history.map((pt) => [
    new Date(pt.timestamp).toISOString(),
    pt.timestamp,
    pt.ac_voltage_v ?? '',
    pt.ac_current_a ?? '',
    pt.ac_active_power_w ?? '',
    pt.ac_energy_kwh ?? '',
    pt.ac_frequency_hz ?? '',
    pt.ac_power_factor ?? '',
    pt.solar_voltage_v ?? '',
    pt.solar_current_a ?? '',
    pt.solar_power_w ?? '',
    pt.solar_energy_wh ?? '',
    pt.battery_voltage_v ?? '',
    pt.battery_current_a ?? '',
    pt.battery_power_w ?? '',
    pt.battery_soc_percent ?? '',
    pt.battery_remaining_ah ?? '',
    pt.dc_load_voltage_v ?? '',
    pt.dc_load_current_a ?? '',
    pt.dc_load_power_w ?? '',
    pt.dc_load_energy_wh ?? '',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `solar_monitor_ac_dc_history_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
