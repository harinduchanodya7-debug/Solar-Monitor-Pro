/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Precision Telemetry Metric Card
 */

import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string | null;
  unit?: string;
  secondaryText?: string;
  status?: 'normal' | 'positive' | 'warning' | 'critical' | 'neutral';
  channelLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  secondaryText,
  status = 'neutral',
  channelLabel,
  subtitle,
  icon,
}) => {
  const isAvailable = value !== null && value !== undefined;

  let valueColor = 'text-slate-100';
  if (!isAvailable) {
    valueColor = 'text-slate-500 italic';
  } else if (status === 'positive') {
    valueColor = 'text-emerald-400';
  } else if (status === 'warning') {
    valueColor = 'text-amber-400';
  } else if (status === 'critical') {
    valueColor = 'text-rose-400';
  }

  return (
    <div className="bg-[#0e1726] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              {label}
            </span>
            {channelLabel && (
              <span className="text-[10px] font-mono text-slate-500">
                · {channelLabel}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline">
        <span className={`text-2xl lg:text-3xl font-mono font-bold tracking-tight ${valueColor}`}>
          {isAvailable ? value : 'Unavailable'}
        </span>
        {isAvailable && unit && (
          <span className="text-xs font-mono font-semibold uppercase text-slate-400 ml-1.5">
            {unit}
          </span>
        )}
      </div>

      {secondaryText && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
          {secondaryText}
        </div>
      )}
    </div>
  );
};
