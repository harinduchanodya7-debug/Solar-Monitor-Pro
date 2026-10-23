/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - AC Load & Inverter Monitoring (PZEM-004T v3.0 with 100A CT)
 */

import React from 'react';
import { Power, Gauge, Activity, Zap, Compass, AlertCircle, ShieldAlert } from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { MetricCard } from '../components/common/MetricCard';

export const AcLoadView: React.FC = () => {
  const { telemetry, config } = useSolar();

  const voltage = telemetry?.ac_voltage_v ?? null;
  const current = telemetry?.ac_current_a ?? null;
  const activePower = telemetry?.ac_active_power_w ?? null;
  const energyKwh = telemetry?.ac_energy_kwh ?? null;
  const frequency = telemetry?.ac_frequency_hz ?? null;
  const powerFactor = telemetry?.ac_power_factor ?? null;
  const apparentPower = telemetry?.ac_apparent_power_va ?? null;
  const reactivePower = telemetry?.ac_reactive_power_var ?? null;
  const inverterLoad = telemetry?.inverter_load_percent ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">230V AC Inverter & Power Monitoring</h1>
          <p className="text-xs text-slate-400 mt-1">
            PZEM-004T v3.0 Multi-function AC Power Meter · 100A Split-Core Current Transformer (CT)
          </p>
        </div>

        <div className="text-xs font-mono text-indigo-400">
          Inverter Continuous Rating: {config.inverter_rated_watts} W (Pure Sine Wave)
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="AC Active Power"
          value={activePower !== null ? activePower.toFixed(1) : null}
          unit="W"
          channelLabel="PZEM-004T"
          subtitle="Real Consumed Power"
          status={
            activePower !== null && activePower > 2700
              ? 'warning'
              : activePower !== null && activePower > 3000
              ? 'critical'
              : 'normal'
          }
          icon={<Power className="w-5 h-5 text-indigo-400" />}
        />

        <MetricCard
          label="AC Line Voltage"
          value={voltage !== null ? voltage : null}
          unit="V"
          channelLabel="RMS"
          subtitle={
            voltage !== null
              ? voltage >= 220 && voltage <= 240
                ? 'Nominal Grid Quality'
                : 'Voltage Deviation'
              : 'PZEM offline'
          }
          status="normal"
          icon={<Gauge className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          label="AC RMS Current"
          value={current !== null ? current : null}
          unit="A"
          channelLabel="100A CT"
          subtitle="Total AC Line Current"
          status="normal"
          icon={<Activity className="w-5 h-5 text-slate-300" />}
        />

        <MetricCard
          label="Cumulative AC Energy"
          value={energyKwh !== null ? energyKwh : null}
          unit="kWh"
          channelLabel="Non-Volatile"
          subtitle="Integrated AC Consumption"
          status="normal"
          icon={<Zap className="w-5 h-5 text-indigo-400" />}
        />
      </div>

      {/* Secondary AC Metrics (Frequency, Power Factor, Reactive Power, Inverter Capacity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Inverter Frequency"
          value={frequency !== null ? frequency : null}
          unit="Hz"
          channelLabel="PZEM-004T"
          subtitle="Nominal 50.00 Hz"
          status="normal"
          icon={<Activity className="w-5 h-5 text-slate-400" />}
        />

        <MetricCard
          label="Power Factor (cos φ)"
          value={powerFactor !== null ? powerFactor.toFixed(2) : null}
          unit=""
          channelLabel="PZEM-004T"
          subtitle={
            powerFactor !== null
              ? powerFactor > 0.9
                ? 'High Efficiency Resistive'
                : 'Inductive Motor / Ballast'
              : 'PZEM offline'
          }
          status="normal"
          icon={<Compass className="w-5 h-5 text-slate-400" />}
        />

        <MetricCard
          label="Apparent Power"
          value={apparentPower !== null ? apparentPower : null}
          unit="VA"
          channelLabel="Calculated"
          subtitle="Total Vector Load"
          status="normal"
        />

        <MetricCard
          label="Reactive Power"
          value={reactivePower !== null ? reactivePower : null}
          unit="VAR"
          channelLabel="Calculated"
          subtitle="Magnetizing Field Load"
          status="normal"
        />
      </div>

      {/* Inverter Load Capacity Meter */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Inverter Continuous Capacity Utilization
            </h2>
            <p className="text-xs text-slate-400">
              Operating load vs {config.inverter_rated_watts} W continuous pure sine wave rating
            </p>
          </div>
          <div className="text-xs font-mono text-indigo-400">
            {inverterLoad !== null ? `${inverterLoad}% Load` : '--'}
          </div>
        </div>

        {/* Bar */}
        <div className="space-y-2 my-4">
          <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                (inverterLoad ?? 0) > 90
                  ? 'bg-rose-500'
                  : (inverterLoad ?? 0) > 70
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, inverterLoad ?? 0)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>0 W (Idle)</span>
            <span>750 W (25%)</span>
            <span>1500 W (50%)</span>
            <span>2250 W (75%)</span>
            <span>3000 W (100% Continuous Limit)</span>
          </div>
        </div>
      </div>

      {/* PZEM-004T v3.0 Register & CT Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">PZEM-004T v3.0 Hardware Specifications</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Communication Interface</span>
              <span className="font-mono text-slate-200">UART Serial (9600-8-N-1, Modbus-RTU)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Current Transformer</span>
              <span className="font-mono text-slate-200">100A Split-Core CT (100A : 20mA ratio)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Voltage Measurement Range</span>
              <span className="font-mono text-slate-200">80 ~ 260 V AC RMS (45 ~ 65 Hz)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Power Measurement Range</span>
              <span className="font-mono text-slate-200">0 ~ 23 kW (Resolution 0.1 W)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Measurement Accuracy</span>
              <span className="font-mono text-emerald-400">Grade 1.0 (Class 1)</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Inverter Protection & Limits</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Surge Peak Capacity</span>
              <span className="font-mono text-slate-200">6000 W (5 seconds motor start)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Low DC Input Cutoff</span>
              <span className="font-mono text-amber-400">20.5 V DC (Inverter self-shutdown)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Overload Trip Threshold</span>
              <span className="font-mono text-rose-400">3300 W Continuous (&gt;30s)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Contactor Interlock</span>
              <span className="font-mono text-emerald-400">Auxiliary Dry Contact Monitored</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Output Waveform</span>
              <span className="font-mono text-slate-200">Pure Sine Wave (&lt;3% THD)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
