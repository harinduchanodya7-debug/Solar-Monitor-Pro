/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Live Monitoring View (High-Speed Sensor Diagnostics)
 */

import React, { useState } from 'react';
import { Activity, Cpu, Gauge, Zap, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { MetricCard } from '../components/common/MetricCard';

export const LiveMonitoringView: React.FC = () => {
  const { telemetry, diagnostics } = useSolar();
  const [activeTab, setActiveTab] = useState<'all' | 'ina228' | 'pzem'>('all');

  const batVolts = telemetry?.battery_voltage_v ?? null;
  const batAmps = telemetry?.battery_current_a ?? null;
  const batSoc = telemetry?.battery_soc_percent ?? null;
  const acPower = telemetry?.ac_active_power_w ?? null;
  const acPf = telemetry?.ac_power_factor ?? null;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Monitoring & Telemetry</h1>
          <p className="text-xs text-slate-400 mt-1">
            20-bit INA228 precision current/power monitors · TCA9548A I2C Multiplexer · PZEM-004T v3.0 AC
          </p>
        </div>

        {/* Channel Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'all' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Channels
          </button>
          <button
            onClick={() => setActiveTab('ina228')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'ina228' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INA228 (DC 0/1/2)
          </button>
          <button
            onClick={() => setActiveTab('pzem')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'pzem' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PZEM-004T (AC)
          </button>
        </div>
      </div>

      {/* Sensor Stream Latency & Health Strip */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-4 h-4 text-emerald-400" />
            ESP32 Microcontroller: Active
          </span>
          <span>·</span>
          <span>Sample Latency: {diagnostics.roundTripMs ?? '--'} ms</span>
          <span>·</span>
          <span>TCA9548A MUX: Port 0x70 OK</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            Last Packet: {telemetry ? new Date(telemetry.timestamp).toLocaleTimeString() : '--'}
          </span>
          {telemetry?.is_stale && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[11px]">
              STALE
            </span>
          )}
        </div>
      </div>

      {/* INA228 Channel 0: Solar PV */}
      {(activeTab === 'all' || activeTab === 'ina228') && (
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h2 className="text-sm font-semibold text-slate-200">
                Channel 0: Solar PV Array (INA228 Sensor)
              </h2>
              <span className="text-xs font-mono text-slate-400">· I2C Address 0x40 on MUX Ch0</span>
            </div>
            <div className="text-xs font-mono text-emerald-400">
              Sensor Status: {telemetry?.sensor_status.ina228_ch0_solar.toUpperCase() ?? 'UNKNOWN'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Solar Bus Voltage"
              value={telemetry?.solar_voltage_v ?? null}
              unit="V"
              channelLabel="INA228 Ch0"
              subtitle="Open / MPPT Voltage"
              status="normal"
            />
            <MetricCard
              label="Solar PV Current"
              value={telemetry?.solar_current_a ?? null}
              unit="A"
              channelLabel="INA228 Ch0"
              subtitle="Shunt Current"
              status="positive"
            />
            <MetricCard
              label="Instantaneous Power"
              value={telemetry?.solar_power_w ?? null}
              unit="W"
              channelLabel="INA228 Ch0"
              subtitle="Active PV Input"
              status="positive"
            />
            <MetricCard
              label="Energy Harvested"
              value={telemetry?.solar_energy_wh ?? null}
              unit="Wh"
              channelLabel="INA228 Ch0"
              subtitle="Daily Integration"
              status="normal"
            />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>Resolution: 20-Bit Sigma-Delta ADC</div>
            <div>Full Scale Range: ±163.84 mV</div>
            <div>Shunt Resistance: 2.0 mΩ Precision</div>
            <div>Conversion Time: 4.12 ms Avg</div>
          </div>
        </div>
      )}

      {/* INA228 Channel 1: Battery Bank */}
      {(activeTab === 'all' || activeTab === 'ina228') && (
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h2 className="text-sm font-semibold text-slate-200">
                Channel 1: Battery Bank (24V 100Ah LiFePO4 INA228)
              </h2>
              <span className="text-xs font-mono text-slate-400">· I2C Address 0x41 on MUX Ch1</span>
            </div>
            <div className="text-xs font-mono text-amber-400">
              Sensor Status: {telemetry?.sensor_status.ina228_ch1_battery.toUpperCase() ?? 'UNKNOWN'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Pack Terminal Voltage"
              value={batVolts}
              unit="V"
              channelLabel="INA228 Ch1"
              subtitle="24V Nominal (8S LFP)"
              status={
                batVolts !== null
                  ? batVolts > 29.0
                    ? 'warning'
                    : batVolts < 22.0
                    ? 'critical'
                    : 'normal'
                  : 'neutral'
              }
            />
            <MetricCard
              label="Net Battery Current"
              value={batAmps !== null ? `${batAmps > 0 ? '+' : ''}${batAmps}` : null}
              unit="A"
              channelLabel="INA228 Ch1"
              subtitle={
                batAmps !== null && batAmps > 0.3
                  ? 'Charging Battery'
                  : batAmps !== null && batAmps < -0.3
                  ? 'Discharging to Loads'
                  : 'Float / Idle'
              }
              status={
                batAmps !== null && batAmps > 0.3
                  ? 'positive'
                  : 'warning'
              }
            />
            <MetricCard
              label="State of Charge (SOC)"
              value={batSoc}
              unit="%"
              channelLabel="Coulomb Counting"
              subtitle="Remaining Storage Ratio"
              status={
                batSoc !== null && batSoc < 25
                  ? 'warning'
                  : 'normal'
              }
            />
            <MetricCard
              label="Remaining Capacity"
              value={telemetry?.battery_remaining_ah ?? null}
              unit="Ah"
              channelLabel="100Ah Nominal"
              subtitle="Usable Amp-Hours"
              status="normal"
            />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>Shunt: 1.0 mΩ 100A Rating</div>
            <div>Direction: Signed Bidirectional</div>
            <div>Operating Mode: {telemetry?.battery_status?.toUpperCase() ?? '--'}</div>
            <div>Over-Voltage Limit: 29.2 V</div>
          </div>
        </div>
      )}

      {/* INA228 Channel 2: DC System Load */}
      {(activeTab === 'all' || activeTab === 'ina228') && (
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-sm font-semibold text-slate-200">
                Channel 2: DC System Load (INA228 Sensor)
              </h2>
              <span className="text-xs font-mono text-slate-400">· I2C Address 0x44 on MUX Ch2</span>
            </div>
            <div className="text-xs font-mono text-cyan-400">
              Sensor Status: {telemetry?.sensor_status.ina228_ch2_dc_load.toUpperCase() ?? 'UNKNOWN'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="DC Bus Voltage"
              value={telemetry?.dc_load_voltage_v ?? null}
              unit="V"
              channelLabel="INA228 Ch2"
              subtitle="24V System Line"
              status="normal"
            />
            <MetricCard
              label="DC Load Current"
              value={telemetry?.dc_load_current_a ?? null}
              unit="A"
              channelLabel="INA228 Ch2"
              subtitle="Downstream DC Draw"
              status="normal"
            />
            <MetricCard
              label="DC Load Power"
              value={telemetry?.dc_load_power_w ?? null}
              unit="W"
              channelLabel="INA228 Ch2"
              subtitle="Active DC Draw"
              status="normal"
            />
            <MetricCard
              label="DC Energy Consumed"
              value={telemetry?.dc_load_energy_wh ?? null}
              unit="Wh"
              channelLabel="INA228 Ch2"
              subtitle="Daily Integration"
              status="normal"
            />
          </div>
        </div>
      )}

      {/* PZEM-004T v3.0: 230V AC Inverter Output */}
      {(activeTab === 'all' || activeTab === 'pzem') && (
        <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <h2 className="text-sm font-semibold text-slate-200">
                AC Inverter & PZEM-004T v3.0 (100A Current Transformer)
              </h2>
              <span className="text-xs font-mono text-slate-400">· Modbus UART @ 9600 Baud</span>
            </div>
            <div className="text-xs font-mono text-indigo-400">
              Sensor Status: {telemetry?.sensor_status.pzem004t_ac.toUpperCase() ?? 'UNKNOWN'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="AC Line Voltage"
              value={telemetry?.ac_voltage_v ?? null}
              unit="V"
              channelLabel="PZEM-004T"
              subtitle="230V Inverter Output"
              status="normal"
            />
            <MetricCard
              label="AC Line Current"
              value={telemetry?.ac_current_a ?? null}
              unit="A"
              channelLabel="100A CT"
              subtitle="RMS Load Current"
              status="normal"
            />
            <MetricCard
              label="Active Power"
              value={acPower}
              unit="W"
              channelLabel="PZEM-004T"
              subtitle="Real Electrical Power"
              status={
                acPower !== null && acPower > 2600
                  ? 'warning'
                  : 'normal'
              }
            />
            <MetricCard
              label="Cumulative Energy"
              value={telemetry?.ac_energy_kwh ?? null}
              unit="kWh"
              channelLabel="PZEM-004T"
              subtitle="Inverter AC Total"
              status="normal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <MetricCard
              label="Grid / Inverter Frequency"
              value={telemetry?.ac_frequency_hz ?? null}
              unit="Hz"
              channelLabel="PZEM-004T"
              subtitle="Nominal 50.0 Hz Pure Sine"
              status="normal"
            />
            <MetricCard
              label="Power Factor (cos φ)"
              value={acPf !== null ? acPf.toFixed(2) : null}
              unit=""
              channelLabel="PZEM-004T"
              subtitle="Displacement Factor"
              status="normal"
            />
            <MetricCard
              label="Apparent Power"
              value={telemetry?.ac_apparent_power_va ?? null}
              unit="VA"
              channelLabel="Calculated"
              subtitle="V_rms × I_rms"
              status="normal"
            />
          </div>
        </div>
      )}
    </div>
  );
};
