/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Power Consumption History (Separate AC & DC Telemetry)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Calendar,
  Zap,
  Power,
  Sun,
  BatteryCharging,
  Gauge,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';
import { exportHistoryCsv, HistoryPoint } from '../lib/storage';
import { downloadFormattedCsvReport, generateDailyReportData } from '../lib/reportGenerator';

type TimeRangeFilter = '1h' | '24h' | '7d' | '30d' | 'custom';

interface ChartSeries {
  label: string;
  color: string;
  unit: string;
  points: { ts: number; val: number | null }[];
  dash?: string;
}

interface ReusableChartProps {
  title: string;
  series: ChartSeries[];
  svgHeight?: number;
  yMin?: number;
  emptyMessage?: string;
  onHover?: (ts: number | null, values: { label: string; val: number | null; unit: string; color: string }[]) => void;
}

/**
 * Reusable, high-precision SVG time-series chart with tabular axis labels and crosshair
 */
const TelemetryChart: React.FC<ReusableChartProps> = ({
  title,
  series,
  svgHeight = 220,
  yMin,
  emptyMessage = 'No historical data available for this metric',
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Compute common timestamp range across series
  const validPoints = series.flatMap((s) => s.points.filter((p) => p.val !== null));
  if (validPoints.length === 0) {
    return (
      <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-6 text-center text-xs font-mono text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const allTimestamps = series[0]?.points.map((p) => p.ts) || [];
  const minTs = allTimestamps[0] || Date.now() - 3600000;
  const maxTs = allTimestamps[allTimestamps.length - 1] || Date.now();
  const timeSpan = Math.max(1, maxTs - minTs);

  // Find min/max Y across series
  const values = validPoints.map((p) => p.val as number);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  // Allow negative numbers (for battery current) or snap to 0
  const computedMinY = yMin !== undefined ? yMin : dataMin < 0 ? Math.floor(dataMin * 1.2) : 0;
  let computedMaxY = Math.max(0.1, dataMax);
  computedMaxY = Math.ceil(computedMaxY * 1.15 * 10) / 10;
  if (computedMaxY <= computedMinY) computedMaxY = computedMinY + 1;

  const yRange = computedMaxY - computedMinY;

  const svgWidth = 720;
  const padding = { top: 16, right: 24, bottom: 26, left: 48 };
  const plotW = svgWidth - padding.left - padding.right;
  const plotH = svgHeight - padding.top - padding.bottom;

  const hoveredPointData =
    hoverIdx !== null && allTimestamps[hoverIdx]
      ? {
          ts: allTimestamps[hoverIdx],
          items: series.map((s) => ({
            label: s.label,
            color: s.color,
            unit: s.unit,
            val: s.points[hoverIdx]?.val ?? null,
          })),
        }
      : null;

  return (
    <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
          {title}
        </h4>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          {series.map((s, idx) => (
            <span key={idx} className="flex items-center gap-1.5" style={{ color: s.color }}>
              <span
                className="w-2.5 h-0.5 inline-block"
                style={{ backgroundColor: s.color }}
              ></span>
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px] overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1.0].map((ratio) => {
            const y = padding.top + plotH * (1 - ratio);
            const yVal = Math.round((computedMinY + yRange * ratio) * 10) / 10;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {yVal}
                </text>
              </g>
            );
          })}

          {/* Time axis marks */}
          {[0, 0.5, 1.0].map((ratio) => {
            const x = padding.left + plotW * ratio;
            const t = minTs + timeSpan * ratio;
            return (
              <text
                key={ratio}
                x={x}
                y={svgHeight - 6}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
                textAnchor={ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'}
              >
                {new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            );
          })}

          {/* Series Paths */}
          {series.map((s, sIdx) => {
            const pathD = s.points.reduce((acc, pt, i) => {
              if (pt.val === null) return acc;
              const x = padding.left + ((pt.ts - minTs) / timeSpan) * plotW;
              const y = padding.top + plotH - ((pt.val - computedMinY) / yRange) * plotH;
              return `${acc} ${acc === '' ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            }, '');

            return (
              <path
                key={sIdx}
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth="2.0"
                strokeDasharray={s.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Hover Crosshair and Hover Detection */}
          {allTimestamps.map((ts, i) => {
            const x = padding.left + ((ts - minTs) / timeSpan) * plotW;
            return (
              <rect
                key={i}
                x={x - 4}
                y={padding.top}
                width={8}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}

          {hoverIdx !== null && allTimestamps[hoverIdx] && (
            <line
              x1={padding.left + ((allTimestamps[hoverIdx] - minTs) / timeSpan) * plotW}
              y1={padding.top}
              x2={padding.left + ((allTimestamps[hoverIdx] - minTs) / timeSpan) * plotW}
              y2={padding.top + plotH}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>

      {/* Floating or Footer HUD when hovering */}
      <div className="min-h-[22px] mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono flex items-center justify-between text-slate-400">
        {hoveredPointData ? (
          <>
            <span>{new Date(hoveredPointData.ts).toLocaleTimeString()}</span>
            <div className="flex items-center gap-3">
              {hoveredPointData.items.map((item, idx) => (
                <span key={idx} style={{ color: item.color }}>
                  {item.label}:{' '}
                  <strong className="font-bold">
                    {item.val !== null ? `${item.val} ${item.unit}` : 'Unavailable'}
                  </strong>
                </span>
              ))}
            </div>
          </>
        ) : (
          <span className="text-slate-500 text-[10px]">Hover along curve to inspect precise values</span>
        )}
      </div>
    </div>
  );
};

export const HistoryView: React.FC = () => {
  const { history, isDemoMode, refreshNow, config, currentUser, queryCloudHistory } = useSolar();

  // Time filter state
  const [rangeFilter, setRangeFilter] = useState<TimeRangeFilter>('24h');
  const [dataSource, setDataSource] = useState<'local' | 'firestore'>('local');
  const [cloudPoints, setCloudPoints] = useState<HistoryPoint[] | null>(null);

  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const [appliedCustomWindow, setAppliedCustomWindow] = useState<{ start: number; end: number } | null>(null);

  // Loading & error state management
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportDownloaded, setReportDownloaded] = useState(false);

  // Load from Cloud Firestore when requested
  const loadCloudHistory = async (minTs: number, maxTs: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const pts = await queryCloudHistory(minTs, maxTs);
      setCloudPoints(pts);
      if (pts.length === 0) {
        setErrorMsg('No historical samples found in Cloud Firestore for the selected window.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query Cloud Firestore';
      setErrorMsg(`Cloud Firestore Error: ${msg}. Check network or ensure you are signed in.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter history points chronologically based on selected time window & data source
  const filteredPoints = useMemo(() => {
    if (dataSource === 'firestore' && cloudPoints !== null) {
      return cloudPoints;
    }

    const now = Date.now();
    let minTs = now - 24 * 3600 * 1000;
    let maxTs = now;

    if (rangeFilter === '1h') minTs = now - 3600 * 1000;
    else if (rangeFilter === '24h') minTs = now - 24 * 3600 * 1000;
    else if (rangeFilter === '7d') minTs = now - 7 * 24 * 3600 * 1000;
    else if (rangeFilter === '30d') minTs = now - 30 * 24 * 3600 * 1000;
    else if (rangeFilter === 'custom' && appliedCustomWindow) {
      minTs = appliedCustomWindow.start;
      maxTs = appliedCustomWindow.end;
    }

    // Sort strictly chronological
    const pts = history
      .filter((p) => p.timestamp >= minTs && p.timestamp <= maxTs)
      .sort((a, b) => a.timestamp - b.timestamp);

    return pts;
  }, [history, rangeFilter, appliedCustomWindow, dataSource, cloudPoints]);

  const handleApplyCustomRange = () => {
    const startMs = Date.parse(customStart);
    const endMs = Date.parse(customEnd);

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setErrorMsg('Invalid custom date/time format. Please pick a valid range.');
      return;
    }
    if (startMs >= endMs) {
      setErrorMsg('Custom range start date must be before end date.');
      return;
    }

    setErrorMsg(null);
    setAppliedCustomWindow({ start: startMs, end: endMs });

    if (dataSource === 'firestore') {
      loadCloudHistory(startMs, endMs);
    }
  };

  const handleSwitchDataSource = (src: 'local' | 'firestore') => {
    setDataSource(src);
    setErrorMsg(null);
    if (src === 'firestore') {
      const now = Date.now();
      let minTs = now - 24 * 3600 * 1000;
      if (rangeFilter === '1h') minTs = now - 3600 * 1000;
      else if (rangeFilter === '7d') minTs = now - 7 * 24 * 3600 * 1000;
      else if (rangeFilter === '30d') minTs = now - 30 * 24 * 3600 * 1000;
      else if (rangeFilter === 'custom' && appliedCustomWindow) {
        minTs = appliedCustomWindow.start;
      }
      loadCloudHistory(minTs, now);
    } else {
      setCloudPoints(null);
    }
  };

  // Download Formatted CSV Report Handler
  const handleDownloadReport = () => {
    const targetPoints =
      dataSource === 'firestore' && cloudPoints !== null
        ? cloudPoints
        : filteredPoints.length > 0
        ? filteredPoints
        : history;

    if (!targetPoints || targetPoints.length === 0) {
      setErrorMsg('No historical telemetry data available in app state to generate report.');
      return;
    }

    const success = downloadFormattedCsvReport(targetPoints, config);
    if (success) {
      setReportDownloaded(true);
      setErrorMsg(null);
      setTimeout(() => setReportDownloaded(false), 3500);
    }
  };

  // Daily performance & battery health breakdown
  const dailySummaryRows = useMemo(() => {
    const target =
      dataSource === 'firestore' && cloudPoints !== null
        ? cloudPoints
        : filteredPoints.length > 0
        ? filteredPoints
        : history;
    return generateDailyReportData(target, config);
  }, [dataSource, cloudPoints, filteredPoints, history, config]);

  const latestDailyMetrics = dailySummaryRows.length > 0 ? dailySummaryRows[dailySummaryRows.length - 1] : null;

  // -------------------------------------------------------------
  // SECTION A: AC POWER CALCULATIONS (PZEM-004T v3.0)
  // -------------------------------------------------------------
  const acStats = useMemo(() => {
    const acPowers = filteredPoints.map((p) => p.ac_active_power_w).filter((v): v is number => v !== null);
    const acVoltages = filteredPoints.map((p) => p.ac_voltage_v).filter((v): v is number => v !== null);
    const acCurrents = filteredPoints.map((p) => p.ac_current_a).filter((v): v is number => v !== null);
    const acEnergies = filteredPoints.map((p) => p.ac_energy_kwh).filter((v): v is number => v !== null);

    const latest = filteredPoints[filteredPoints.length - 1];

    let totalEnergyConsumedKwh: number | null = null;
    if (acEnergies.length >= 2) {
      const startEnergy = acEnergies[0];
      const endEnergy = acEnergies[acEnergies.length - 1];
      totalEnergyConsumedKwh = Math.max(0, Math.round((endEnergy - startEnergy) * 1000) / 1000);
    } else if (acPowers.length > 0) {
      // Integration estimate over sample intervals
      const sumWatts = acPowers.reduce((a, b) => a + b, 0);
      const estKwh = (sumWatts * (15 / 60)) / 1000;
      totalEnergyConsumedKwh = Math.round(estKwh * 100) / 100;
    }

    return {
      currentPower: latest?.ac_active_power_w ?? null,
      peakPower: acPowers.length > 0 ? Math.max(...acPowers) : null,
      avgPower: acPowers.length > 0 ? Math.round((acPowers.reduce((a, b) => a + b, 0) / acPowers.length) * 10) / 10 : null,
      currentVoltage: latest?.ac_voltage_v ?? null,
      minVoltage: acVoltages.length > 0 ? Math.min(...acVoltages) : null,
      maxVoltage: acVoltages.length > 0 ? Math.max(...acVoltages) : null,
      currentCurrent: latest?.ac_current_a ?? null,
      peakCurrent: acCurrents.length > 0 ? Math.max(...acCurrents) : null,
      avgFrequency: latest?.ac_frequency_hz ?? null,
      powerFactor: latest?.ac_power_factor ?? null,
      totalEnergyKwh: totalEnergyConsumedKwh,
      hasData: acPowers.length > 0,
    };
  }, [filteredPoints]);

  // -------------------------------------------------------------
  // SECTION B: DC POWER CALCULATIONS (INA228 Sensors)
  // -------------------------------------------------------------
  const dcStats = useMemo(() => {
    const solarPowers = filteredPoints.map((p) => p.solar_power_w).filter((v): v is number => v !== null);
    const batteryCurrents = filteredPoints.map((p) => p.battery_current_a).filter((v): v is number => v !== null);
    const dcLoadPowers = filteredPoints.map((p) => p.dc_load_power_w).filter((v): v is number => v !== null);
    const solarEnergies = filteredPoints.map((p) => p.solar_energy_wh).filter((v): v is number => v !== null);
    const dcLoadEnergies = filteredPoints.map((p) => p.dc_load_energy_wh).filter((v): v is number => v !== null);

    const latest = filteredPoints[filteredPoints.length - 1];

    // Solar energy Wh harvested over period
    let totalSolarWh: number | null = null;
    if (solarEnergies.length >= 2) {
      totalSolarWh = Math.max(0, Math.round((solarEnergies[solarEnergies.length - 1] - solarEnergies[0]) * 10) / 10);
    } else if (solarPowers.length > 0) {
      const sumWatts = solarPowers.reduce((a, b) => a + b, 0);
      totalSolarWh = Math.round(((sumWatts * 15) / 60) * 10) / 10;
    }

    // DC load energy Wh consumed over period
    let totalDcLoadWh: number | null = null;
    if (dcLoadEnergies.length >= 2) {
      totalDcLoadWh = Math.max(0, Math.round((dcLoadEnergies[dcLoadEnergies.length - 1] - dcLoadEnergies[0]) * 10) / 10);
    } else if (dcLoadPowers.length > 0) {
      const sumWatts = dcLoadPowers.reduce((a, b) => a + b, 0);
      totalDcLoadWh = Math.round(((sumWatts * 15) / 60) * 10) / 10;
    }

    return {
      peakSolarW: solarPowers.length > 0 ? Math.max(...solarPowers) : null,
      totalSolarWh,
      currentSolarV: latest?.solar_voltage_v ?? null,
      currentSolarA: latest?.solar_current_a ?? null,
      batterySoc: latest?.battery_soc_percent ?? null,
      batteryNetCurrent: latest?.battery_current_a ?? null,
      batteryVoltage: latest?.battery_voltage_v ?? null,
      avgDcLoadW: dcLoadPowers.length > 0 ? Math.round((dcLoadPowers.reduce((a, b) => a + b, 0) / dcLoadPowers.length) * 10) / 10 : null,
      totalDcLoadWh,
      hasData: solarPowers.length > 0 || dcLoadPowers.length > 0 || batteryCurrents.length > 0,
    };
  }, [filteredPoints]);

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Power Consumption History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Independent AC (PZEM-004T) & DC (INA228 Ch0/1/2) historical telemetry · No cross-summing
          </p>
        </div>

        {/* Action controls & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {reportDownloaded && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" /> CSV Report Downloaded!
            </span>
          )}

          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-emerald-950/40"
            title="Download formatted daily peak power, consumption & battery cycle health CSV report"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV Report</span>
          </button>

          <button
            onClick={() => exportHistoryCsv(history)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Export raw chronological telemetry samples"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Raw CSV</span>
          </button>

          <button
            onClick={() => refreshNow()}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title="Refresh historical query"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Time Filter Segmented Toolbar */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono font-semibold text-slate-300">History Window:</span>
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 ml-2">
            {(['1h', '24h', '7d', '30d'] as TimeRangeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setRangeFilter(t);
                  setErrorMsg(null);
                }}
                className={`px-3 py-1 text-xs font-medium uppercase rounded-md transition-colors ${
                  rangeFilter === t
                    ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => setRangeFilter('custom')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                rangeFilter === 'custom'
                  ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Data Source & Sample Count */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => handleSwitchDataSource('local')}
              className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                dataSource === 'local'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Local Buffer
            </button>
            <button
              onClick={() => handleSwitchDataSource('firestore')}
              className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                dataSource === 'firestore'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cloud Firestore
            </button>
          </div>

          <div className="text-slate-400 flex items-center gap-2">
            {isLoading ? (
              <span className="text-indigo-400 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Querying Firestore...
              </span>
            ) : (
              <span>
                Showing <strong className="text-slate-200">{filteredPoints.length}</strong> samples
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Accordion (When Custom Selected) */}
      {rangeFilter === 'custom' && (
        <div className="bg-[#0e1726] border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Start Date & Time:</label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-mono text-slate-400">End Date & Time:</label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleApplyCustomRange}
              className="self-end px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
            >
              Apply Filter
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Daily Peak Power, Average Consumption & Battery Cycle Health Summary */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Daily Peak Power, Consumption & Battery Health Analysis
              </h2>
              <p className="text-xs text-slate-400">
                Aggregated daily statistics and LiFePO4 cycle metrics computed from stored telemetry points ({dailySummaryRows.length} calendar {dailySummaryRows.length === 1 ? 'day' : 'days'} analyzed)
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Report</span>
          </button>
        </div>

        {latestDailyMetrics ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            {/* 1. Daily Peak Solar */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Peak Solar PV</span>
              <span className="text-amber-400 font-bold text-sm block tabular-nums">
                {latestDailyMetrics.peakSolarPowerW !== null ? `${latestDailyMetrics.peakSolarPowerW.toFixed(1)} W` : 'Unavailable'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">INA228 Ch0 Peak</span>
            </div>

            {/* 2. Daily Peak AC Inverter */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Peak AC Load</span>
              <span className="text-rose-400 font-bold text-sm block tabular-nums">
                {latestDailyMetrics.peakAcPowerW !== null ? `${latestDailyMetrics.peakAcPowerW.toFixed(1)} W` : 'Unavailable'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">PZEM-004T Peak</span>
            </div>

            {/* 3. Average AC Consumption */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Avg AC Power</span>
              <span className="text-sky-400 font-bold text-sm block tabular-nums">
                {latestDailyMetrics.avgAcPowerW !== null ? `${latestDailyMetrics.avgAcPowerW.toFixed(1)} W` : 'Unavailable'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {latestDailyMetrics.totalAcEnergyKwh !== null ? `${latestDailyMetrics.totalAcEnergyKwh.toFixed(2)} kWh Total` : 'Continuous Avg'}
              </span>
            </div>

            {/* 4. Battery Depth of Discharge */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Daily DoD (%)</span>
              <span className="text-emerald-400 font-bold text-sm block tabular-nums">
                {latestDailyMetrics.dailyDodPercent !== null ? `${latestDailyMetrics.dailyDodPercent.toFixed(1)} %` : 'Unavailable'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {latestDailyMetrics.minBatterySocPercent !== null ? `Min ${latestDailyMetrics.minBatterySocPercent.toFixed(0)}% SoC` : 'Depth of Discharge'}
              </span>
            </div>

            {/* 5. Equivalent Full Cycles */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Daily EFC Cycles</span>
              <span className="text-indigo-400 font-bold text-sm block tabular-nums">
                {latestDailyMetrics.equivalentFullCycles.toFixed(2)} Cyc
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {latestDailyMetrics.ahDischarged.toFixed(1)} Ah Discharged
              </span>
            </div>

            {/* 6. Battery State of Health */}
            <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Est Battery SoH</span>
              <span className="text-emerald-400 font-bold text-sm block tabular-nums">
                {latestDailyMetrics.estimatedSohPercent.toFixed(1)} %
              </span>
              <span className="text-[10px] text-slate-500 block truncate">3500+ Cycle Base</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs font-mono text-slate-500">
            No telemetry data accumulated yet. Run demo simulation or connect ESP32 to record daily statistics.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: AC POWER CONSUMPTION HISTORY (PZEM-004T v3.0)                   */}
      {/* ========================================================================= */}
      <section className="bg-[#070e1b] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                A. AC Power Consumption History (PZEM-004T v3.0)
              </h2>
              <p className="text-xs text-slate-400">
                230V AC pure sine inverter output · 100A Current Transformer · Modbus UART registers
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-indigo-400 self-start sm:self-auto">
            Sensor: {acStats.hasData ? 'Active Telemetry' : 'Offline / Unavailable'}
          </span>
        </div>

        {/* AC Aggregate KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">AC ACTIVE POWER</span>
            <div className="text-xl font-mono font-bold text-indigo-300 mt-1">
              {acStats.currentPower !== null ? `${acStats.currentPower.toFixed(1)}` : 'Unavailable'}
              <span className="text-xs font-normal text-slate-400 ml-1">W</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Peak: {acStats.peakPower !== null ? `${acStats.peakPower}W` : '--'}
            </span>
          </div>

          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">AC RMS CURRENT</span>
            <div className="text-xl font-mono font-bold text-slate-200 mt-1">
              {acStats.currentCurrent !== null ? `${acStats.currentCurrent.toFixed(2)}` : 'Unavailable'}
              <span className="text-xs font-normal text-slate-400 ml-1">A</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Peak: {acStats.peakCurrent !== null ? `${acStats.peakCurrent}A` : '--'}
            </span>
          </div>

          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">AC RMS VOLTAGE</span>
            <div className="text-xl font-mono font-bold text-slate-200 mt-1">
              {acStats.currentVoltage !== null ? `${acStats.currentVoltage.toFixed(1)}` : 'Unavailable'}
              <span className="text-xs font-normal text-slate-400 ml-1">V</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Range: {acStats.minVoltage ?? '--'}V - {acStats.maxVoltage ?? '--'}V
            </span>
          </div>

          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">AC ENERGY PERIOD</span>
            <div className="text-xl font-mono font-bold text-indigo-400 mt-1">
              {acStats.totalEnergyKwh !== null ? `${acStats.totalEnergyKwh.toFixed(3)}` : 'Unavailable'}
              <span className="text-xs font-normal text-slate-400 ml-1">kWh</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Inverter Output Only</span>
          </div>

          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">AC FREQUENCY</span>
            <div className="text-xl font-mono font-bold text-slate-200 mt-1">
              {acStats.avgFrequency !== null ? `${acStats.avgFrequency.toFixed(2)}` : 'Unavailable'}
              <span className="text-xs font-normal text-slate-400 ml-1">Hz</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">50Hz Pure Sine</span>
          </div>

          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">POWER FACTOR</span>
            <div className="text-xl font-mono font-bold text-slate-200 mt-1">
              {acStats.powerFactor !== null ? `${acStats.powerFactor.toFixed(2)}` : 'Unavailable'}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">cos φ</span>
          </div>
        </div>

        {/* AC Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: AC Current (A) Over Time */}
          <TelemetryChart
            title="AC RMS Current (A) Over Time"
            series={[
              {
                label: 'AC Current (PZEM-004T)',
                color: '#818cf8',
                unit: 'A',
                points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.ac_current_a })),
              },
            ]}
            emptyMessage="No historical AC current samples recorded"
          />

          {/* Chart 2: AC Active Power (W) Over Time */}
          <TelemetryChart
            title="AC Active Power (W) Over Time"
            series={[
              {
                label: 'AC Power (W)',
                color: '#6366f1',
                unit: 'W',
                points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.ac_active_power_w })),
              },
            ]}
            emptyMessage="No historical AC active power samples recorded"
          />
        </div>

        {/* Chart 3: AC Cumulative Energy (kWh) Over Time */}
        <TelemetryChart
          title="AC Energy Consumption (kWh) Over Time"
          series={[
            {
              label: 'Cumulative AC Energy (kWh)',
              color: '#a5b4fc',
              unit: 'kWh',
              points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.ac_energy_kwh })),
            },
          ]}
          emptyMessage="No historical AC energy register samples recorded"
        />
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: DC POWER CONSUMPTION HISTORY (INA228 SENSORS VIA TCA9548A)     */}
      {/* ========================================================================= */}
      <section className="bg-[#070e1b] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                B. DC Power History (INA228 Sensors via TCA9548A MUX)
              </h2>
              <p className="text-xs text-slate-400">
                Channel 0: Solar PV · Channel 1: Battery Bank (24V 100Ah) · Channel 2: DC System Load
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-emerald-400 self-start sm:self-auto">
            Sensors: {dcStats.hasData ? 'Active Telemetry' : 'Offline / Unavailable'}
          </span>
        </div>

        {/* DC Aggregate KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Ch0: Solar PV */}
          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Sun className="w-4 h-4" /> Channel 0: Solar PV
              </span>
              <span className="font-mono text-[10px] text-slate-500">INA228 (0x40)</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-xl font-mono font-bold text-white">
                {dcStats.totalSolarWh !== null ? `${dcStats.totalSolarWh} Wh` : 'Unavailable'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Peak Generation: {dcStats.peakSolarW !== null ? `${dcStats.peakSolarW} W` : '--'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Bus: {dcStats.currentSolarV !== null ? `${dcStats.currentSolarV} V` : '--'} ·{' '}
                Current: {dcStats.currentSolarA !== null ? `${dcStats.currentSolarA} A` : '--'}
              </div>
            </div>
          </div>

          {/* Ch1: Battery Bank */}
          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <span className="flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4" /> Channel 1: Battery Bank
              </span>
              <span className="font-mono text-[10px] text-slate-500">INA228 (0x41)</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-xl font-mono font-bold text-white">
                {dcStats.batterySoc !== null ? `${dcStats.batterySoc}% SOC` : 'Unavailable'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Net Current:{' '}
                {dcStats.batteryNetCurrent !== null
                  ? `${dcStats.batteryNetCurrent > 0 ? '+' : ''}${dcStats.batteryNetCurrent} A`
                  : '--'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Terminal: {dcStats.batteryVoltage !== null ? `${dcStats.batteryVoltage} V` : '--'} (24V 100Ah LiFePO4)
              </div>
            </div>
          </div>

          {/* Ch2: DC Load */}
          <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4" /> Channel 2: DC System Load
              </span>
              <span className="font-mono text-[10px] text-slate-500">INA228 (0x44)</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-xl font-mono font-bold text-white">
                {dcStats.totalDcLoadWh !== null ? `${dcStats.totalDcLoadWh} Wh` : 'Unavailable'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Avg Power: {dcStats.avgDcLoadW !== null ? `${dcStats.avgDcLoadW} W` : '--'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Pure 24V DC Auxiliary System Rails
              </div>
            </div>
          </div>
        </div>

        {/* DC Charts Grid */}
        <div className="space-y-4">
          {/* Chart 1: DC Current (A) Comparison by Channel */}
          <TelemetryChart
            title="DC Currents (A) by Channel: Solar PV, Battery, DC Load"
            series={[
              {
                label: 'Ch0: Solar PV Current (A)',
                color: '#10b981',
                unit: 'A',
                points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.solar_current_a })),
              },
              {
                label: 'Ch1: Battery Net Current (A, Signed)',
                color: '#f59e0b',
                unit: 'A',
                points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.battery_current_a })),
                dash: '3 2',
              },
              {
                label: 'Ch2: DC Load Current (A)',
                color: '#06b6d4',
                unit: 'A',
                points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.dc_load_current_a })),
              },
            ]}
            emptyMessage="No historical DC current samples recorded"
          />

          {/* 3 Separate DC Power Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* PV DC Power Chart */}
            <TelemetryChart
              title="Solar PV Power (W) Over Time"
              series={[
                {
                  label: 'Solar PV Power',
                  color: '#10b981',
                  unit: 'W',
                  points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.solar_power_w })),
                },
              ]}
              emptyMessage="No solar PV power data"
            />

            {/* Battery DC Power Chart */}
            <TelemetryChart
              title="Battery Net Power (W) & SOC (%)"
              series={[
                {
                  label: 'Net Battery Power (W)',
                  color: '#f59e0b',
                  unit: 'W',
                  points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.battery_power_w })),
                },
                {
                  label: 'SOC (%)',
                  color: '#fbbf24',
                  unit: '%',
                  points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.battery_soc_percent })),
                  dash: '2 2',
                },
              ]}
              emptyMessage="No battery power data"
            />

            {/* DC Load Power Chart */}
            <TelemetryChart
              title="DC System Load Power (W)"
              series={[
                {
                  label: 'DC Load Power',
                  color: '#06b6d4',
                  unit: 'W',
                  points: filteredPoints.map((p) => ({ ts: p.timestamp, val: p.dc_load_power_w })),
                },
              ]}
              emptyMessage="No DC load power data"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
