/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Shared ESP32 Telemetry Contract & Types
 */

export type SensorHealth = 'ok' | 'fault' | 'offline';

export interface SensorStatusMap {
  ina228_ch0_solar: SensorHealth;
  ina228_ch1_battery: SensorHealth;
  ina228_ch2_dc_load: SensorHealth;
  tca9548a_mux: SensorHealth;
  pzem004t_ac: SensorHealth;
}

export type BatteryStatus = 'charging' | 'discharging' | 'idle' | 'full' | 'depleted';

export type AcControlStatus = 'closed' | 'open' | 'tripped' | 'command_pending' | 'unknown';

export interface RawTelemetryPayload {
  device_id?: unknown;
  timestamp?: unknown;
  solar_voltage_v?: unknown;
  solar_current_a?: unknown;
  solar_power_w?: unknown;
  solar_energy_wh?: unknown;
  battery_voltage_v?: unknown;
  battery_current_a?: unknown;
  battery_power_w?: unknown;
  battery_soc_percent?: unknown;
  battery_remaining_ah?: unknown;
  battery_status?: unknown;
  dc_load_voltage_v?: unknown;
  dc_load_current_a?: unknown;
  dc_load_power_w?: unknown;
  dc_load_energy_wh?: unknown;
  ac_voltage_v?: unknown;
  ac_current_a?: unknown;
  ac_active_power_w?: unknown;
  ac_energy_kwh?: unknown;
  ac_frequency_hz?: unknown;
  ac_power_factor?: unknown;
  sensor_status?: unknown;
  ac_contactor_feedback?: unknown;
  ac_breaker_aux_status?: unknown;
  ac_control_status?: unknown;
}

export interface TelemetryData {
  device_id: string;
  timestamp: number; // Unix epoch ms
  timestamp_iso: string;

  // Channel 0: Solar PV (INA228)
  solar_voltage_v: number | null;
  solar_current_a: number | null;
  solar_power_w: number | null;
  solar_energy_wh: number | null;

  // Channel 1: Battery (INA228 - 24V 100Ah LiFePO4)
  battery_voltage_v: number | null;
  battery_current_a: number | null;
  battery_power_w: number | null;
  battery_soc_percent: number | null;
  battery_remaining_ah: number | null;
  battery_status: BatteryStatus | null;

  // Channel 2: DC Load (INA228)
  dc_load_voltage_v: number | null;
  dc_load_current_a: number | null;
  dc_load_power_w: number | null;
  dc_load_energy_wh: number | null;

  // AC Inverter & PZEM-004T v3.0 (230V AC, 3000W Inverter)
  ac_voltage_v: number | null;
  ac_current_a: number | null;
  ac_active_power_w: number | null;
  ac_energy_kwh: number | null;
  ac_frequency_hz: number | null;
  ac_power_factor: number | null;

  // Computed AC fields
  ac_apparent_power_va: number | null;
  ac_reactive_power_var: number | null;
  inverter_load_percent: number | null; // Based on 3000W rated capacity

  // Hardware Status
  sensor_status: SensorStatusMap;
  ac_contactor_feedback: boolean | null; // Auxiliary dry-contact feedback from contactor
  ac_breaker_aux_status: boolean | null; // Physical breaker auxiliary switch
  ac_control_status: AcControlStatus;

  // Telemetry metadata
  is_stale: boolean;
  received_at: number; // Browser timestamp ms
}

export interface AlertThresholdsConfig {
  battery_over_voltage_v: number; // e.g. 29.2 V
  battery_under_voltage_v: number; // e.g. 21.0 V
  battery_low_voltage_warning_v: number; // e.g. 22.4 V
  battery_low_soc_percent: number; // e.g. 20%
  battery_critical_soc_percent: number; // e.g. 10%
  battery_high_soc_percent: number; // e.g. 98%
  battery_max_discharge_current_a: number; // e.g. 80 A
  battery_max_charge_current_a: number; // e.g. 40 A
  dc_load_overcurrent_a: number; // e.g. 15 A
  ac_inverter_overload_w: number; // e.g. 2800 W
  ac_voltage_high_v: number; // e.g. 250 V
  ac_voltage_low_v: number; // e.g. 205 V
  notifications_sound_enabled: boolean;
  notify_on_stale_data: boolean;
}

export interface SystemConfig {
  solar_panel_watts: number; // 100 to 300 W
  battery_capacity_ah: number; // 100 Ah default
  battery_nominal_voltage: number; // 24 V default
  inverter_rated_watts: number; // 3000 W default
  api_endpoint: string; // e.g. "http://192.168.4.1/api"
  poll_interval_ms: number; // default 5000ms
  stale_threshold_ms: number; // default 30000ms
  enable_local_proxy: boolean;
  hardware_contactor_installed: boolean;
  cloud_mode_enabled: boolean;
  cloud_ingest_endpoint: string;
  alert_thresholds?: AlertThresholdsConfig;
}

export interface AlertItem {
  id: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  acknowledged: boolean;
  source: 'battery' | 'solar' | 'dc_load' | 'ac_inverter' | 'sensors' | 'connection' | 'contactor';
}

export interface ParseResult {
  data: TelemetryData | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
