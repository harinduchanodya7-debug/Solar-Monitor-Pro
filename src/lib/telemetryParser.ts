/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Robust Telemetry Parser & Validator
 */

import {
  RawTelemetryPayload,
  TelemetryData,
  SensorStatusMap,
  SensorHealth,
  BatteryStatus,
  AcControlStatus,
  ParseResult,
} from '../types/telemetry';

export const STALE_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Parses numeric telemetry fields.
 * CRITICAL RULE: Missing, empty, NaN, or non-finite values return null (UNAVAILABLE), NEVER zero!
 */
export function parseNumberOrNull(
  value: unknown,
  min?: number,
  max?: number
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'null') {
      return null;
    }
    num = Number(trimmed);
  } else {
    return null;
  }

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  return Math.round(num * 1000) / 1000;
}

export function parseBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 1 || value === '1' || value === 'true' || value === 'TRUE') {
    return true;
  }
  if (value === 0 || value === '0' || value === 'false' || value === 'FALSE') {
    return false;
  }
  return null;
}

export function parseTimestamp(value: unknown): { timestamp: number; iso: string } {
  const now = Date.now();
  if (value === null || value === undefined) {
    return { timestamp: now, iso: new Date(now).toISOString() };
  }

  if (typeof value === 'number') {
    // If given in seconds (ESP32 epoch), convert to ms
    const ms = value < 10000000000 ? value * 1000 : value;
    return { timestamp: ms, iso: new Date(ms).toISOString() };
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return { timestamp: parsed, iso: new Date(parsed).toISOString() };
    }
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      const ms = num < 10000000000 ? num * 1000 : num;
      return { timestamp: ms, iso: new Date(ms).toISOString() };
    }
  }

  return { timestamp: now, iso: new Date(now).toISOString() };
}

function parseSensorHealth(val: unknown): SensorHealth {
  if (typeof val === 'string') {
    const s = val.toLowerCase().trim();
    if (s === 'ok' || s === 'good' || s === 'healthy') return 'ok';
    if (s === 'fault' || s === 'error' || s === 'err') return 'fault';
    if (s === 'offline' || s === 'disconnected' || s === 'unavailable') return 'offline';
  }
  return 'offline';
}

export function parseSensorStatusMap(raw: unknown): SensorStatusMap {
  const defaultStatus: SensorStatusMap = {
    ina228_ch0_solar: 'offline',
    ina228_ch1_battery: 'offline',
    ina228_ch2_dc_load: 'offline',
    tca9548a_mux: 'offline',
    pzem004t_ac: 'offline',
  };

  if (!raw || typeof raw !== 'object') {
    return defaultStatus;
  }

  const obj = raw as Record<string, unknown>;
  return {
    ina228_ch0_solar: parseSensorHealth(obj.ina228_ch0_solar),
    ina228_ch1_battery: parseSensorHealth(obj.ina228_ch1_battery),
    ina228_ch2_dc_load: parseSensorHealth(obj.ina228_ch2_dc_load),
    tca9548a_mux: parseSensorHealth(obj.tca9548a_mux),
    pzem004t_ac: parseSensorHealth(obj.pzem004t_ac),
  };
}

export function parseBatteryStatus(raw: unknown): BatteryStatus | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.toLowerCase().trim();
  if (s === 'charging' || s === 'discharging' || s === 'idle' || s === 'full' || s === 'depleted') {
    return s as BatteryStatus;
  }
  return null;
}

export function parseAcControlStatus(raw: unknown): AcControlStatus {
  if (!raw || typeof raw !== 'string') return 'unknown';
  const s = raw.toLowerCase().trim();
  if (s === 'closed' || s === 'open' || s === 'tripped' || s === 'command_pending') {
    return s as AcControlStatus;
  }
  return 'unknown';
}

/**
 * Checks if a telemetry timestamp is older than the stale threshold (default 30s)
 */
export function isTelemetryStale(timestamp: number, thresholdMs = STALE_TIMEOUT_MS): boolean {
  return Date.now() - timestamp > thresholdMs;
}

/**
 * Main parser conforming to the ESP32 and Android shared contract
 */
