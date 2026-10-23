/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Telemetry Parser & Calculation Unit Tests
 */

import {
  parseTelemetry,
  parseNumberOrNull,
  parseBooleanOrNull,
  isTelemetryStale,
  STALE_TIMEOUT_MS,
} from './telemetryParser';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

export function runTests() {
  console.log('--- Starting Telemetry Parser Unit Tests ---');

  // Test 1: Missing values must be null, never 0
  const emptyResult = parseTelemetry({});
  assert(emptyResult.isValid === true, 'Empty object is syntactically valid JSON');
  assert(emptyResult.data !== null, 'Telemetry object returned');
  assert(emptyResult.data?.solar_voltage_v === null, 'Missing solar_voltage_v is null, not 0');
  assert(emptyResult.data?.battery_current_a === null, 'Missing battery_current_a is null, not 0');
  assert(emptyResult.data?.ac_voltage_v === null, 'Missing ac_voltage_v is null, not 0');
  assert(emptyResult.data?.ac_contactor_feedback === null, 'Missing contactor feedback is null, not false');

  // Test 2: Invalid string / NaN values must return null, not 0
  assert(parseNumberOrNull('NaN') === null, 'parseNumberOrNull("NaN") returns null');
  assert(parseNumberOrNull('') === null, 'parseNumberOrNull("") returns null');
  assert(parseNumberOrNull(undefined) === null, 'parseNumberOrNull(undefined) returns null');
  assert(parseNumberOrNull('invalid_str') === null, 'parseNumberOrNull("invalid_str") returns null');
  assert(parseNumberOrNull(-5, 0, 100) === null, 'parseNumberOrNull with out-of-range negative returns null');

  // Test 3: Valid numbers parse accurately
  assert(parseNumberOrNull(24.85) === 24.85, 'parseNumberOrNull(24.85) parses correctly');
  assert(parseNumberOrNull('230.4') === 230.4, 'parseNumberOrNull("230.4") string parses correctly');
  assert(parseNumberOrNull(0) === 0, 'parseNumberOrNull(0) genuinely keeps 0 when 0 is provided');

  // Test 4: Boolean parsing
  assert(parseBooleanOrNull(true) === true, 'parseBooleanOrNull(true) returns true');
  assert(parseBooleanOrNull(false) === false, 'parseBooleanOrNull(false) returns false');
  assert(parseBooleanOrNull('true') === true, 'parseBooleanOrNull("true") returns true');
  assert(parseBooleanOrNull('0') === false, 'parseBooleanOrNull("0") returns false');
  assert(parseBooleanOrNull(null) === null, 'parseBooleanOrNull(null) returns null');
  assert(parseBooleanOrNull('unknown') === null, 'parseBooleanOrNull("unknown") returns null');

  // Test 5: Full valid payload parsing & calculations
  const samplePayload = {
    device_id: 'ESP32-SOLAR-MAIN',
    timestamp: Date.now(),
    solar_voltage_v: 36.5,
    solar_current_a: 5.4,
    solar_power_w: 197.1,
    solar_energy_wh: 840,
    battery_voltage_v: 26.6,
    battery_current_a: 4.8, // Charging
    battery_soc_percent: 85,
    battery_remaining_ah: 85.0,
    battery_status: 'charging',
    dc_load_voltage_v: 24.1,
    dc_load_current_a: 1.2,
    dc_load_power_w: 28.9,
    dc_load_energy_wh: 120,
    ac_voltage_v: 231.2,
    ac_current_a: 2.5,
    ac_active_power_w: 550,
    ac_energy_kwh: 3.42,
    ac_frequency_hz: 50.02,
    ac_power_factor: 0.95,
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

  const parsed = parseTelemetry(samplePayload);
  assert(parsed.isValid === true, 'Full payload parses with isValid=true');
  const d = parsed.data!;
  assert(d.device_id === 'ESP32-SOLAR-MAIN', 'Device ID matches');
  assert(d.battery_status === 'charging', 'Battery status is charging');
  assert(d.ac_apparent_power_va !== null && d.ac_apparent_power_va > 550, 'Apparent power calculated');
  assert(d.inverter_load_percent !== null, 'Inverter load percentage calculated against 3000W');
  assert(d.sensor_status.ina228_ch0_solar === 'ok', 'INA228 Ch0 is ok');
  assert(d.ac_contactor_feedback === true, 'Contactor feedback is verified true');

  // Test 6: Stale timestamp detection (>30s)
  const staleTimestamp = Date.now() - (STALE_TIMEOUT_MS + 5000);
  assert(isTelemetryStale(staleTimestamp) === true, 'Timestamp 35s ago detected as stale');
  const freshTimestamp = Date.now() - 5000;
  assert(isTelemetryStale(freshTimestamp) === false, 'Timestamp 5s ago detected as fresh');

  console.log('--- All Unit Tests Completed Successfully ---');
}

// Execute when run directly in node/tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('telemetryParser.test')) {
  try {
    runTests();
  } catch (e) {
    console.error('Test execution failed:', e);
    process.exit(1);
  }
}
