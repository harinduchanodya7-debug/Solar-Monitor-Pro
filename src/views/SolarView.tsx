/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Solar PV Array Telemetry (100W to 300W Configurable)
 */

import React from 'react';
import { Sun, Zap, TrendingUp, Gauge, Sliders, Info } from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { MetricCard } from '../components/common/MetricCard';

export const SolarView: React.FC = () => {
  const { telemetry, config, updateConfig } = useSolar();

  const voltage = telemetry?.solar_voltage_v ?? null;
  const current = telemetry?.solar_current_a ?? null;
  const power = telemetry?.solar_power_w ?? null;
  const energyWh = telemetry?.solar_energy_wh ?? null;

  // Capacity utilization percentage against configured panel rating (100W - 300W)
  const utilizationPercent =
    power !== null ? Math.min(100, Math.round((power / config.solar_panel_watts) * 100)) : null;

  const panelPresets = [100, 150, 200, 250, 300];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Solar PV Array Monitoring</h1>
          <p className="text-xs text-slate-400 mt-1">
            INA228 Channel 0 (I2C Address 0x40) · High-side current measurement
          </p>
        </div>

        {/* Quick Panel Rating Preset Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 self-start sm:self-auto">
          <span className="text-xs font-mono text-slate-400 pl-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Rating:
          </span>
          <div className="flex items-center gap-1">
            {panelPresets.map((w) => (
              <button
                key={w}
                onClick={() => updateConfig({ solar_panel_watts: w })}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  config.solar_panel_watts === w
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}W
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Solar PV Generation"
          value={power !== null ? power.toFixed(1) : null}
          unit="W"
          channelLabel="INA228 Ch0"
          subtitle="Real-time Power Input"
          status="positive"
          icon={<Sun className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          label="Array Operating Voltage"
          value={voltage !== null ? voltage : null}
          unit="V"
          channelLabel="V_bus"
          subtitle={
            voltage !== null
              ? voltage > 30
                ? 'Optimal MPPT Range'
                : voltage > 15
                ? 'Sub-optimal Irradiance'
                : 'Night / Shaded'
              : 'Sensor offline'
          }
          status="normal"
          icon={<Zap className="w-5 h-5 text-amber-400" />}
        />

        <MetricCard
          label="Array Output Current"
          value={current !== null ? current : null}
          unit="A"
          channelLabel="I_shunt"
          subtitle="Shunt Current"
          status="normal"
          icon={<Gauge className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          label="Energy Harvested Today"
          value={energyWh !== null ? energyWh : null}
          unit="Wh"
          channelLabel="Daily Accumulator"
          subtitle={
            energyWh !== null
              ? `Equivalent: ${(energyWh / 1000).toFixed(2)} kWh`
              : 'Accumulator offline'
          }
          status="positive"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
        />
      </div>

      {/* Array Utilization & MPPT Gauge */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Array Peak Utilization & Efficiency
            </h2>
            <p className="text-xs text-slate-400">
              Comparison of current generation against rated {config.solar_panel_watts} W panel array
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400">
            {utilizationPercent !== null ? `${utilizationPercent}% of rated capacity` : '--'}
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-2 my-4">
          <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${utilizationPercent ?? 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>0 W (Night)</span>
            <span>{(config.solar_panel_watts * 0.25).toFixed(0)} W (Low Light)</span>
            <span>{(config.solar_panel_watts * 0.5).toFixed(0)} W (Partial Sun)</span>
            <span>{(config.solar_panel_watts * 0.75).toFixed(0)} W (Direct Sun)</span>
            <span>{config.solar_panel_watts} W (STC Peak Rating)</span>
          </div>
        </div>
      </div>

      {/* PV Specifications & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Array Technical Specifications</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Configured Array Rating</span>
              <span className="font-mono text-slate-200">{config.solar_panel_watts} W (STC 1000 W/m²)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Nominal Voltage at Maximum Power (Vmp)</span>
              <span className="font-mono text-slate-200">32.0 V - 36.5 V DC</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Open-Circuit Voltage (Voc)</span>
              <span className="font-mono text-slate-200">~42.0 V DC Max</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Short-Circuit Current (Isc)</span>
              <span className="font-mono text-slate-200">
                {(config.solar_panel_watts / 30).toFixed(2)} A Est.
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Charge Controller Architecture</span>
              <span className="font-mono text-emerald-400">Synchronous MPPT / Buck-Boost</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">INA228 Sensor Calibration (Ch0)</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Hardware Address</span>
              <span className="font-mono text-slate-200">I2C 0x40 (A0=GND, A1=GND)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Shunt Resistor Value</span>
              <span className="font-mono text-slate-200">2.0 mΩ Precision Surface-Mount</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">ADC Conversion Time</span>
              <span className="font-mono text-slate-200">4120 µs with 16x Averaging</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Bus Voltage Range</span>
              <span className="font-mono text-slate-200">0 V to 85 V Common-Mode</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Measurement Health</span>
              <span className="font-mono text-emerald-400">
                {telemetry?.sensor_status.ina228_ch0_solar === 'ok' ? 'Calibrated & Nominal' : 'Error / Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
