/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - Stale Data & Offline Indicator
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useSolar } from '../../context/SolarContext';

export const StaleDataBanner: React.FC = () => {
  const { telemetry, isStale, connectionStatus, lastError, refreshNow } = useSolar();

  if (!isStale && connectionStatus !== 'error' && connectionStatus !== 'offline') {
    return null;
  }

  const secondsAgo = telemetry?.timestamp
    ? Math.max(0, Math.floor((Date.now() - telemetry.timestamp) / 1000))
    : null;

  return (
    <div className="bg-amber-950/60 border border-amber-600/40 rounded-xl px-4 py-3 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-amber-100">
              {connectionStatus === 'error' ? 'Connection Error' : 'Stale Telemetry Data'}
            </span>
            <span className="text-xs font-mono text-amber-300">
              {secondsAgo !== null ? `· Last valid sample ${secondsAgo}s ago` : '· No samples received'}
            </span>
          </div>
          <p className="text-xs text-amber-300/80 mt-0.5">
            {lastError ||
              'Telemetry sample is older than 30 seconds. Displaying last retained readings with stale indicator.'}
          </p>
        </div>
      </div>

      <button
        onClick={() => refreshNow()}
        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Poll Again</span>
      </button>
    </div>
  );
};
