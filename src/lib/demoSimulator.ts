/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Realistic ESP32 Solar Physics Simulator
 */

import { TelemetryData, SystemConfig, SensorStatusMap, AcControlStatus } from '../types/telemetry';

export interface SimulationState {
  contactor_closed: boolean;
  contactor_feedback_enabled: boolean;
  sensor_fault_target: string | null; // e.g. 'ina228_ch0_solar'
  solar_intensity_override: number | null; // 0.0 to 1.0 (null = time of day)
  ac_load_scenario: 'idle' | 'residential' | 'heavy' | 'overload';
  battery_soc_internal: number; // 0 to 100
  simulated_time_offset: number;
}

export const defaultSimState: SimulationState = {
  contactor_closed: true,
  contactor_feedback_enabled: true,
  sensor_fault_target: null,
  solar_intensity_override: null,
  ac_load_scenario: 'residential',
  battery_soc_internal: 82.4,
  simulated_time_offset: 0,
};

let currentSimState: SimulationState = { ...defaultSimState };
let accumulatedSolarWh = 642.5;
let accumulatedDcLoadWh = 184.2;
let accumulatedAcKwh = 3.84;

export function getSimState(): SimulationState {
  return currentSimState;
}

export function updateSimState(patch: Partial<SimulationState>) {
  currentSimState = { ...currentSimState, ...patch };
}

/**
 * Computes LiFePO4 8S battery voltage based on State of Charge (SOC 0-100%)
 * Characteristic LFP curve: steep drop below 10%, very flat plateau around 26.4V-26.6V (3.3V/cell), steep rise above 90% up to 28.8V
 */
export function estimateLiFePO4Voltage(soc: number, netCurrentA: number): number {
  const clampedSoc = Math.max(0, Math.min(100, soc));
  let restingOcv: number;

  if (clampedSoc > 99) {
    restingOcv = 28.0 + (clampedSoc - 99) * 0.8; // up to 28.8V
  } else if (clampedSoc > 90) {
    restingOcv = 26.8 + ((clampedSoc - 90) / 10) * 1.2;
  } else if (clampedSoc > 20) {
    // Flat LFP plateau (3.30V - 3.35V per cell -> 26.4V - 26.8V)
    restingOcv = 26.2 + ((clampedSoc - 20) / 70) * 0.6;
  } else if (clampedSoc > 10) {
    restingOcv = 24.8 + ((clampedSoc - 10) / 10) * 1.4;
  } else {
    // Depleted knee (2.5V/cell -> 20.0V - 24.8V)
    restingOcv = 20.5 + (clampedSoc / 10) * 4.3;
  }

  // Add internal resistance drop/rise (approx 20 mΩ = 0.020 Ω for 100Ah 24V pack)
  const vDrop = netCurrentA * 0.025;
  const terminalVoltage = restingOcv + vDrop;
  return Math.round(terminalVoltage * 100) / 100;
}

/**
 * Generates next realistic telemetry sample for demo mode
 */
