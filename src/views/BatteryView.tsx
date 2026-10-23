/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Battery View (24V 100Ah LiFePO4 Bank Telemetry)
 */

import React from 'react';
import {
  Battery,
  BatteryCharging,
  Zap,
  Clock,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { MetricCard } from '../components/common/MetricCard';

export const BatteryView: React.FC = () => {
  const { telemetry, config } = useSolar();

  const voltage = telemetry?.battery_voltage_v ?? null;
  const current = telemetry?.battery_current_a ?? null;
  const power = telemetry?.battery_power_w ?? null;
  const soc = telemetry?.battery_soc_percent ?? null;
  const remainingAh = telemetry?.battery_remaining_ah ?? null;
  const status = telemetry?.battery_status ?? null;

  // LiFePO4 8S cell calculation
  const cellVoltage = voltage !== null ? voltage / 8 : null;

  // Runtime calculation:
  // If charging (current > 0.3A), time to full = (100 - remainingAh) / current
  // If discharging (current < -0.3A), time to empty = remainingAh / |current|
  let runtimeEstimateText = 'Stabilized / Idle';
  if (current !== null && Math.abs(current) > 0.4 && remainingAh !== null) {
    if (current > 0) {
      const neededAh = Math.max(0, config.battery_capacity_ah - remainingAh);
      const hours = neededAh / current;
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      runtimeEstimateText = `~${h}h ${m}m to 100% full`;
    } else {
      const hours = remainingAh / Math.abs(current);
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      runtimeEstimateText = `~${h}h ${m}m until 0% depleted`;
    }
  }

  // Calculate position on 20V - 29.2V curve
  const minVolts = 20.0;
  const maxVolts = 29.2;
  const packPercent =
    voltage !== null
      ? Math.max(0, Math.min(100, ((voltage - minVolts) / (maxVolts - minVolts)) * 100))
      : 50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            LiFePO4 Battery Bank (24V 100Ah)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Lithium Iron Phosphate · 8S Configuration · INA228 Channel 1 (I2C 0x41)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Nominal Pack: 25.6 V · 2560 Wh
          </span>
        </div>
      </div>

      {/* Main KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="State of Charge (SOC)"
          value={soc !== null ? soc : null}
          unit="%"
          channelLabel="Coulomb Counted"
          subtitle="Estimated Stored Energy"
          status={soc !== null ? (soc > 25 ? 'normal' : 'warning') : 'neutral'}
          icon={<BatteryCharging className="w-5 h-5 text-amber-400" />}
        />

        <MetricCard
          label="Terminal Voltage"
          value={voltage !== null ? voltage : null}
          unit="V"
          channelLabel="INA228 Ch1"
          subtitle={cellVoltage !== null ? `Average ${cellVoltage.toFixed(3)} V / cell` : '8S String'}
          status={
            voltage !== null
              ? voltage > 29.0
                ? 'warning'
                : voltage < 21.5
                ? 'critical'
                : 'normal'
              : 'neutral'
          }
          icon={<Zap className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          label="Net Battery Current"
          value={current !== null ? `${current > 0 ? '+' : ''}${current}` : null}
          unit="A"
          channelLabel="INA228 Shunt"
          subtitle={
            current !== null
              ? current > 0.3
                ? 'Absorbing Solar'
                : current < -0.3
                ? 'Supplying System Loads'
                : 'Resting / Float'
              : 'Shunt offline'
          }
          status={current !== null && current > 0.3 ? 'positive' : 'warning'}
          icon={
            current !== null && current > 0.3 ? (
              <ArrowDownRight className="w-5 h-5 text-emerald-400" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-amber-400" />
            )
          }
        />

        <MetricCard
          label="Remaining Capacity"
          value={remainingAh !== null ? remainingAh : null}
          unit="Ah"
          channelLabel="100Ah Pack"
          subtitle={`Runtime: ${runtimeEstimateText}`}
          status="normal"
          icon={<Clock className="w-5 h-5 text-slate-300" />}
        />
      </div>

      {/* LiFePO4 Voltage Curve Visualization & SOC Plateau */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              LiFePO4 8S Voltage Plateau Curve
            </h2>
            <p className="text-xs text-slate-400">
              Characteristic flat discharge curve with lower and upper threshold knees
            </p>
          </div>
          <div className="text-xs font-mono text-slate-300">
            Pack Range: <span className="text-rose-400">20.0 V (Empty)</span> →{' '}
            <span className="text-emerald-400">29.2 V (Full)</span>
          </div>
        </div>

        {/* Visual Progress Bar with markers */}
        <div className="space-y-2 my-6">
          <div className="h-4 bg-slate-900 rounded-full overflow-hidden relative border border-slate-700/80">
            {/* Zones: 0-10% (Empty Knee), 10-90% (Flat Plateau), 90-100% (Absorption Knee) */}
            <div className="absolute inset-0 flex text-[9px] font-mono text-slate-500">
              <div className="w-[10%] bg-rose-950/40 border-r border-rose-800/40 flex items-center justify-center">
                Depleted
              </div>
              <div className="w-[80%] bg-emerald-950/20 border-r border-emerald-800/30 flex items-center justify-center text-emerald-400/60">
                LFP Flat Working Plateau (~26.4V)
              </div>
              <div className="w-[10%] bg-cyan-950/40 flex items-center justify-center">
                Absorption
              </div>
            </div>

            {/* Current Position Marker */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-amber-400 shadow-md shadow-amber-500/50 rounded-full -ml-1 transition-all duration-500"
              style={{ left: `${packPercent}%` }}
              title={`Current Voltage: ${voltage ?? '--'} V`}
            ></div>
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span>20.0 V (2.50V/cell)</span>
            <span>24.0 V (3.00V)</span>
            <span>26.4 V (3.30V Nominal)</span>
            <span>27.2 V (3.40V)</span>
            <span>29.2 V (3.65V Max)</span>
          </div>
        </div>

        {/* 8-Cell String Voltage Distribution */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3">
            Individual 8-Series Cell Estimation (Uniform Balance Model)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((cellNum) => (
              <div
                key={cellNum}
                className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-center"
              >
                <div className="text-[10px] font-mono text-slate-400">Cell {cellNum}</div>
                <div className="text-sm font-mono font-bold text-slate-200 mt-1">
                  {cellVoltage !== null ? `${cellVoltage.toFixed(3)}` : '--'}
                  <span className="text-[10px] font-normal text-slate-400 ml-0.5">V</span>
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Balanced</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety & BMS Protection Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Protection Thresholds</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">High Voltage Cutoff (OVP)</span>
              <span className="font-mono text-amber-400 font-semibold">29.20 V (3.65 V / cell)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">High Voltage Recovery</span>
              <span className="font-mono text-slate-200">28.00 V (3.50 V / cell)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Low Voltage Alarm</span>
              <span className="font-mono text-amber-400 font-semibold">22.40 V (2.80 V / cell)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Low Voltage Cutoff (UVP)</span>
              <span className="font-mono text-rose-400 font-semibold">21.00 V (2.625 V / cell)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Max Continuous Discharge Rate</span>
              <span className="font-mono text-slate-200">100 A (1.0 C Rate)</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Pack Diagnostics</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Coulomb Counting Status</span>
              <span className="font-mono text-emerald-400">Calibrated & Active</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Estimated Internal Resistance</span>
              <span className="font-mono text-slate-200">~22 mΩ (Pack Total)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">INA228 Shunt Resistor</span>
              <span className="font-mono text-slate-200">1.0 mΩ Precision Manganin</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Full Charge Energy Equivalent</span>
              <span className="font-mono text-slate-200">2560 Wh</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Chemistry Lifespan</span>
              <span className="font-mono text-slate-200">3000 - 5000 Cycles @ 80% DOD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
