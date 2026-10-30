import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  MapPin, 
  Play, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { Client, EnrichedJourney } from '../../types';
import { clientRepository } from '../../db/repositories/clientRepository';
import { journeyRepository } from '../../db/repositories/journeyRepository';
import { useToast } from '../../components/ui/Toast';
import { formatDurationHuman } from '../../domain/time/timeService';

interface PlanningItem {
  id: string; // temp id
  client: Client;
  plannedMinutes: number;
}

interface PlanningViewProps {
  activeJourney?: EnrichedJourney;
  onJourneyStarted: () => void;
  onNavigateToJourney: () => void;
}

export function PlanningView({
  activeJourney,
  onJourneyStarted,
  onNavigateToJourney
}: PlanningViewProps) {
  const { showToast } = useToast();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const clients = await clientRepository.getAll(false);
      setAllClients(clients);
      if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id);
      }
    };
    load();
  }, []);

  const handleAddStop = () => {
    if (!selectedClientId) return;
    const client = allClients.find(c => c.id === selectedClientId);
    if (!client) return;

    // Check if client is already in the list to avoid accidental duplicates
    const alreadyExists = planningItems.some(item => item.client.id === client.id);
    if (alreadyExists) {
      if (!window.confirm(`O cliente "${client.name}" já está na programação de hoje. Deseja incluí-lo novamente?`)) {
        return;
      }
    }

    setPlanningItems(prev => [
      ...prev,
      {
        id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        client,
        plannedMinutes: client.defaultServiceMinutes || 30
      }
    ]);
  };

  const handleRemoveStop = (id: string) => {
    setPlanningItems(prev => prev.filter(item => item.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setPlanningItems(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === planningItems.length - 1) return;
    setPlanningItems(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleUpdateMinutes = (id: string, mins: number) => {
    setPlanningItems(prev =>
      prev.map(item => item.id === id ? { ...item, plannedMinutes: Math.max(5, mins) } : item)
    );
  };

  const totalPlannedMinutes = planningItems.reduce((acc, item) => acc + item.plannedMinutes, 0);

  const handleConfirmAndStart = async () => {
    if (planningItems.length === 0) {
      showToast('Adicione pelo menos um cliente para programar a jornada!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const journeyId = await journeyRepository.createDailyPlanning(
        planningItems.map(item => ({
          clientId: item.client.id,
          plannedServiceMinutes: item.plannedMinutes
        }))
      );

      // Start journey immediately
      await journeyRepository.startJourney(journeyId);
      showToast('Jornada criada e iniciada com sucesso!', 'success');
      onJourneyStarted();
      onNavigateToJourney();
    } catch (err: any) {
      showToast('Erro ao iniciar jornada: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If a journey is already in progress, show alert and shortcut
  if (activeJourney?.status === 'in_progress') {
    return (
      <div className="p-8 bg-brand-surface border border-emerald-500/40 rounded-2xl text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
          <Play className="w-8 h-8 fill-current" />
        </div>
        <h3 className="text-xl font-bold text-white">Jornada em Andamento!</h3>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          Você já possui uma jornada iniciada hoje com {activeJourney.stops.filter(s => !s.isReturnToBase).length} atendimentos programados.
        </p>
        <button
          onClick={onNavigateToJourney}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Ir para a Tela de Execução da Jornada</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-sky-400" />
          <span>Programação de Visitas</span>
        </h2>
        <p className="text-sm text-slate-400">
          Selecione e ordene os clientes que serão visitados no seu dia de trabalho
        </p>
      </div>

      {/* Select and Add Client Bar */}
      <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Adicionar Cliente à Programação
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
          >
            {allClients.length === 0 ? (
              <option value="">Nenhum cliente cadastrado</option>
            ) : (
              allClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.address}
                </option>
              ))
            )}
          </select>

          <button
            onClick={handleAddStop}
            disabled={allClients.length === 0}
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Incluir na Rota</span>
          </button>
        </div>
      </div>

      {/* Planned Stops List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Sequência de Visitas ({planningItems.length})
          </h3>

          {planningItems.length > 0 && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Tempo estimado em atendimento: <strong>{formatDurationHuman(totalPlannedMinutes * 60)}</strong></span>
            </div>
          )}
        </div>

        {planningItems.length === 0 ? (
          <div className="p-10 text-center bg-brand-surface/40 border border-brand-border rounded-2xl">
            <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">Nenhum cliente na fila de hoje</p>
            <p className="text-xs text-slate-500 mt-1">
              Selecione um cliente acima para montar sua programação de visitas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {planningItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 bg-brand-surface border border-brand-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-sky-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {item.client.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{item.client.address}</span>
                    </div>
                  </div>
                </div>

                {/* Duration and Order buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-border/40">
                  <div className="flex items-center gap-1.5 bg-brand-bg px-2.5 py-1 rounded-lg border border-brand-border">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={item.plannedMinutes}
                      onChange={e => handleUpdateMinutes(item.id, Number(e.target.value))}
                      className="w-12 bg-transparent text-white text-xs font-semibold focus:outline-none text-right"
                    />
                    <span className="text-[11px] text-slate-400">min</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Mover para cima"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 rounded-lg transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === planningItems.length - 1}
                      title="Mover para baixo"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 rounded-lg transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveStop(item.id)}
                      title="Remover da programação"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Final Return to Base Indicator */}
            <div className="p-3.5 bg-brand-bg/80 border border-brand-border/60 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-[10px]">
                  Fim
                </span>
                <span className="font-medium text-slate-300">Retorno à Empresa / Base</span>
              </div>
              <span className="text-[11px] text-slate-500">Última etapa automática</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Card */}
      {planningItems.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-brand-surface to-brand-card border border-brand-primary/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Programação Pronta</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              {planningItems.length} paradas planejadas • Duração estimada de atendimentos: {formatDurationHuman(totalPlannedMinutes * 60)}
            </p>
          </div>

          <button
            onClick={handleConfirmAndStart}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Iniciar Jornada Agora</span>
          </button>
        </div>
      )}
    </div>
  );
}
