/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - DC System Load Monitoring (INA228 Channel 2)
 */

import React from 'react';
import { Zap, Gauge, TrendingDown, Cpu, Layers } from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { MetricCard } from '../components/common/MetricCard';

export const DcLoadView: React.FC = () => {
  const { telemetry } = useSolar();

  const voltage = telemetry?.dc_load_voltage_v ?? null;
  const current = telemetry?.dc_load_current_a ?? null;
  const power = telemetry?.dc_load_power_w ?? null;
  const energyWh = telemetry?.dc_load_energy_wh ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">DC Load Monitoring</h1>
          <p className="text-xs text-slate-400 mt-1">
            INA228 Channel 2 (I2C Address 0x44) · 24V Native DC System Bus
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Sensor Status: {telemetry?.sensor_status.ina228_ch2_dc_load.toUpperCase() ?? 'UNKNOWN'}
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="DC Load Power"
          value={power !== null ? power.toFixed(1) : null}
          unit="W"
          channelLabel="INA228 Ch2"
          subtitle="Real-time DC Draw"
          status="normal"
          icon={<Zap className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          label="DC Bus Voltage"
          value={voltage !== null ? voltage : null}
          unit="V"
          channelLabel="V_bus"
          subtitle="Direct 24V Supply Rail"
          status="normal"
          icon={<Gauge className="w-5 h-5 text-slate-300" />}
        />

        <MetricCard
          label="DC Load Current"
          value={current !== null ? current : null}
          unit="A"
          channelLabel="I_shunt"
          subtitle="Auxiliary Draw"
          status="normal"
          icon={<TrendingDown className="w-5 h-5 text-slate-300" />}
        />

        <MetricCard
          label="DC Energy Consumed Today"
          value={energyWh !== null ? energyWh : null}
          unit="Wh"
          channelLabel="Daily Accumulator"
          subtitle={
            energyWh !== null
              ? `Equivalent: ${(energyWh / 1000).toFixed(3)} kWh`
              : 'Accumulator offline'
          }
          status="normal"
          icon={<Cpu className="w-5 h-5 text-cyan-400" />}
        />
      </div>

      {/* Auxiliary DC Device Breakdown */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Downstream 24V DC Sub-Circuits
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Fused DC Distribution</span>
        </div>

        <div className="space-y-3">
          {[
            {
              name: '4G LTE / Wi-Fi Gateway & Router',
              voltage: '24V Direct',
              current: '0.45 A',
              power: '10.8 W',
              category: 'Communications',
            },
            {
              name: 'ESP32 Controller & INA228 Multiplexer',
              voltage: '5V (via Buck)',
              current: '0.12 A',
              power: '2.8 W',
              category: 'Instrumentation',
            },
            {
              name: 'Security Cameras & NVR Hub',
              voltage: '24V Direct',
              current: '0.38 A',
              power: '9.1 W',
              category: 'Security',
            },
            {
              name: 'Cabin 24V High-CRI LED Lighting Rail',
              voltage: '24V Direct',
              current: '0.25 A',
              power: '6.0 W',
              category: 'Lighting',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs"
            >
              <div>
                <div className="font-medium text-slate-200">{item.name}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {item.category} · {item.voltage}
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-cyan-400 font-semibold">{item.power}</div>
                <div className="text-[11px] text-slate-400">{item.current}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
