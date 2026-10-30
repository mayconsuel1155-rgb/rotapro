import React from 'react';
import { 
  LayoutDashboard, 
  Play, 
  Navigation, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Users, 
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import type { EnrichedJourney } from '../../types';
import { formatDateBr, formatTime24h, formatDurationHuman, getTodayDateString } from '../../domain/time/timeService';
import { useRealtimeTimer } from '../../hooks/useRealtimeTimer';

interface DashboardViewProps {
  journey?: EnrichedJourney;
  totalClientsCount: number;
  onNavigateToPlanning: () => void;
  onNavigateToJourney: () => void;
  onNavigateToReports: () => void;
  onNavigateToClients: () => void;
}

export function DashboardView({
  journey,
  totalClientsCount,
  onNavigateToPlanning,
  onNavigateToJourney,
  onNavigateToReports,
  onNavigateToClients
}: DashboardViewProps) {
  const isRunning = journey?.status === 'in_progress';
  const isCompleted = journey?.status === 'completed';

  const { display: liveDuration } = useRealtimeTimer(
    journey?.startedAt,
    journey?.endedAt,
    isRunning
  );

  const activeStop = journey?.stops.find(s => ['traveling', 'arrived', 'servicing'].includes(s.status));
  const nextPending = journey?.stops
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.position - b.position)[0];

  const clientStops = journey?.stops.filter(s => !s.isReturnToBase) || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-brand-surface via-brand-card to-brand-surface border border-brand-border rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img 
            src="/icons/icon-192x192.png" 
            alt="RotaPro" 
            className="w-16 h-16 rounded-2xl shadow-lg border border-brand-border/60 shrink-0" 
          />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateBr(getTodayDateString())}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              Meu Dia de Trabalho
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              {isRunning
                ? 'Jornada em andamento. Registros e cronômetros ativos.'
                : isCompleted
                ? 'Jornada do dia finalizada com sucesso!'
                : 'Nenhuma jornada iniciada hoje. Prepare sua rota para começar.'}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="shrink-0">
          {isRunning ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 glow-active">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Em Andamento</span>
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-950/80 border border-blue-500/50 text-sky-300">
              <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Finalizada</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-900 border border-slate-700 text-slate-400">
              <span>Não Iniciada</span>
            </span>
          )}
        </div>
      </div>

      {/* Primary Contextual Action Card */}
      {isRunning ? (
        <div className="p-6 bg-gradient-to-r from-brand-card to-brand-surface border border-brand-primary/60 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Atividade Atual
            </span>
            <h3 className="text-xl font-bold text-white">
              {activeStop
                ? activeStop.isReturnToBase
                  ? 'Retornando à Empresa / Base'
                  : activeStop.status === 'traveling'
                  ? `Em deslocamento para ${activeStop.client?.name}`
                  : `Em atendimento em ${activeStop.client?.name}`
                : nextPending
                ? `Próximo: ${nextPending.client?.name || 'Retorno à Empresa'}`
                : 'Aguardando próxima etapa'}
            </h3>
            <p className="text-xs text-slate-300">
              Tempo em campo hoje: <strong className="text-white font-mono">{liveDuration}</strong>
            </p>
          </div>

          <button
            onClick={onNavigateToJourney}
            className="w-full sm:w-auto px-6 py-3.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-transform hover:scale-105"
          >
            <Navigation className="w-5 h-5" />
            <span>Continuar Jornada</span>
          </button>
        </div>
      ) : isCompleted ? (
        <div className="p-6 bg-brand-surface border border-emerald-500/40 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Jornada Concluída
            </span>
            <h3 className="text-lg font-bold text-white">
              {journey.stats.completedStops} atendimentos concluídos com sucesso hoje
            </h3>
            <p className="text-xs text-slate-400">
              Duração total: {formatDurationHuman(journey.stats.totalDurationSeconds)}
            </p>
          </div>

          <button
            onClick={onNavigateToReports}
            className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-brand-border transition-colors"
          >
            <span>Ver Relatório do Dia</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-6 bg-brand-surface border border-brand-border rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">
              Pronto para começar suas visitas?
            </h3>
            <p className="text-xs text-slate-300">
              {totalClientsCount > 0
                ? `${totalClientsCount} clientes cadastrados disponíveis para programação.`
                : 'Cadastre seus clientes antes de iniciar a primeira jornada.'}
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {totalClientsCount === 0 && (
              <button
                onClick={onNavigateToClients}
                className="flex-1 sm:flex-initial px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-brand-border transition-colors"
              >
                Cadastrar Clientes
              </button>
            )}
            <button
              onClick={onNavigateToPlanning}
              className="flex-1 sm:flex-initial px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-transform hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Programar Visitas do Dia</span>
            </button>
          </div>
        </div>
      )}

      {/* Operational Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Scheduled Stops */}
        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Visitas</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {journey ? `${journey.stats.completedStops} / ${journey.stats.totalStops}` : '0'}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {journey ? 'concluídas / programadas' : 'nenhuma programada'}
          </span>
        </div>

        {/* Travel Time */}
        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Deslocamento</span>
            <Navigation className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {journey ? formatDurationHuman(journey.stats.totalTravelSeconds) : '0 min'}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            tempo real em trânsito
          </span>
        </div>

        {/* Service Time */}
        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Atendimento</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {journey ? formatDurationHuman(journey.stats.totalServiceSeconds) : '0 min'}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            tempo real com clientes
          </span>
        </div>

        {/* Total Time */}
        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo Total</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">
            {isRunning ? liveDuration : journey ? formatDurationHuman(journey.stats.totalDurationSeconds) : '00:00:00'}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {journey?.startedAt ? `iniciado às ${formatTime24h(journey.startedAt)}` : 'aguardando início'}
          </span>
        </div>
      </div>

      {/* Today's Queue Preview if Journey is active */}
      {journey && clientStops.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Roteiro de Hoje ({clientStops.length} clientes)
            </h3>
            <button
              onClick={onNavigateToJourney}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <span>Ver painel completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {clientStops.map((stop, idx) => (
              <div
                key={stop.id}
                className="p-3.5 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    stop.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                      : ['traveling', 'arrived', 'servicing'].includes(stop.status)
                      ? 'bg-brand-primary text-white animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{stop.client?.name}</h4>
                    <p className="text-xs text-slate-400 truncate max-w-xs">{stop.client?.address}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    stop.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-300'
                      : stop.status === 'traveling'
                      ? 'bg-blue-950 text-blue-300'
                      : stop.status === 'servicing'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {stop.status === 'completed'
                      ? 'Concluído'
                      : stop.status === 'traveling'
                      ? 'Em trânsito'
                      : stop.status === 'servicing'
                      ? 'Em atendimento'
                      : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
