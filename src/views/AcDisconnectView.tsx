/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Solar Monitor Pro - AC Disconnect & High-Voltage Contactor Safety Control
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Power,
  CheckCircle2,
  XCircle,
  HelpCircle,
  KeyRound,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useSolar } from '../context/SolarContext';

export const AcDisconnectView: React.FC = () => {
  const {
    telemetry,
    config,
    updateConfig,
    triggerAcControl,
    commandPending,
    lastCommandResult,
  } = useSolar();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'open' | 'close'>('open');
  const [authToken, setAuthToken] = useState('SOLAR_SECURE_TOKEN_2026');
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const contactorFeedback = telemetry?.ac_contactor_feedback ?? null;
  const commandStatus = telemetry?.ac_control_status ?? 'unknown';
  const measuredAcVoltage = telemetry?.ac_voltage_v ?? null;
  const isTripped = commandStatus === 'tripped';

  const handleOpenModal = (action: 'open' | 'close') => {
    setPendingAction(action);
    setAcknowledgeRisk(false);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleExecuteCommand = async () => {
    if (!acknowledgeRisk) {
      setActionError('You must acknowledge the high-voltage safety risks before proceeding.');
      return;
    }
    if (!authToken.trim()) {
      setActionError('Authentication security token is required.');
      return;
    }

    const res = await triggerAcControl(pendingAction, authToken.trim());
    if (res.success) {
      setIsModalOpen(false);
    } else {
      setActionError(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AC Load Disconnect & Contactor Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            230V Inverter Load Control · Verified Auxiliary Hardware Dry Contact Interlock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Hardware Interlock:</span>
          <span
            className={`text-xs font-mono font-bold uppercase ${
              config.hardware_contactor_installed ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {config.hardware_contactor_installed ? 'Configured & Active' : 'Not Installed'}
          </span>
        </div>
      </div>

      {/* Mandatory Safety Notice */}
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 text-rose-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs">
            <div className="text-sm font-bold text-rose-100 uppercase tracking-wide">
              Mandatory Physical Safety Notice
            </div>
            <p className="leading-relaxed text-rose-200/90">
              This software control sends digital signals to an electromechanical contactor relay.
              <strong className="text-white">
                {' '}IT IS NOT A PHYSICAL CIRCUIT BREAKER, RESIDUAL CURRENT DEVICE (RCD), OR LIFE-SAFETY ISOLATOR.{' '}
              </strong>
              Never rely on software controls for personnel safety. Always physically open and lock out
              the mechanical DIN-rail circuit breaker and verify zero voltage with an approved multi-meter
              prior to performing any maintenance.
            </p>
          </div>
        </div>
      </div>

      {/* Tripartite State Verification Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* State 1: Controller Command Status */}
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
              1. Software Command State
            </div>
            <div className="text-xl font-mono font-bold mt-2">
              {commandStatus === 'closed' ? (
                <span className="text-emerald-400">CLOSED (ENERGIZED)</span>
              ) : commandStatus === 'open' ? (
                <span className="text-amber-400">OPEN (DE-ENERGIZED)</span>
              ) : commandStatus === 'tripped' ? (
                <span className="text-rose-400">TRIPPED (LOCKOUT)</span>
              ) : (
                <span className="text-slate-500">UNKNOWN</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Controller GPIO relay output state received from ESP32.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
            Endpoint: /api/control/ac-disconnect
          </div>
        </div>

        {/* State 2: Verified Hardware Auxiliary Feedback */}
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
              2. Contactor Hardware Auxiliary Feedback
            </div>
            <div className="text-xl font-mono font-bold mt-2">
              {contactorFeedback === true ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> VERIFIED CLOSED
                </span>
              ) : contactorFeedback === false ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> VERIFIED OPEN
                </span>
              ) : (
                <span className="text-amber-300 flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" /> UNCONFIRMED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {contactorFeedback === null
                ? 'Auxiliary microswitch dry-contact is not connected or reporting. State cannot be independently confirmed.'
                : 'Confirmed by physical dry-contact auxiliary switch mechanically coupled to the contactor armature.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
            Hardware Channel: ESP32 GPIO21 (Aux Sense)
          </div>
        </div>

        {/* State 3: Measured AC Line Voltage */}
        <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
              3. Downstream AC Voltage Reading
            </div>
            <div className="text-xl font-mono font-bold mt-2">
              {measuredAcVoltage !== null ? (
                <span className={measuredAcVoltage > 50 ? 'text-indigo-400' : 'text-slate-400'}>
                  {measuredAcVoltage.toFixed(1)} V AC
                </span>
              ) : (
                <span className="text-slate-500">Unavailable</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Independent PZEM-004T AC voltage measurement on load side of contactor.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
            Sensor: PZEM-004T v3.0 (CT Bus)
          </div>
        </div>
      </div>

      {/* Control Actions & Safety Interlock Enclosure */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Contactor Switching Controls
            </h2>
            <p className="text-xs text-slate-400">
              Requires two-step authentication. Never automatically reconnects after a trip.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.hardware_contactor_installed}
              onChange={(e) => updateConfig({ hardware_contactor_installed: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Contactor Hardware Configured</span>
          </label>
        </div>

        {isTripped && (
          <div className="mb-4 p-3 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              <strong>FAULT LOCKOUT ACTIVE:</strong> The contactor was tripped by an overload or fault.
              Software reconnection is locked out. Inspect physical wiring and inverter loads before clearing.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={() => handleOpenModal('open')}
            disabled={!config.hardware_contactor_installed || commandPending || commandStatus === 'open'}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            <Power className="w-4 h-4" />
            <span>Disconnect AC Load (Open Contactor)</span>
          </button>

          <button
            onClick={() => handleOpenModal('close')}
            disabled={
              !config.hardware_contactor_installed ||
              commandPending ||
              commandStatus === 'closed' ||
              isTripped
            }
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Reconnect AC Load (Close Contactor)</span>
          </button>

          {commandPending && (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Transmitting authenticated command...</span>
            </div>
          )}
        </div>

        {lastCommandResult && (
          <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 flex items-center justify-between">
            <span>
              Last Command: <strong className="uppercase">{lastCommandResult.action}</strong> ·{' '}
              {lastCommandResult.message}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(lastCommandResult.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Two-Step Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Confirm AC Contactor {pendingAction === 'open' ? 'DISCONNECT' : 'RECONNECT'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                You are about to command the ESP32 to{' '}
                <strong className={pendingAction === 'open' ? 'text-rose-400' : 'text-emerald-400'}>
                  {pendingAction === 'open' ? 'OPEN (DE-ENERGIZE)' : 'CLOSE (ENERGIZE)'}
                </strong>{' '}
                the 230V AC load contactor.
              </p>
              {pendingAction === 'close' ? (
                <p className="text-amber-300 bg-amber-950/30 p-2.5 rounded border border-amber-800/40">
                  Ensure all downstream appliances and personnel are clear before energizing 230V AC circuits.
                </p>
              ) : (
                <p className="text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  All active 230V AC inverter loads will immediately lose power.
                </p>
              )}
            </div>

            {/* Token entry */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Security Authorization Token:
              </label>
              <input
                type="text"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Checkbox acknowledgement */}
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={acknowledgeRisk}
                onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 mt-0.5"
              />
              <span>
                I confirm that I understand the electrical risks, have verified physical conditions,
                and authorize this switching command.
              </span>
            </label>

            {actionError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800 text-xs text-rose-300 rounded">
                {actionError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCommand}
                disabled={commandPending}
                className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  pendingAction === 'open'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {commandPending ? 'Sending...' : `Confirm & ${pendingAction.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
