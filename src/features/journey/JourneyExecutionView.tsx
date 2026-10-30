import React, { useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Play, 
  ArrowRight, 
  Building2, 
  AlertTriangle, 
  Plus, 
  FileText, 
  SkipForward, 
  XCircle,
  Flag,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import type { EnrichedJourney, EnrichedStop, Client } from '../../types';
import { journeyRepository } from '../../db/repositories/journeyRepository';
import { clientRepository } from '../../db/repositories/clientRepository';
import { useRealtimeTimer } from '../../hooks/useRealtimeTimer';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { formatTime24h, formatDurationHuman, formatDateBr } from '../../domain/time/timeService';

interface JourneyExecutionViewProps {
  journey: EnrichedJourney | undefined;
  onRefresh: () => void;
  onNavigateToPlanning: () => void;
  onNavigateToReports: () => void;
}

export function JourneyExecutionView({
  journey,
  onRefresh,
  onNavigateToPlanning,
  onNavigateToReports
}: JourneyExecutionViewProps) {
  const { showToast } = useToast();

  // Modals
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [emergencyClientId, setEmergencyClientId] = useState('');
  const [emergencyMinutes, setEmergencyMinutes] = useState(30);

  const [notesModalStop, setNotesModalStop] = useState<EnrichedStop | null>(null);
  const [stopNotes, setStopNotes] = useState('');

  const [isFinishing, setIsFinishing] = useState(false);

  // Identify active stop (traveling, arrived, or servicing)
  const activeStop = journey?.stops.find(s => ['traveling', 'arrived', 'servicing'].includes(s.status));
  
  // Next pending stop if no active stop
  const nextPendingStop = journey?.stops
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.position - b.position)[0];

  // Current timer parameters based on stage
  const timerStart = activeStop?.status === 'traveling' 
    ? activeStop.travelStartedAt 
    : activeStop?.status === 'servicing'
    ? activeStop.serviceStartedAt
    : undefined;

  const { display: timerDisplay } = useRealtimeTimer(timerStart, undefined, !!timerStart);

  // Overall journey duration timer
  const { display: totalJourneyTimer } = useRealtimeTimer(journey?.startedAt, journey?.endedAt, journey?.status === 'in_progress');

  // Load clients for emergency modal
  const handleOpenEmergencyModal = async () => {
    const clients = await clientRepository.getAll(false);
    setAvailableClients(clients);
    if (clients.length > 0) setEmergencyClientId(clients[0].id);
    setIsEmergencyModalOpen(true);
  };

  const handleAddEmergencyStop = async () => {
    if (!journey || !emergencyClientId) return;
    try {
      await journeyRepository.addEmergencyStop(journey.id, emergencyClientId, emergencyMinutes);
      showToast('Cliente urgente adicionado à rota com sucesso!', 'success');
      setIsEmergencyModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao adicionar cliente: ' + err.message, 'error');
    }
  };

  // State transitions
  const handleStartTravel = async (stop: EnrichedStop) => {
    if (!journey) return;
    if (stop.isReturnToBase) {
      await journeyRepository.startReturnTravel(journey.id, stop.id);
      showToast('Deslocamento de retorno à base iniciado!', 'info');
    } else {
      await journeyRepository.startTravel(journey.id, stop.id);
      showToast(`Deslocamento para "${stop.client?.name}" iniciado!`, 'info');
    }
    onRefresh();
  };

  const handleArrive = async (stop: EnrichedStop) => {
    if (!journey) return;
    await journeyRepository.arriveAtStop(journey.id, stop.id);
    showToast(`Chegada registrada em "${stop.client?.name}"!`, 'success');
    onRefresh();
  };

  const handleStartService = async (stop: EnrichedStop) => {
    if (!journey) return;
    await journeyRepository.startService(journey.id, stop.id);
    showToast(`Atendimento em "${stop.client?.name}" iniciado!`, 'info');
    onRefresh();
  };

  const handleOpenFinishService = (stop: EnrichedStop) => {
    setNotesModalStop(stop);
    setStopNotes(stop.notes || '');
  };

  const handleConfirmFinishService = async () => {
    if (!journey || !notesModalStop) return;
    await journeyRepository.endService(journey.id, notesModalStop.id, stopNotes);
    showToast(`Atendimento em "${notesModalStop.client?.name}" finalizado!`, 'success');
    setNotesModalStop(null);
    onRefresh();
  };

  const handleSkipStop = async (stop: EnrichedStop) => {
    if (!journey) return;
    const reason = window.prompt(`Informe o motivo para pular a visita a "${stop.client?.name}":`, 'Cliente ausente');
    if (reason !== null) {
      await journeyRepository.skipStop(journey.id, stop.id, reason);
      showToast(`Visita a "${stop.client?.name}" marcada como pulada.`, 'info');
      onRefresh();
    }
  };

  const handleFinishReturn = async (stop: EnrichedStop) => {
    if (!journey) return;
    setIsFinishing(true);
    try {
      await journeyRepository.finishJourney(journey.id, stop.id);
      showToast('Jornada finalizada com sucesso! Parabéns!', 'success');
      onRefresh();
    } finally {
      setIsFinishing(false);
    }
  };

  const handleForceFinishJourney = async () => {
    if (!journey) return;
    if (window.confirm('Deseja realmente encerrar a jornada agora? Todas as visitas não concluídas serão registradas no histórico.')) {
      setIsFinishing(true);
      try {
        const returnStop = journey.stops.find(s => s.isReturnToBase);
        await journeyRepository.finishJourney(journey.id, returnStop?.id);
        showToast('Jornada encerrada.', 'info');
        onRefresh();
      } finally {
        setIsFinishing(false);
      }
    }
  };

  const handleMovePendingStop = async (index: number, direction: 'up' | 'down') => {
    if (!journey) return;
    const pendingStops = journey.stops.filter(s => s.status === 'pending' && !s.isReturnToBase);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pendingStops.length) return;

    const newOrder = [...pendingStops];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    await journeyRepository.reorderPendingStops(journey.id, newOrder.map(s => s.id));
    onRefresh();
  };

  // If no active journey at all
  if (!journey || journey.status === 'not_started') {
    return (
      <div className="p-10 bg-brand-surface border border-brand-border rounded-2xl text-center space-y-4">
        <Navigation className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">Nenhuma jornada em andamento</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Crie a programação dos clientes de hoje para iniciar o acompanhamento e os cronômetros.
        </p>
        <button
          onClick={onNavigateToPlanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Criar Programação do Dia</span>
        </button>
      </div>
    );
  }

  // If journey is completed
  if (journey.status === 'completed') {
    const clientStops = journey.stops.filter(s => !s.isReturnToBase);
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="p-8 bg-gradient-to-b from-brand-surface to-brand-card border border-emerald-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-900/60 text-emerald-300 border border-emerald-600/40">
              Jornada Concluída
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">
              Resumo do Dia • {formatDateBr(journey.date)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Início: {formatTime24h(journey.startedAt)} • Término: {formatTime24h(journey.endedAt)}
            </p>
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Visitas</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">
                {journey.stats.completedStops}/{journey.stats.totalStops}
              </p>
            </div>
            <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Tempo Total</span>
              <p className="text-xl font-bold text-sky-400 mt-0.5">
                {formatDurationHuman(journey.stats.totalDurationSeconds)}
              </p>
            </div>
            <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Deslocamento</span>
              <p className="text-xl font-bold text-blue-400 mt-0.5">
                {formatDurationHuman(journey.stats.totalTravelSeconds)}
              </p>
            </div>
            <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Atendimento</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">
                {formatDurationHuman(journey.stats.totalServiceSeconds)}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onNavigateToReports}
              className="px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Ver Detalhes nos Relatórios
            </button>
            <button
              onClick={onNavigateToPlanning}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors border border-brand-border"
            >
              Nova Programação
            </button>
          </div>
        </div>

        {/* Visited stops chronology */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Linha do Tempo das Visitas
          </h3>
          <div className="space-y-2.5">
            {clientStops.map((stop, i) => (
              <div key={stop.id} className="p-4 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{stop.client?.name}</h4>
                    <p className="text-xs text-slate-400">{stop.client?.address}</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    stop.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                  }`}>
                    {stop.status === 'completed' ? 'Atendido' : 'Pulado'}
                  </span>
                  {stop.serviceStartedAt && stop.serviceEndedAt && (
                    <p className="text-slate-400 mt-1">
                      {formatTime24h(stop.serviceStartedAt)} - {formatTime24h(stop.serviceEndedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- JOURNEY IN PROGRESS ---
  const pendingStops = journey.stops
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.position - b.position);

  const completedStops = journey.stops
    .filter(s => ['completed', 'skipped', 'cancelled'].includes(s.status))
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      {/* Top Journey Status Bar */}
      <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 glow-active">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Jornada em Campo</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                Ao Vivo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Início: {formatTime24h(journey.startedAt)} • Duração total: <strong className="text-slate-200">{totalJourneyTimer}</strong>
            </p>
          </div>
        </div>

        {/* Emergency Add button and Early Finish */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleOpenEmergencyModal}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Cliente Urgente</span>
          </button>
          <button
            onClick={handleForceFinishJourney}
            title="Encerrar jornada antecipadamente"
            className="px-3 py-2 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Encerrar Dia</span>
          </button>
        </div>
      </div>

      {/* ACTIVE STAGE CARD (THE HERO INTERACTION) */}
      {activeStop ? (
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all duration-300 ${
          activeStop.status === 'traveling'
            ? 'bg-gradient-to-b from-blue-950/60 to-brand-surface border-blue-500/60 glow-travel'
            : activeStop.status === 'servicing'
            ? 'bg-gradient-to-b from-emerald-950/60 to-brand-surface border-emerald-500/60 glow-active'
            : 'bg-gradient-to-b from-amber-950/60 to-brand-surface border-amber-500/60'
        }`}>
          {/* Header pill */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              activeStop.status === 'traveling'
                ? 'bg-blue-900/80 text-blue-300 border-blue-500/50'
                : activeStop.status === 'servicing'
                ? 'bg-emerald-900/80 text-emerald-300 border-emerald-500/50'
                : 'bg-amber-900/80 text-amber-300 border-amber-500/50'
            }`}>
              {activeStop.isReturnToBase
                ? 'Retorno à Base / Empresa'
                : activeStop.status === 'traveling'
                ? '🚗 Em Deslocamento'
                : activeStop.status === 'arrived'
                ? '📍 No Local (Aguardando)'
                : '💼 Em Atendimento'}
            </span>

            <span className="text-xs text-slate-400">
              {activeStop.isReturnToBase ? 'Destino Final' : `Parada #${activeStop.position}`}
            </span>
          </div>

          {/* Client Destination Info */}
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {activeStop.isReturnToBase ? 'Empresa / Sede' : activeStop.client?.name}
            </h2>
            <div className="flex items-start gap-1.5 text-sm text-slate-300 mt-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>{activeStop.isReturnToBase ? 'Retornando à base de encerramento' : activeStop.client?.address}</span>
            </div>
            {activeStop.client?.phone && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <a href={`tel:${activeStop.client.phone}`} className="underline font-semibold">
                  {activeStop.client.phone}
                </a>
              </div>
            )}
            {activeStop.client?.notes && (
              <div className="mt-3 p-3 bg-brand-bg/80 border border-brand-border rounded-xl text-xs text-slate-300 flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Acesso:</strong> {activeStop.client.notes}</span>
              </div>
            )}
          </div>

          {/* LARGE STOPWATCH DISPLAY */}
          <div className="my-6 sm:my-8 text-center bg-brand-bg/90 border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-inner">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
              {activeStop.status === 'traveling'
                ? 'Tempo em Deslocamento'
                : activeStop.status === 'servicing'
                ? 'Tempo em Atendimento'
                : 'Aguardando Início do Atendimento'}
            </span>
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white select-all">
              {activeStop.status === 'arrived' ? '--:--:--' : timerDisplay}
            </div>
            <span className="text-xs text-slate-500 mt-2 block">
              Baseado em timestamps reais (calcula mesmo com tela bloqueada)
            </span>
          </div>

          {/* GIANT ACTION BUTTON */}
          <div className="space-y-3">
            {activeStop.status === 'traveling' && !activeStop.isReturnToBase && (
              <button
                onClick={() => handleArrive(activeStop)}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                <span>Cheguei ao Cliente</span>
              </button>
            )}

            {activeStop.status === 'traveling' && activeStop.isReturnToBase && (
              <button
                onClick={() => handleFinishReturn(activeStop)}
                disabled={isFinishing}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                <span>Cheguei à Empresa / Finalizar Jornada</span>
              </button>
            )}

            {activeStop.status === 'arrived' && (
              <button
                onClick={() => handleStartService(activeStop)}
                className="w-full py-4 px-6 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>Iniciar Atendimento</span>
              </button>
            )}

            {activeStop.status === 'servicing' && (
              <button
                onClick={() => handleOpenFinishService(activeStop)}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                <span>Finalizar Atendimento</span>
              </button>
            )}

            {/* Secondary actions: Skip stop */}
            {!activeStop.isReturnToBase && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => handleSkipStop(activeStop)}
                  className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Não foi possível atender (Pular visita)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : nextPendingStop ? (
        /* NO ACTIVE STOP, PROMPT TO START NEXT TRAVEL */
        <div className="p-6 sm:p-8 bg-brand-surface border border-brand-primary/50 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-950 text-sky-400 border border-blue-500/40">
              Próxima Etapa
            </span>
            <span className="text-xs text-slate-400">
              {nextPendingStop.isReturnToBase ? 'Encerramento' : `Parada #${nextPendingStop.position}`}
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white">
              {nextPendingStop.isReturnToBase ? 'Retornar à Empresa' : nextPendingStop.client?.name}
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              {nextPendingStop.isReturnToBase ? 'Encerre o dia voltando à sede' : nextPendingStop.client?.address}
            </p>
          </div>

          <button
            onClick={() => handleStartTravel(nextPendingStop)}
            className="w-full py-4 px-6 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            <Navigation className="w-6 h-6" />
            <span>
              {nextPendingStop.isReturnToBase ? 'Iniciar Retorno à Empresa' : 'Iniciar Deslocamento'}
            </span>
          </button>
        </div>
      ) : null}

      {/* PENDING VISITS QUEUE WITH REORDERING */}
      {pendingStops.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Próximas Visitas na Fila ({pendingStops.filter(s => !s.isReturnToBase).length})
            </h3>
            <span className="text-xs text-slate-400">Reordene as visitas pendentes se necessário</span>
          </div>

          <div className="space-y-2">
            {pendingStops
              .filter(s => !s.isReturnToBase)
              .map((stop, idx) => (
                <div
                  key={stop.id}
                  className="p-3.5 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-between gap-3 shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{stop.client?.name}</h4>
                      <p className="text-xs text-slate-400">{stop.client?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMovePendingStop(idx, 'up')}
                      disabled={idx === 0}
                      title="Mover para cima"
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMovePendingStop(idx, 'down')}
                      disabled={idx === pendingStops.filter(s => !s.isReturnToBase).length - 1}
                      title="Mover para baixo"
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* COMPLETED VISITS SUMMARY */}
      {completedStops.length > 0 && (
        <div className="space-y-3 border-t border-brand-border/60 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Visitas Já Realizadas Hoje ({completedStops.filter(s => !s.isReturnToBase).length})
          </h3>
          <div className="space-y-2">
            {completedStops
              .filter(s => !s.isReturnToBase)
              .map(stop => (
                <div
                  key={stop.id}
                  className="p-3 bg-brand-surface/40 border border-brand-border/40 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-slate-200">{stop.client?.name}</span>
                  </div>
                  <span className="text-slate-400">
                    {stop.serviceEndedAt ? formatTime24h(stop.serviceEndedAt) : 'Concluído'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Emergency Client Modal */}
      <Modal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        title="Adicionar Cliente Urgente"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              O cliente será incluído imediatamente na fila de visitas de hoje sem interromper a medição atual.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Selecione o Cliente
            </label>
            <select
              value={emergencyClientId}
              onChange={e => setEmergencyClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
            >
              {availableClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.address}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Tempo Previsto de Atendimento (minutos)
            </label>
            <input
              type="number"
              min="5"
              max="240"
              value={emergencyMinutes}
              onChange={e => setEmergencyMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-brand-border">
            <button
              onClick={() => setIsEmergencyModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddEmergencyStop}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Adicionar à Fila
            </button>
          </div>
        </div>
      </Modal>

      {/* Service Notes Finish Modal */}
      <Modal
        isOpen={!!notesModalStop}
        onClose={() => setNotesModalStop(null)}
        title="Finalizar Atendimento"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Deseja registrar alguma observação ou ocorrência sobre o atendimento em{' '}
            <strong>{notesModalStop?.client?.name}</strong>?
          </p>

          <div>
            <textarea
              rows={3}
              value={stopNotes}
              onChange={e => setStopNotes(e.target.value)}
              placeholder="Ex: Pedido entregue, assinado por Carlos, tudo conforme combinado..."
              className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setNotesModalStop(null)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirmFinishService}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-colors"
            >
              Confirmar Conclusão
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
