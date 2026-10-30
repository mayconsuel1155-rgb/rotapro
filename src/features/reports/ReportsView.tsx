import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Navigation, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Download, 
  ChevronRight, 
  MapPin, 
  FileText,
  Filter
} from 'lucide-react';
import type { EnrichedJourney } from '../../types';
import { journeyRepository } from '../../db/repositories/journeyRepository';
import { Modal } from '../../components/ui/Modal';
import { formatDateBr, formatTime24h, formatDurationHuman } from '../../domain/time/timeService';

export function ReportsView() {
  const [journeys, setJourneys] = useState<EnrichedJourney[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<EnrichedJourney | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days'>('all');

  useEffect(() => {
    const load = async () => {
      const all = await journeyRepository.getAllEnriched();
      setJourneys(all);
    };
    load();
  }, []);

  const filteredJourneys = useMemo(() => {
    if (filterPeriod === 'all') return journeys;
    const now = new Date();
    const days = filterPeriod === '7days' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return journeys.filter(j => new Date(j.date).getTime() >= cutoff.getTime());
  }, [journeys, filterPeriod]);

  // Consolidated operational indicators
  const aggregatedStats = useMemo(() => {
    let totalJourneys = filteredJourneys.length;
    let totalCompletedVisits = 0;
    let totalTravelSecs = 0;
    let totalServiceSecs = 0;
    let totalFieldSecs = 0;

    for (const j of filteredJourneys) {
      totalCompletedVisits += j.stats.completedStops;
      totalTravelSecs += j.stats.totalTravelSeconds;
      totalServiceSecs += j.stats.totalServiceSeconds;
      totalFieldSecs += j.stats.totalDurationSeconds;
    }

    const avgServiceSecs = totalCompletedVisits > 0 ? Math.floor(totalServiceSecs / totalCompletedVisits) : 0;
    const avgTravelSecs = totalCompletedVisits > 0 ? Math.floor(totalTravelSecs / totalCompletedVisits) : 0;

    return {
      totalJourneys,
      totalCompletedVisits,
      totalTravelSecs,
      totalServiceSecs,
      totalFieldSecs,
      avgServiceSecs,
      avgTravelSecs
    };
  }, [filteredJourneys]);

  // Export CSV summary (offline, pure client-side)
  const handleExportCSV = () => {
    if (filteredJourneys.length === 0) return;

    let csv = 'Data,Status,Inicio,Termino,DuracaoTotalMin,VisitasProgramadas,VisitasConcluidas,DeslocamentoMin,AtendimentoMin\n';

    for (const j of filteredJourneys) {
      const totalDurMin = Math.round(j.stats.totalDurationSeconds / 60);
      const travelMin = Math.round(j.stats.totalTravelSeconds / 60);
      const serviceMin = Math.round(j.stats.totalServiceSeconds / 60);

      csv += `"${formatDateBr(j.date)}","${j.status}","${formatTime24h(j.startedAt)}","${formatTime24h(j.endedAt)}",${totalDurMin},${j.stats.totalStops},${j.stats.completedStops},${travelMin},${serviceMin}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rotapro_relatorio_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            <span>Relatórios e Indicadores Operacionais</span>
          </h2>
          <p className="text-sm text-slate-400">
            Acompanhe o histórico de campo, médias de atendimento e deslocamento
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 p-1 bg-brand-surface border border-brand-border rounded-xl">
            <button
              onClick={() => setFilterPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterPeriod === '7days' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setFilterPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterPeriod === '30days' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 dias
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterPeriod === 'all' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredJourneys.length === 0}
            title="Exportar dados da tabela para arquivo CSV"
            className="p-2 bg-brand-surface hover:bg-slate-800 border border-brand-border text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Atendimentos</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {aggregatedStats.totalCompletedVisits}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            visitas concluídas
          </span>
        </div>

        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo em Campo</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatDurationHuman(aggregatedStats.totalFieldSecs)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            em {aggregatedStats.totalJourneys} jornadas
          </span>
        </div>

        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Média Atendimento</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatDurationHuman(aggregatedStats.avgServiceSecs)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            por cliente visitado
          </span>
        </div>

        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Média Deslocamento</span>
            <Navigation className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatDurationHuman(aggregatedStats.avgTravelSecs)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            por trajeto registrado
          </span>
        </div>
      </div>

      {/* Journeys List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Histórico de Jornadas ({filteredJourneys.length})
        </h3>

        {filteredJourneys.length === 0 ? (
          <div className="p-10 text-center bg-brand-surface/40 border border-brand-border rounded-2xl">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">Nenhuma jornada no período</p>
            <p className="text-xs text-slate-500 mt-1">
              As jornadas realizadas e seus cronômetros aparecerão detalhados aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredJourneys.map(journey => (
              <div
                key={journey.id}
                onClick={() => setSelectedJourney(journey)}
                className="p-4 bg-brand-surface hover:bg-slate-800/80 border border-brand-border hover:border-slate-600 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                    journey.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : journey.status === 'in_progress'
                      ? 'bg-blue-950 text-sky-400 border border-blue-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {journey.stats.completedStops}/{journey.stats.totalStops}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm sm:text-base">
                        {formatDateBr(journey.date)}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        journey.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300'
                          : journey.status === 'in_progress'
                          ? 'bg-blue-950 text-sky-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {journey.status === 'completed'
                          ? 'Finalizada'
                          : journey.status === 'in_progress'
                          ? 'Em andamento'
                          : 'Planejada'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatTime24h(journey.startedAt)} às {formatTime24h(journey.endedAt)} • Duração:{' '}
                      <strong className="text-slate-200">
                        {formatDurationHuman(journey.stats.totalDurationSeconds)}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col text-right text-xs">
                    <span className="text-slate-300 font-medium">
                      Atend: {formatDurationHuman(journey.stats.totalServiceSeconds)}
                    </span>
                    <span className="text-slate-400">
                      Desloc: {formatDurationHuman(journey.stats.totalTravelSeconds)}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Journey Detail Modal */}
      <Modal
        isOpen={!!selectedJourney}
        onClose={() => setSelectedJourney(null)}
        title={selectedJourney ? `Detalhe da Jornada: ${formatDateBr(selectedJourney.date)}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedJourney && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-brand-bg rounded-xl border border-brand-border text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Início / Fim</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {formatTime24h(selectedJourney.startedAt)} - {formatTime24h(selectedJourney.endedAt)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Campo</span>
                <p className="text-sm font-semibold text-sky-400 mt-0.5">
                  {formatDurationHuman(selectedJourney.stats.totalDurationSeconds)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Deslocamento</span>
                <p className="text-sm font-semibold text-blue-400 mt-0.5">
                  {formatDurationHuman(selectedJourney.stats.totalTravelSeconds)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Atendimento</span>
                <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                  {formatDurationHuman(selectedJourney.stats.totalServiceSeconds)}
                </p>
              </div>
            </div>

            {/* Chronological list of stops */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Sequência de Eventos e Paradas
              </h4>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {selectedJourney.stops.map((stop, i) => {
                  const travelSecs = stop.travelStartedAt && (stop.arrivedAt || stop.travelEndedAt)
                    ? Math.floor((new Date(stop.arrivedAt || stop.travelEndedAt!).getTime() - new Date(stop.travelStartedAt).getTime()) / 1000)
                    : 0;

                  const serviceSecs = stop.serviceStartedAt && stop.serviceEndedAt
                    ? Math.floor((new Date(stop.serviceEndedAt).getTime() - new Date(stop.serviceStartedAt).getTime()) / 1000)
                    : 0;

                  return (
                    <div
                      key={stop.id}
                      className="p-3.5 bg-brand-bg rounded-xl border border-brand-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                            {stop.isReturnToBase ? 'Fim' : i + 1}
                          </span>
                          <span className="font-semibold text-white text-sm">
                            {stop.isReturnToBase ? 'Retorno à Empresa' : stop.client?.name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          stop.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-600/40'
                        }`}>
                          {stop.status === 'completed' ? 'Concluído' : 'Pulado / Pendente'}
                        </span>
                      </div>

                      {!stop.isReturnToBase && stop.client?.address && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          <span>{stop.client.address}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1 border-t border-brand-border/40">
                        {travelSecs > 0 && (
                          <span>Deslocamento: <strong>{formatDurationHuman(travelSecs)}</strong> ({formatTime24h(stop.travelStartedAt)} - {formatTime24h(stop.arrivedAt || stop.travelEndedAt)})</span>
                        )}
                        {serviceSecs > 0 && (
                          <span>Atendimento: <strong>{formatDurationHuman(serviceSecs)}</strong> ({formatTime24h(stop.serviceStartedAt)} - {formatTime24h(stop.serviceEndedAt)})</span>
                        )}
                      </div>

                      {stop.notes && (
                        <p className="text-xs text-slate-400 italic bg-brand-surface/40 p-2 rounded-lg">
                          "{stop.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-brand-border">
              <button
                onClick={() => setSelectedJourney(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
