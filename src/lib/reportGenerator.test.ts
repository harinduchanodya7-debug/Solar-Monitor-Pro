/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Daily Report Generator Unit Tests
 */

import { generateDailyReportData } from './reportGenerator';
import { HistoryPoint, DEFAULT_CONFIG } from './storage';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

export function runReportTests() {
  console.log('--- Starting Daily Report Generator Unit Tests ---');

  // Test 1: Empty history returns empty array
  const emptyReport = generateDailyReportData([], DEFAULT_CONFIG);
  assert(Array.isArray(emptyReport) && emptyReport.length === 0, 'Empty history returns empty report array');

  // Test 2: Calculate daily peak powers and consumption correctly
  const now = new Date('2026-10-23T10:00:00Z').getTime();
  const samplePoints: HistoryPoint[] = [
    {
      timestamp: now,
      ac_voltage_v: 230.0,
      ac_current_a: 2.0,
      ac_active_power_w: 460.0,
      ac_energy_kwh: 10.0,
      ac_frequency_hz: 50.0,
      ac_power_factor: 0.95,
      solar_voltage_v: 35.0,
      solar_current_a: 5.0,
      solar_power_w: 175.0,
      solar_energy_wh: 500.0,
      battery_voltage_v: 26.8,
      battery_current_a: 3.5, // Charging
      battery_power_w: 93.8,
      battery_soc_percent: 85.0,
      battery_remaining_ah: 85.0,
      dc_load_voltage_v: 24.0,
      dc_load_current_a: 1.0,
      dc_load_power_w: 24.0,
      dc_load_energy_wh: 100.0,
    },
    {
      timestamp: now + 3600 * 1000, // 1 hour later
      ac_voltage_v: 232.0,
      ac_current_a: 4.5,
      ac_active_power_w: 1044.0, // Peak AC
      ac_energy_kwh: 11.0,
      ac_frequency_hz: 50.0,
      ac_power_factor: 0.96,
      solar_voltage_v: 36.0,
      solar_current_a: 7.0,
      solar_power_w: 252.0, // Peak Solar
      solar_energy_wh: 752.0,
      battery_voltage_v: 25.2,
      battery_current_a: -10.0, // Discharging 10A
      battery_power_w: -252.0,
      battery_soc_percent: 75.0,
      battery_remaining_ah: 75.0,
      dc_load_voltage_v: 24.0,
      dc_load_current_a: 2.5,
      dc_load_power_w: 60.0, // Peak DC Load
      dc_load_energy_wh: 160.0,
    },
  ];

  const report = generateDailyReportData(samplePoints, DEFAULT_CONFIG);
  assert(report.length === 1, 'Grouped into single calendar day');

  const day1 = report[0];
  // Verify Peak Powers
  assert(day1.peakSolarPowerW === 252.0, `Peak solar power is 252.0 W (got ${day1.peakSolarPowerW})`);
  assert(day1.peakAcPowerW === 1044.0, `Peak AC power is 1044.0 W (got ${day1.peakAcPowerW})`);
  assert(day1.peakDcLoadPowerW === 60.0, `Peak DC load is 60.0 W (got ${day1.peakDcLoadPowerW})`);
  assert(day1.peakBatteryDischargeW !== null && day1.peakBatteryDischargeW >= 252.0, 'Peak battery discharge computed');

  // Verify Average Consumption
  assert(day1.avgAcPowerW !== null && day1.avgAcPowerW > 700, `Average AC active power calculated correctly (${day1.avgAcPowerW} W)`);
  assert(day1.avgDcLoadPowerW !== null && day1.avgDcLoadPowerW === 42.0, `Average DC load power is 42.0 W (got ${day1.avgDcLoadPowerW})`);
  assert(day1.totalAcEnergyKwh === 1.0, `Total daily AC energy consumed is 1.0 kWh (got ${day1.totalAcEnergyKwh})`);
  assert(day1.totalSolarEnergyWh === 252.0, `Total daily solar harvested is 252.0 Wh (got ${day1.totalSolarEnergyWh})`);

  // Verify Battery Cycle Health Data
  assert(day1.minBatteryVoltageV === 25.2, `Min battery voltage is 25.2 V (got ${day1.minBatteryVoltageV})`);
  assert(day1.maxBatteryVoltageV === 26.8, `Max battery voltage is 26.8 V (got ${day1.maxBatteryVoltageV})`);
  assert(day1.minBatterySocPercent === 75.0, `Min battery SoC is 75% (got ${day1.minBatterySocPercent})`);
  assert(day1.maxBatterySocPercent === 85.0, `Max battery SoC is 85% (got ${day1.maxBatterySocPercent})`);
  assert(day1.dailyDodPercent === 10.0, `Daily DoD is 10.0% (got ${day1.dailyDodPercent})`);
  assert(day1.equivalentFullCycles >= 0, `Equivalent full cycles computed (${day1.equivalentFullCycles})`);
  assert(day1.estimatedSohPercent >= 99.0, `Estimated battery SoH is >= 99% (got ${day1.estimatedSohPercent}%)`);

  console.log('--- All Daily Report Generator Tests Passed ---');
}

runReportTests();
