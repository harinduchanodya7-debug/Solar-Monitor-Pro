/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Daily Peak Power, Consumption & Battery Cycle Health Report Generator
 */

import { HistoryPoint } from './storage';
import { SystemConfig } from '../types/telemetry';

export interface DailyReportRow {
  date: string;
  sampleCount: number;

  // Daily Peak Power (W)
  peakSolarPowerW: number | null;
  peakAcPowerW: number | null;
  peakDcLoadPowerW: number | null;
  peakBatteryDischargeW: number | null;
  peakBatteryChargeW: number | null;

  // Average & Total Consumption
  avgAcPowerW: number | null;
  totalAcEnergyKwh: number | null;
  avgDcLoadPowerW: number | null;
  totalDcLoadEnergyWh: number | null;
  totalSolarEnergyWh: number | null;
  netEnergyBalanceWh: number | null;

  // Battery Cycle Health Data
  minBatteryVoltageV: number | null;
  maxBatteryVoltageV: number | null;
  minCellVoltageV: number | null;
  maxCellVoltageV: number | null;
  minBatterySocPercent: number | null;
  maxBatterySocPercent: number | null;
  dailyDodPercent: number | null;
  ahDischarged: number;
  ahCharged: number;
  coulombicEfficiencyPercent: number | null;
  equivalentFullCycles: number;
  estimatedSohPercent: number;
}

/**
 * Groups timestamped historical telemetry into daily analytics rows
 */