export function parseTelemetry(raw: unknown): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      data: null,
      isValid: false,
      errors: ['Payload is not a valid JSON object'],
      warnings: [],
    };
  }

  const payload = raw as RawTelemetryPayload;

  // Device ID
  const device_id = typeof payload.device_id === 'string' && payload.device_id.trim().length > 0
    ? payload.device_id.trim()
    : 'ESP32-SOLAR-001';

  // Timestamp
  const { timestamp, iso: timestamp_iso } = parseTimestamp(payload.timestamp);

  // Solar (INA228 Ch 0)
  const solar_voltage_v = parseNumberOrNull(payload.solar_voltage_v, 0, 100);
  const solar_current_a = parseNumberOrNull(payload.solar_current_a, 0, 50);
  let solar_power_w = parseNumberOrNull(payload.solar_power_w, 0, 1000);
  const solar_energy_wh = parseNumberOrNull(payload.solar_energy_wh, 0);

  // Derive solar power if voltage and current exist and power was not provided
  if (solar_power_w === null && solar_voltage_v !== null && solar_current_a !== null) {
    solar_power_w = Math.round(solar_voltage_v * solar_current_a * 100) / 100;
  }

  // Battery (INA228 Ch 1 - 24V 100Ah LiFePO4)
  const battery_voltage_v = parseNumberOrNull(payload.battery_voltage_v, 0, 36);
  const battery_current_a = parseNumberOrNull(payload.battery_current_a, -150, 150);
  let battery_power_w = parseNumberOrNull(payload.battery_power_w, -4000, 4000);
  const battery_soc_percent = parseNumberOrNull(payload.battery_soc_percent, 0, 100);
  let battery_remaining_ah = parseNumberOrNull(payload.battery_remaining_ah, 0, 200);

  if (battery_power_w === null && battery_voltage_v !== null && battery_current_a !== null) {
    battery_power_w = Math.round(battery_voltage_v * battery_current_a * 100) / 100;
  }

  // Derive remaining Ah from SOC if not given, assuming 100Ah nominal
  if (battery_remaining_ah === null && battery_soc_percent !== null) {
    battery_remaining_ah = Math.round((battery_soc_percent / 100) * 100 * 10) / 10;
  }

  let battery_status = parseBatteryStatus(payload.battery_status);
  if (!battery_status && battery_current_a !== null) {
    if (battery_current_a > 0.3) {
      battery_status = 'charging';
    } else if (battery_current_a < -0.3) {
      battery_status = 'discharging';
    } else {
      battery_status = 'idle';
    }
  }

  // DC Load (INA228 Ch 2)
  const dc_load_voltage_v = parseNumberOrNull(payload.dc_load_voltage_v, 0, 50);
  const dc_load_current_a = parseNumberOrNull(payload.dc_load_current_a, 0, 50);
  let dc_load_power_w = parseNumberOrNull(payload.dc_load_power_w, 0, 2000);
  const dc_load_energy_wh = parseNumberOrNull(payload.dc_load_energy_wh, 0);

  if (dc_load_power_w === null && dc_load_voltage_v !== null && dc_load_current_a !== null) {
    dc_load_power_w = Math.round(dc_load_voltage_v * dc_load_current_a * 100) / 100;
  }

  // AC Inverter & PZEM-004T v3.0 (230V, 100A CT, 3000W Inverter)
  const ac_voltage_v = parseNumberOrNull(payload.ac_voltage_v, 0, 300);
  const ac_current_a = parseNumberOrNull(payload.ac_current_a, 0, 100);
  const ac_active_power_w = parseNumberOrNull(payload.ac_active_power_w, 0, 10000);
  const ac_energy_kwh = parseNumberOrNull(payload.ac_energy_kwh, 0);
  const ac_frequency_hz = parseNumberOrNull(payload.ac_frequency_hz, 40, 70);
  const ac_power_factor = parseNumberOrNull(payload.ac_power_factor, 0, 1.0);

  // Apparent and reactive power calculations
  let ac_apparent_power_va: number | null = null;
  let ac_reactive_power_var: number | null = null;
  let inverter_load_percent: number | null = null;

  if (ac_voltage_v !== null && ac_current_a !== null) {
    ac_apparent_power_va = Math.round(ac_voltage_v * ac_current_a * 10) / 10;

    if (ac_active_power_w !== null) {
      const p = ac_active_power_w;
      const s = ac_apparent_power_va;
      if (s >= p) {
        ac_reactive_power_var = Math.round(Math.sqrt(Math.max(0, s * s - p * p)) * 10) / 10;
      } else {
        ac_reactive_power_var = 0;
      }
      // Inverter load percentage against 3000W continuous rating
      inverter_load_percent = Math.round((p / 3000) * 100 * 10) / 10;
    }
  }

  // Sensors
  const sensor_status = parseSensorStatusMap(payload.sensor_status);

  // Safety & Controls
  const ac_contactor_feedback = parseBooleanOrNull(payload.ac_contactor_feedback);
  const ac_breaker_aux_status = parseBooleanOrNull(payload.ac_breaker_aux_status);
  const ac_control_status = parseAcControlStatus(payload.ac_control_status);

  // Stale detection
  const is_stale = isTelemetryStale(timestamp);
  if (is_stale) {
    warnings.push(`Data is stale: timestamp is older than ${STALE_TIMEOUT_MS / 1000} seconds`);
  }

  const telemetry: TelemetryData = {
    device_id,
    timestamp,
    timestamp_iso,
    solar_voltage_v,
    solar_current_a,
    solar_power_w,
    solar_energy_wh,
    battery_voltage_v,
    battery_current_a,
    battery_power_w,
    battery_soc_percent,
    battery_remaining_ah,
    battery_status,
    dc_load_voltage_v,
    dc_load_current_a,
    dc_load_power_w,
    dc_load_energy_wh,
    ac_voltage_v,
    ac_current_a,
    ac_active_power_w,
    ac_energy_kwh,
    ac_frequency_hz,
    ac_power_factor,
    ac_apparent_power_va,
    ac_reactive_power_var,
    inverter_load_percent,
    sensor_status,
    ac_contactor_feedback,
    ac_breaker_aux_status,
    ac_control_status,
    is_stale,
    received_at: Date.now(),
  };

  return {
    data: telemetry,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
