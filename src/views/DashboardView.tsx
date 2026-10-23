/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Dashboard View (System Overview & Energy Flow)
 */

import React from 'react';
import {
  Sun,
  BatteryCharging,
  Zap,
  Power,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { MetricCard } from '../components/common/MetricCard';
import { ViewId } from '../components/Navigation';

interface DashboardViewProps {
  onNavigate: (view: ViewId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { telemetry, isDemoMode, config, connectionStatus, refreshNow } = useSolar();

  const solarPower = telemetry?.solar_power_w ?? null;
  const dcLoadPower = telemetry?.dc_load_power_w ?? null;
  const acLoadPower = telemetry?.ac_active_power_w ?? null;
  const totalLoadPower =
    dcLoadPower !== null || acLoadPower !== null
      ? (dcLoadPower ?? 0) + (acLoadPower ?? 0)
      : null;

  const netPower =
    solarPower !== null && totalLoadPower !== null ? solarPower - totalLoadPower : null;

  const batteryCurrent = telemetry?.battery_current_a ?? null;
  const isCharging = batteryCurrent !== null ? batteryCurrent > 0.3 : false;
  const isDischarging = batteryCurrent !== null ? batteryCurrent < -0.3 : false;

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry from ESP32 · 3× INA228 via TCA9548A · PZEM-004T 100A CT
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isDemoMode && (
            <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300">
              Demo Simulation Active
            </div>
          )}
          <button
            onClick={() => refreshNow()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {/* Real-Time Energy Flow Schematic Card */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono font-semibold tracking-wider text-slate-400">
              Power Flow Topology
            </span>
            <span className="text-xs text-slate-400">· 24V DC Bus & 230V AC</span>
          </div>

          <div className="text-xs font-mono">
            {netPower !== null ? (
              <span className={netPower >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                Net Balance: {netPower >= 0 ? `+${netPower.toFixed(1)} W (Surplus)` : `${netPower.toFixed(1)} W (Deficit)`}
              </span>
            ) : (
              <span className="text-slate-400">Net: Unavailable</span>
            )}
          </div>
        </div>

        {/* Energy Flow Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Node 1: Solar Generation */}
          <div
            onClick={() => onNavigate('solar')}
            className="bg-[#0f1a2e] border border-slate-700/80 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-emerald-400" />
                Solar PV Array
              </span>
              <span className="text-[10px] font-mono text-slate-400">Ch0 INA228</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {solarPower !== null ? `${solarPower.toFixed(1)} W` : 'Unavailable'}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {telemetry?.solar_voltage_v !== null ? `${telemetry?.solar_voltage_v} V` : '--'} ·{' '}
                {telemetry?.solar_current_a !== null ? `${telemetry?.solar_current_a} A` : '--'}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
              <span>{config.solar_panel_watts}W Configured</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Node 2: Battery Storage */}
          <div
            onClick={() => onNavigate('battery')}
            className="bg-[#0f1a2e] border border-slate-700/80 rounded-xl p-4 cursor-pointer hover:border-amber-500/50 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                LiFePO4 24V Bank
              </span>
              <span className="text-[10px] font-mono text-slate-400">Ch1 INA228</span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-amber-400">
                  {telemetry?.battery_soc_percent !== null ? `${telemetry?.battery_soc_percent}%` : 'Unavailable'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {telemetry?.battery_remaining_ah !== null ? `${telemetry?.battery_remaining_ah} Ah` : ''}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1">
                {isCharging ? (
                  <span className="text-emerald-400 flex items-center">
                    <ArrowDownRight className="w-3.5 h-3.5" /> +{batteryCurrent} A (Charging)
                  </span>
                ) : isDischarging ? (
                  <span className="text-amber-400 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" /> {batteryCurrent} A (Discharging)
                  </span>
                ) : (
                  <span>0.00 A (Idle)</span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
              <span>{telemetry?.battery_voltage_v !== null ? `${telemetry?.battery_voltage_v} V` : '--'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Node 3: DC Loads */}
          <div
            onClick={() => onNavigate('dc-load')}
            className="bg-[#0f1a2e] border border-slate-700/80 rounded-xl p-4 cursor-pointer hover:border-cyan-500/50 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                DC System Loads
              </span>
              <span className="text-[10px] font-mono text-slate-400">Ch2 INA228</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-mono font-bold text-cyan-400">
                {dcLoadPower !== null ? `${dcLoadPower.toFixed(1)} W` : 'Unavailable'}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {telemetry?.dc_load_voltage_v !== null ? `${telemetry?.dc_load_voltage_v} V` : '--'} ·{' '}
                {telemetry?.dc_load_current_a !== null ? `${telemetry?.dc_load_current_a} A` : '--'}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
              <span>{telemetry?.dc_load_energy_wh !== null ? `${telemetry?.dc_load_energy_wh} Wh Today` : '24V Native'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Node 4: AC Inverter Output */}
          <div
            onClick={() => onNavigate('ac-load')}
            className="bg-[#0f1a2e] border border-slate-700/80 rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Power className="w-4 h-4 text-indigo-400" />
                230V AC Inverter
              </span>
              <span className="text-[10px] font-mono text-slate-400">PZEM-004T</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-mono font-bold text-indigo-400">
                {acLoadPower !== null ? `${acLoadPower.toFixed(1)} W` : 'Unavailable'}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {telemetry?.ac_voltage_v !== null ? `${telemetry?.ac_voltage_v} V` : '--'} ·{' '}
                {telemetry?.ac_current_a !== null ? `${telemetry?.ac_current_a} A` : '--'} ·{' '}
                {telemetry?.ac_frequency_hz !== null ? `${telemetry?.ac_frequency_hz} Hz` : '--'}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
              <span>
                {telemetry?.inverter_load_percent !== null
                  ? `${telemetry?.inverter_load_percent}% of 3000W`
                  : '3000W Inverter'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Solar Generation"
          channelLabel="Ch0"
          value={solarPower !== null ? solarPower.toFixed(1) : null}
          unit="W"
          subtitle="Instantaneous PV Power"
          secondaryText={
            telemetry?.solar_energy_wh !== null
              ? `Daily Total: ${telemetry?.solar_energy_wh} Wh`
              : 'Energy accumulator offline'
          }
          status="positive"
          icon={<Sun className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          label="Battery State of Charge"
          channelLabel="Ch1"
          value={telemetry?.battery_soc_percent ?? null}
          unit="%"
          subtitle="24V 100Ah LiFePO4"
          secondaryText={
            telemetry?.battery_remaining_ah !== null && telemetry?.battery_remaining_ah !== undefined
              ? `Remaining: ${telemetry.battery_remaining_ah} Ah · ${telemetry?.battery_voltage_v ?? '--'} V`
              : 'Pack telemetry offline'
          }
          status={
            telemetry?.battery_soc_percent !== null && telemetry?.battery_soc_percent !== undefined
              ? telemetry.battery_soc_percent > 30
                ? 'normal'
                : 'warning'
              : 'neutral'
          }
          icon={<BatteryCharging className="w-5 h-5 text-amber-400" />}
        />

        <MetricCard
          label="Total Consumption"
          channelLabel="DC + AC"
          value={totalLoadPower !== null ? totalLoadPower.toFixed(1) : null}
          unit="W"
          subtitle="Combined DC & Inverter Load"
          secondaryText={
            telemetry?.ac_energy_kwh !== null
              ? `AC Total: ${telemetry?.ac_energy_kwh} kWh`
              : 'AC CT offline'
          }
          status="neutral"
          icon={<Zap className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          label="Contactor & AC Status"
          channelLabel="Safety"
          value={
            telemetry?.ac_control_status === 'closed'
              ? 'ENGAGED'
              : telemetry?.ac_control_status === 'open'
              ? 'DISCONNECTED'
              : telemetry?.ac_control_status === 'tripped'
              ? 'TRIPPED'
              : 'UNKNOWN'
          }
          subtitle="230V AC Load Interlock"
          secondaryText={
            telemetry?.ac_contactor_feedback !== null
              ? telemetry?.ac_contactor_feedback
                ? 'Aux Feedback: Verified Closed'
                : 'Aux Feedback: Verified Open'
              : 'Aux Feedback: UNCONFIRMED'
          }
          status={
            telemetry?.ac_control_status === 'closed'
              ? 'normal'
              : telemetry?.ac_control_status === 'tripped'
              ? 'critical'
              : 'warning'
          }
          icon={
            telemetry?.ac_control_status === 'closed' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            )
          }
        />
      </div>

      {/* Sensor Health & Quick Navigation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensor Health Panel */}
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Hardware Sensor Bus</h3>
            <span className="text-xs font-mono text-slate-400">TCA9548A & UART</span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'ina228_ch0_solar',
                name: 'INA228 Ch0: Solar PV',
                type: 'I2C Multiplexer Port 0',
                status: telemetry?.sensor_status.ina228_ch0_solar,
              },
              {
                id: 'ina228_ch1_battery',
                name: 'INA228 Ch1: Battery Bank',
                type: 'I2C Multiplexer Port 1',
                status: telemetry?.sensor_status.ina228_ch1_battery,
              },
              {
                id: 'ina228_ch2_dc_load',
                name: 'INA228 Ch2: DC Load',
                type: 'I2C Multiplexer Port 2',
                status: telemetry?.sensor_status.ina228_ch2_dc_load,
              },
              {
                id: 'tca9548a_mux',
                name: 'TCA9548A I2C MUX (0x70)',
                type: 'ESP32 Wire SDA/SCL',
                status: telemetry?.sensor_status.tca9548a_mux,
              },
              {
                id: 'pzem004t_ac',
                name: 'PZEM-004T v3.0 (100A CT)',
                type: 'UART2 (GPIO16/17)',
                status: telemetry?.sensor_status.pzem004t_ac,
              },
            ].map((sensor) => (
              <div
                key={sensor.id}
                className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-0"
              >
                <div>
                  <div className="text-xs font-medium text-slate-300">{sensor.name}</div>
                  <div className="text-[11px] font-mono text-slate-400">{sensor.type}</div>
                </div>
                <div className="text-xs font-mono">
                  {sensor.status === 'ok' ? (
                    <span className="text-emerald-400">● OK</span>
                  ) : sensor.status === 'fault' ? (
                    <span className="text-rose-400">✖ FAULT</span>
                  ) : (
                    <span className="text-slate-400">○ OFFLINE</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Battery & Pack Health Quick Specs */}
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Battery State & Health</h3>
            <button
              onClick={() => onNavigate('battery')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Details →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Chemistry / Architecture</span>
              <span className="font-mono text-slate-200">LiFePO4 8S (25.6V Nominal)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Rated Capacity</span>
              <span className="font-mono text-slate-200">{config.battery_capacity_ah} Ah (2.56 kWh)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Cell Average Voltage</span>
              <span className="font-mono text-slate-200">
                {telemetry?.battery_voltage_v
                  ? `${(telemetry.battery_voltage_v / 8).toFixed(3)} V / cell`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Operating Mode</span>
              <span className="font-mono text-slate-200 uppercase">
                {telemetry?.battery_status || 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Low Voltage Cutoff</span>
              <span className="font-mono text-amber-400">21.0 V (2.625 V / cell)</span>
            </div>
          </div>
        </div>

        {/* Quick Diagnostics & Endpoint Info */}
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Connection & Diagnostics</h3>
            <button
              onClick={() => onNavigate('connection')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Diagnostics →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Configured Endpoint</span>
              <span className="font-mono text-slate-300 truncate max-w-[180px]">
                {config.api_endpoint}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Polling State</span>
              <span className="font-mono text-slate-200">Active (5s Interval)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Stale Detection Threshold</span>
              <span className="font-mono text-slate-200">30 seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Contactor Hardware Control</span>
              <span className="font-mono text-slate-200">
                {config.hardware_contactor_installed ? 'Installed & Ready' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Direct AP access: Connect PC to 192.168.4.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