export function generateDailyReportData(
  history: HistoryPoint[],
  config: SystemConfig
): DailyReportRow[] {
  if (!history || history.length === 0) return [];

  const nominalCapacityAh = config.battery_capacity_ah || 100;

  // Sort chronologically
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  // Group by local ISO date string (YYYY-MM-DD)
  const groups = new Map<string, HistoryPoint[]>();
  for (const pt of sorted) {
    const d = new Date(pt.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const list = groups.get(dateKey) || [];
    list.push(pt);
    groups.set(dateKey, list);
  }

  const rows: DailyReportRow[] = [];
  let cumulativeCycles = 0;

  for (const [date, pts] of groups.entries()) {
    // 1. Peak Powers
    const solarPowers = pts.map((p) => p.solar_power_w).filter((v): v is number => v !== null);
    const acPowers = pts.map((p) => p.ac_active_power_w).filter((v): v is number => v !== null);
    const dcLoadPowers = pts.map((p) => p.dc_load_power_w).filter((v): v is number => v !== null);

    const dischargePowers: number[] = [];
    const chargePowers: number[] = [];

    for (const p of pts) {
      if (p.battery_current_a !== null && p.battery_voltage_v !== null) {
        if (p.battery_current_a < -0.1) {
          dischargePowers.push(Math.abs(p.battery_current_a) * p.battery_voltage_v);
        } else if (p.battery_current_a > 0.1) {
          chargePowers.push(p.battery_current_a * p.battery_voltage_v);
        }
      } else if (p.battery_power_w !== null) {
        if (p.battery_power_w < -1) dischargePowers.push(Math.abs(p.battery_power_w));
        else if (p.battery_power_w > 1) chargePowers.push(p.battery_power_w);
      }
    }

    const peakSolarPowerW = solarPowers.length > 0 ? Math.max(...solarPowers) : null;
    const peakAcPowerW = acPowers.length > 0 ? Math.max(...acPowers) : null;
    const peakDcLoadPowerW = dcLoadPowers.length > 0 ? Math.max(...dcLoadPowers) : null;
    const peakBatteryDischargeW = dischargePowers.length > 0 ? Math.max(...dischargePowers) : null;
    const peakBatteryChargeW = chargePowers.length > 0 ? Math.max(...chargePowers) : null;

    // 2. Average & Total Consumption
    const avgAcPowerW =
      acPowers.length > 0
        ? Math.round((acPowers.reduce((a, b) => a + b, 0) / acPowers.length) * 10) / 10
        : null;

    const avgDcLoadPowerW =
      dcLoadPowers.length > 0
        ? Math.round((dcLoadPowers.reduce((a, b) => a + b, 0) / dcLoadPowers.length) * 10) / 10
        : null;

    // Daily energy counters (using difference between daily max and min or trapezoidal estimation)
    const acEnergies = pts.map((p) => p.ac_energy_kwh).filter((v): v is number => v !== null);
    let totalAcEnergyKwh: number | null = null;
    if (acEnergies.length >= 2) {
      totalAcEnergyKwh = Math.round((Math.max(...acEnergies) - Math.min(...acEnergies)) * 1000) / 1000;
    } else if (acPowers.length > 0) {
      // Integration approximation over sample intervals
      const sumWatts = acPowers.reduce((a, b) => a + b, 0);
      totalAcEnergyKwh = Math.round(((sumWatts * (15 / 60)) / 1000) * 100) / 100;
    }

    const dcLoadEnergies = pts.map((p) => p.dc_load_energy_wh).filter((v): v is number => v !== null);
    let totalDcLoadEnergyWh: number | null = null;
    if (dcLoadEnergies.length >= 2) {
      totalDcLoadEnergyWh = Math.round((Math.max(...dcLoadEnergies) - Math.min(...dcLoadEnergies)) * 10) / 10;
    } else if (dcLoadPowers.length > 0) {
      const sumWatts = dcLoadPowers.reduce((a, b) => a + b, 0);
      totalDcLoadEnergyWh = Math.round(((sumWatts * 15) / 60) * 10) / 10;
    }

    const solarEnergies = pts.map((p) => p.solar_energy_wh).filter((v): v is number => v !== null);
    let totalSolarEnergyWh: number | null = null;
    if (solarEnergies.length >= 2) {
      totalSolarEnergyWh = Math.round((Math.max(...solarEnergies) - Math.min(...solarEnergies)) * 10) / 10;
    } else if (solarPowers.length > 0) {
      const sumWatts = solarPowers.reduce((a, b) => a + b, 0);
      totalSolarEnergyWh = Math.round(((sumWatts * 15) / 60) * 10) / 10;
    }

    const netEnergyBalanceWh =
      totalSolarEnergyWh !== null && totalAcEnergyKwh !== null && totalDcLoadEnergyWh !== null
        ? Math.round((totalSolarEnergyWh - (totalAcEnergyKwh * 1000 + totalDcLoadEnergyWh)) * 10) / 10
        : null;

    // 3. Battery Cycle Health Data
    const batVoltages = pts.map((p) => p.battery_voltage_v).filter((v): v is number => v !== null);
    const batSocs = pts.map((p) => p.battery_soc_percent).filter((v): v is number => v !== null);

    const minBatteryVoltageV = batVoltages.length > 0 ? Math.min(...batVoltages) : null;
    const maxBatteryVoltageV = batVoltages.length > 0 ? Math.max(...batVoltages) : null;
    const minCellVoltageV = minBatteryVoltageV !== null ? Math.round((minBatteryVoltageV / 8) * 1000) / 1000 : null;
    const maxCellVoltageV = maxBatteryVoltageV !== null ? Math.round((maxBatteryVoltageV / 8) * 1000) / 1000 : null;

    const minBatterySocPercent = batSocs.length > 0 ? Math.min(...batSocs) : null;
    const maxBatterySocPercent = batSocs.length > 0 ? Math.max(...batSocs) : null;
    const dailyDodPercent =
      maxBatterySocPercent !== null && minBatterySocPercent !== null
        ? Math.round((maxBatterySocPercent - minBatterySocPercent) * 10) / 10
        : null;

    // Integrate Ah charged and discharged using consecutive sample delta-t
    let ahDischarged = 0;
    let ahCharged = 0;

    for (let i = 1; i < pts.length; i++) {
      const pPrev = pts[i - 1];
      const pCurr = pts[i];
      const dtSeconds = Math.max(1, (pCurr.timestamp - pPrev.timestamp) / 1000);
      const dtHours = Math.min(0.25, dtSeconds / 3600); // Guard against multi-day gaps

      const curr = pCurr.battery_current_a;
      if (curr !== null) {
        if (curr < -0.1) {
          ahDischarged += Math.abs(curr) * dtHours;
        } else if (curr > 0.1) {
          ahCharged += curr * dtHours;
        }
      }
    }

    ahDischarged = Math.round(ahDischarged * 100) / 100;
    ahCharged = Math.round(ahCharged * 100) / 100;

    const coulombicEfficiencyPercent =
      ahCharged > 0.5 && ahDischarged > 0.5
        ? Math.min(100, Math.round((ahDischarged / ahCharged) * 1000) / 10)
        : null;

    // Equivalent Full Cycles = Ah Discharged / Nominal Battery Capacity
    const equivalentFullCycles = Math.round((ahDischarged / nominalCapacityAh) * 100) / 100;
    cumulativeCycles += equivalentFullCycles;

    // LiFePO4 degradation model: ~0.005% capacity fade per 80% DoD cycle
    const estimatedSohPercent = Math.max(80, Math.round((100 - cumulativeCycles * 0.005) * 100) / 100);

    rows.push({
      date,
      sampleCount: pts.length,
      peakSolarPowerW,
      peakAcPowerW,
      peakDcLoadPowerW,
      peakBatteryDischargeW,
      peakBatteryChargeW,
      avgAcPowerW,
      totalAcEnergyKwh,
      avgDcLoadPowerW,
      totalDcLoadEnergyWh,
      totalSolarEnergyWh,
      netEnergyBalanceWh,
      minBatteryVoltageV,
      maxBatteryVoltageV,
      minCellVoltageV,
      maxCellVoltageV,
      minBatterySocPercent,
      maxBatterySocPercent,
      dailyDodPercent,
      ahDischarged,
      ahCharged,
      coulombicEfficiencyPercent,
      equivalentFullCycles,
      estimatedSohPercent,
    });
  }

  return rows;
}

/**
 * Builds and triggers browser download of the formatted CSV Report
 */
export function downloadFormattedCsvReport(history: HistoryPoint[], config: SystemConfig): boolean {
  if (!history || history.length === 0) {
    return false;
  }

  const rows = generateDailyReportData(history, config);
  const now = new Date();
  const timestampIso = now.toISOString();
  const reportDate = timestampIso.slice(0, 10);

  // Overall Aggregations
  const totalSamples = history.length;
  const overallPeakSolarW = Math.max(...rows.map((r) => r.peakSolarPowerW ?? 0));
  const overallPeakAcW = Math.max(...rows.map((r) => r.peakAcPowerW ?? 0));
  const totalAcKwh = Math.round(rows.reduce((sum, r) => sum + (r.totalAcEnergyKwh ?? 0), 0) * 100) / 100;
  const totalSolarKwh = Math.round((rows.reduce((sum, r) => sum + (r.totalSolarEnergyWh ?? 0), 0) / 1000) * 100) / 100;
  const totalCycles = Math.round(rows.reduce((sum, r) => sum + r.equivalentFullCycles, 0) * 100) / 100;
  const latestSoh = rows.length > 0 ? rows[rows.length - 1].estimatedSohPercent : 100;

  // Build CSV content with clean section formatting and standard comma separation
  const lines: string[] = [];

  // ==========================================
  // SECTION 1: HEADER & SYSTEM METADATA
  // ==========================================
  lines.push('SOLAR MONITOR PRO — DAILY PERFORMANCE & BATTERY CYCLE HEALTH REPORT');
  lines.push(`Report Generated at,${timestampIso}`);
  lines.push(`Target Architecture,ESP32 Solar Energy System (INA228 x 3 & PZEM-004T v3.0)`);
  lines.push(`Battery Bank Specification,${config.battery_capacity_ah} Ah LiFePO4 (24V Nominal / 8S Configuration)`);
  lines.push(`Solar PV Array Rating,${config.solar_panel_watts} W Monocrystalline`);
  lines.push(`AC Inverter Specification,230V AC Pure Sine Wave (${config.inverter_rated_watts} W Rated Output)`);
  lines.push(`Total Historical Telemetry Points Analyzed,${totalSamples}`);
  lines.push(`Days Covered in Report,${rows.length}`);
  lines.push('');

  // ==========================================
  // SECTION 2: EXECUTIVE SUMMARY METRICS
  // ==========================================
  lines.push('EXECUTIVE SUMMARY');
  lines.push('Metric,Value,Unit,Notes');
  lines.push(`Overall Peak Solar PV Power,${overallPeakSolarW > 0 ? overallPeakSolarW : 'N/A'},W,Measured at INA228 Channel 0`);
  lines.push(`Overall Peak AC Inverter Power,${overallPeakAcW > 0 ? overallPeakAcW : 'N/A'},W,Measured at PZEM-004T AC CT Clamp`);
  lines.push(`Total AC Energy Consumed,${totalAcKwh},kWh,Cumulative load on 230V AC bus`);
  lines.push(`Total Solar Energy Harvested,${totalSolarKwh},kWh,Cumulative renewable generation`);
  lines.push(`Total Equivalent Full Cycles (EFC),${totalCycles},Cycles,Based on ${config.battery_capacity_ah}Ah depth integration`);
  lines.push(`Battery Estimated State of Health (SoH),${latestSoh},%,Nominal cycle degradation model`);
  lines.push('');

  // ==========================================
  // SECTION 3: DAILY PERFORMANCE, CONSUMPTION & BATTERY HEALTH TABLE
  // ==========================================
  lines.push('DAILY PEAK POWER CONSUMPTION & BATTERY CYCLE HEALTH BREAKDOWN');

  const headers = [
    'Date (YYYY-MM-DD)',
    'Sample Count',
    // Peak Power
    'Daily Peak Solar PV (W)',
    'Daily Peak AC Inverter (W)',
    'Daily Peak DC Load (W)',
    'Peak Battery Discharge (W)',
    'Peak Battery Charge (W)',
    // Consumption
    'Average AC Active Power (W)',
    'Total AC Energy (kWh)',
    'Average DC Load (W)',
    'Total DC Load Energy (Wh)',
    'Total Solar Harvested (Wh)',
    'Net Daily Energy Balance (Wh)',
    // Battery Cycle Health
    'Min Battery Voltage (V)',
    'Max Battery Voltage (V)',
    'Min Cell Voltage (V/cell)',
    'Max Cell Voltage (V/cell)',
    'Min Battery SoC (%)',
    'Max Battery SoC (%)',
    'Daily Depth of Discharge DoD (%)',
    'Battery Discharged (Ah)',
    'Battery Charged (Ah)',
    'Coulombic Efficiency (%)',
    'Equivalent Full Cycles (EFC)',
    'Est Battery Health SoH (%)',
  ];

  lines.push(headers.join(','));

  for (const r of rows) {
    const row = [
      r.date,
      r.sampleCount,
      r.peakSolarPowerW !== null ? r.peakSolarPowerW.toFixed(1) : '',
      r.peakAcPowerW !== null ? r.peakAcPowerW.toFixed(1) : '',
      r.peakDcLoadPowerW !== null ? r.peakDcLoadPowerW.toFixed(1) : '',
      r.peakBatteryDischargeW !== null ? r.peakBatteryDischargeW.toFixed(1) : '',
      r.peakBatteryChargeW !== null ? r.peakBatteryChargeW.toFixed(1) : '',
      r.avgAcPowerW !== null ? r.avgAcPowerW.toFixed(1) : '',
      r.totalAcEnergyKwh !== null ? r.totalAcEnergyKwh.toFixed(3) : '',
      r.avgDcLoadPowerW !== null ? r.avgDcLoadPowerW.toFixed(1) : '',
      r.totalDcLoadEnergyWh !== null ? r.totalDcLoadEnergyWh.toFixed(1) : '',
      r.totalSolarEnergyWh !== null ? r.totalSolarEnergyWh.toFixed(1) : '',
      r.netEnergyBalanceWh !== null ? r.netEnergyBalanceWh.toFixed(1) : '',
      r.minBatteryVoltageV !== null ? r.minBatteryVoltageV.toFixed(2) : '',
      r.maxBatteryVoltageV !== null ? r.maxBatteryVoltageV.toFixed(2) : '',
      r.minCellVoltageV !== null ? r.minCellVoltageV.toFixed(3) : '',
      r.maxCellVoltageV !== null ? r.maxCellVoltageV.toFixed(3) : '',
      r.minBatterySocPercent !== null ? r.minBatterySocPercent.toFixed(1) : '',
      r.maxBatterySocPercent !== null ? r.maxBatterySocPercent.toFixed(1) : '',
      r.dailyDodPercent !== null ? r.dailyDodPercent.toFixed(1) : '',
      r.ahDischarged.toFixed(2),
      r.ahCharged.toFixed(2),
      r.coulombicEfficiencyPercent !== null ? `${r.coulombicEfficiencyPercent.toFixed(1)}%` : '',
      r.equivalentFullCycles.toFixed(2),
      `${r.estimatedSohPercent.toFixed(1)}%`,
    ];
    lines.push(row.join(','));
  }

  lines.push('');
  lines.push('METHODOLOGY NOTES');
  lines.push('1. Peak power metrics capture maximum 1-second instantaneous sample readings for each calendar day.');
  lines.push('2. AC active power measured by PZEM-004T v3.0 UART sensor with 100A current transformer on 230V bus.');
  lines.push('3. DC power and battery telemetry measured by high-precision Texas Instruments INA228 sensors via TCA9548A multiplexer.');
  lines.push('4. Equivalent Full Cycles (EFC) calculated as total Ah discharged divided by 100Ah nominal capacity.');
  lines.push('5. Missing or invalid sensor samples are excluded from averages and retained as blank cells (never coerced to zero).');

  // Trigger file download in browser
  const csvString = lines.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `solar_monitor_pro_daily_health_report_${reportDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