export function generateDemoTelemetry(config: SystemConfig): TelemetryData {
  const now = Date.now();
  const date = new Date(now);
  const hour = date.getHours() + date.getMinutes() / 60;

  // 1. Solar calculation
  let irradianceRatio = 0;
  if (currentSimState.solar_intensity_override !== null) {
    irradianceRatio = currentSimState.solar_intensity_override;
  } else {
    // Solar window approx 6am to 6pm, peak at 12:30pm
    if (hour >= 6.0 && hour <= 18.0) {
      const solarAngle = ((hour - 6.0) / 12.0) * Math.PI;
      irradianceRatio = Math.sin(solarAngle);
    }
  }

  // Small random cloud/measurement jitter
  const solarJitter = 1 + (Math.random() - 0.5) * 0.04;
  const maxWatts = config.solar_panel_watts; // e.g. 200W
  const solar_power_w = Math.max(0, Math.round(maxWatts * irradianceRatio * solarJitter * 10) / 10);
  
  // MPPT voltage typically 30-36V under load, open-circuit ~39V when no irradiance
  const solar_voltage_v = solar_power_w > 5 
    ? Math.round((32.5 + (Math.random() - 0.5) * 0.8) * 100) / 100
    : (irradianceRatio > 0.05 ? 36.8 : 1.2);
  
  const solar_current_a = solar_voltage_v > 5 
    ? Math.round((solar_power_w / solar_voltage_v) * 100) / 100
    : 0;

  // Accumulate solar energy (5s timestep = 5 / 3600 h)
  accumulatedSolarWh += (solar_power_w * (config.poll_interval_ms / 1000)) / 3600;

  // 2. DC Load (Channel 2)
  // Constant background consumption (router, LED, ESP32 instrumentation: 22W - 38W)
  const dc_load_voltage_v = 24.2 + (Math.random() - 0.5) * 0.2;
  const baseDcPower = 28.5 + (Math.random() - 0.5) * 4;
  const dc_load_power_w = Math.round(baseDcPower * 10) / 10;
  const dc_load_current_a = Math.round((dc_load_power_w / dc_load_voltage_v) * 100) / 100;
  accumulatedDcLoadWh += (dc_load_power_w * (config.poll_interval_ms / 1000)) / 3600;

  // 3. AC Load (PZEM-004T v3.0 on 230V AC Inverter, 3000W rated)
  let ac_voltage_v: number | null = 230.5 + (Math.random() - 0.5) * 1.5;
  let ac_frequency_hz: number | null = 50.01 + (Math.random() - 0.5) * 0.04;
  let ac_active_power_w: number | null = 0;
  let ac_power_factor: number | null = 0.94;
  let ac_current_a: number | null = 0;

  if (currentSimState.contactor_closed) {
    switch (currentSimState.ac_load_scenario) {
      case 'idle':
        ac_active_power_w = 45 + (Math.random() - 0.5) * 6; // Inverter no-load + standby
        ac_power_factor = 0.72;
        break;
      case 'residential':
        // Typical lights, TV, fridge cycling (380W - 650W)
        ac_active_power_w = 480 + (Math.random() - 0.5) * 45;
        ac_power_factor = 0.92;
        break;
      case 'heavy':
        // Microwave, coffee machine, power tool (1850W - 2200W)
        ac_active_power_w = 1950 + (Math.random() - 0.5) * 80;
        ac_power_factor = 0.96;
        break;
      case 'overload':
        // Exceeds 3000W continuous rating (3150W)
        ac_active_power_w = 3150 + (Math.random() - 0.5) * 50;
        ac_power_factor = 0.98;
        break;
    }

    ac_current_a = Math.round((ac_active_power_w / (ac_voltage_v * ac_power_factor)) * 100) / 100;
    accumulatedAcKwh += (ac_active_power_w * (config.poll_interval_ms / 1000)) / (3600 * 1000);
  } else {
    // Contactor opened: zero load current and zero active power
    ac_current_a = 0;
    ac_active_power_w = 0;
    ac_power_factor = 1.0;
  }

  // 4. Inverter DC Draw calculation (approx 91% conversion efficiency)
  const inverterDcPower = (ac_active_power_w || 0) > 0 ? (ac_active_power_w! / 0.91) + 25 : 12;

  // 5. Battery Net Power & SOC calculation
  // Net power into battery = Solar Power - DC Load Power - Inverter DC Draw Power
  const netBatteryPower = solar_power_w - dc_load_power_w - inverterDcPower;
  
  // Approximate battery terminal voltage to get net current
  const estBatVolts = estimateLiFePO4Voltage(currentSimState.battery_soc_internal, 0);
  const battery_current_a = Math.round((netBatteryPower / estBatVolts) * 100) / 100;
  const battery_power_w = Math.round(netBatteryPower * 10) / 10;
  const battery_voltage_v = estimateLiFePO4Voltage(currentSimState.battery_soc_internal, battery_current_a);

  // Update internal battery SOC (100Ah battery)
  // Current in Amperes * hours elapsed / Capacity Ah
  const deltaHours = config.poll_interval_ms / (1000 * 3600);
  const deltaAh = battery_current_a * deltaHours;
  currentSimState.battery_soc_internal = Math.max(
    5.0,
    Math.min(100.0, currentSimState.battery_soc_internal + (deltaAh / config.battery_capacity_ah) * 100)
  );
  const battery_soc_percent = Math.round(currentSimState.battery_soc_internal * 10) / 10;
  const battery_remaining_ah = Math.round((battery_soc_percent / 100) * config.battery_capacity_ah * 10) / 10;

  let battery_status: 'charging' | 'discharging' | 'idle' | 'full' | 'depleted' = 'idle';
  if (battery_soc_percent >= 99.5 && battery_current_a >= 0) {
    battery_status = 'full';
  } else if (battery_soc_percent <= 10.0) {
    battery_status = 'depleted';
  } else if (battery_current_a > 0.4) {
    battery_status = 'charging';
  } else if (battery_current_a < -0.4) {
    battery_status = 'discharging';
  }

  // 6. Sensor status
  const sensor_status: SensorStatusMap = {
    ina228_ch0_solar: 'ok',
    ina228_ch1_battery: 'ok',
    ina228_ch2_dc_load: 'ok',
    tca9548a_mux: 'ok',
    pzem004t_ac: 'ok',
  };

  // Inject target fault if requested in simulation controls
  if (currentSimState.sensor_fault_target && currentSimState.sensor_fault_target in sensor_status) {
    sensor_status[currentSimState.sensor_fault_target as keyof SensorStatusMap] = 'fault';
  }

  // 7. Contactor feedback and status
  const ac_contactor_feedback = currentSimState.contactor_feedback_enabled
    ? currentSimState.contactor_closed
    : null; // null represents unconfirmed/unwired hardware auxiliary feedback

  let ac_control_status: AcControlStatus = currentSimState.contactor_closed ? 'closed' : 'open';
  if (currentSimState.ac_load_scenario === 'overload') {
    // Simulate safety trip
    ac_control_status = 'tripped';
  }

  return {
    device_id: 'ESP32-SOLAR-DEMO',
    timestamp: now,
    timestamp_iso: new Date(now).toISOString(),
    solar_voltage_v,
    solar_current_a,
    solar_power_w,
    solar_energy_wh: Math.round(accumulatedSolarWh * 10) / 10,
    battery_voltage_v,
    battery_current_a,
    battery_power_w,
    battery_soc_percent,
    battery_remaining_ah,
    battery_status,
    dc_load_voltage_v: Math.round(dc_load_voltage_v * 100) / 100,
    dc_load_current_a,
    dc_load_power_w,
    dc_load_energy_wh: Math.round(accumulatedDcLoadWh * 10) / 10,
    ac_voltage_v: Math.round(ac_voltage_v * 10) / 10,
    ac_current_a,
    ac_active_power_w: Math.round(ac_active_power_w * 10) / 10,
    ac_energy_kwh: Math.round(accumulatedAcKwh * 100) / 100,
    ac_frequency_hz: Math.round(ac_frequency_hz * 100) / 100,
    ac_power_factor,
    ac_apparent_power_va: Math.round((ac_voltage_v * (ac_current_a || 0)) * 10) / 10,
    ac_reactive_power_var: ac_active_power_w && ac_current_a 
      ? Math.round(Math.sqrt(Math.max(0, Math.pow(ac_voltage_v * ac_current_a, 2) - Math.pow(ac_active_power_w, 2))) * 10) / 10
      : 0,
    inverter_load_percent: Math.round(((ac_active_power_w || 0) / config.inverter_rated_watts) * 1000) / 10,
    sensor_status,
    ac_contactor_feedback,
    ac_breaker_aux_status: true,
    ac_control_status,
    is_stale: false,
    received_at: now,
  };
}
