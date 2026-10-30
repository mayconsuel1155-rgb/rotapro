import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Clock, 
  Archive, 
  ArchiveRestore, 
  Edit3, 
  Trash2, 
  History,
  FileText
} from 'lucide-react';
import type { Client, JourneyStop } from '../../types';
import { clientRepository } from '../../db/repositories/clientRepository';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatDurationHuman, formatDateBr, formatTime24h } from '../../domain/time/timeService';

interface ClientFormData {
  name: string;
  address: string;
  phone: string;
  notes: string;
  defaultServiceMinutes: number;
}

const emptyForm: ClientFormData = {
  name: '',
  address: '',
  phone: '',
  notes: '',
  defaultServiceMinutes: 30
};

export function ClientsView() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'active' | 'archived' | 'all'>('active');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);

  // History modal
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [clientStops, setClientStops] = useState<JourneyStop[]>([]);

  const loadClients = async () => {
    const all = await clientRepository.getAll(true);
    setClients(all);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Filter by archive state
      if (filterMode === 'active' && c.archivedAt) return false;
      if (filterMode === 'archived' && !c.archivedAt) return false;

      // Filter by search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    });
  }, [clients, filterMode, searchQuery]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      address: client.address,
      phone: client.phone || '',
      notes: client.notes || '',
      defaultServiceMinutes: client.defaultServiceMinutes || 30
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('O nome do cliente é obrigatório!', 'error');
      return;
    }
    if (!formData.address.trim()) {
      showToast('O endereço do cliente é obrigatório!', 'error');
      return;
    }

    try {
      if (editingClient) {
        await clientRepository.update(editingClient.id, {
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          defaultServiceMinutes: Number(formData.defaultServiceMinutes) || 30
        });
        showToast('Cliente atualizado com sucesso!', 'success');
      } else {
        await clientRepository.create({
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          defaultServiceMinutes: Number(formData.defaultServiceMinutes) || 30
        });
        showToast('Cliente cadastrado com sucesso!', 'success');
      }
      setIsFormOpen(false);
      loadClients();
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  const handleToggleArchive = async (client: Client) => {
    if (client.archivedAt) {
      await clientRepository.unarchive(client.id);
      showToast(`Cliente "${client.name}" desarquivado!`, 'success');
    } else {
      await clientRepository.archive(client.id);
      showToast(`Cliente "${client.name}" arquivado.`, 'info');
    }
    loadClients();
  };

  const handleDelete = async (client: Client) => {
    if (window.confirm(`Deseja realmente remover o cliente "${client.name}"?`)) {
      const physicallyDeleted = await clientRepository.delete(client.id);
      if (physicallyDeleted) {
        showToast('Cliente excluído.', 'info');
      } else {
        showToast('Cliente possui histórico de visitas; ele foi arquivado em vez de excluído para preservar os dados.', 'info');
      }
      loadClients();
    }
  };

  const handleOpenHistory = async (client: Client) => {
    setHistoryClient(client);
    const stops = await clientRepository.getVisitHistory(client.id);
    setClientStops(stops);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <span>Cadastro de Clientes</span>
          </h2>
          <p className="text-sm text-slate-400">
            Gerencie os locais e clientes para suas rotas e atendimentos
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, endereço ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="flex gap-1.5 p-1 bg-brand-surface border border-brand-border rounded-xl shrink-0">
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'active' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ativos ({clients.filter(c => !c.archivedAt).length})
          </button>
          <button
            onClick={() => setFilterMode('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'archived' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Arquivados ({clients.filter(c => c.archivedAt).length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterMode === 'all' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({clients.length})
          </button>
        </div>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center bg-brand-surface/50 border border-brand-border rounded-2xl">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Nenhum cliente encontrado</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Nenhum resultado corresponde à sua pesquisa. Tente outros termos.'
              : 'Você ainda não cadastrou nenhum cliente. Comece adicionando o primeiro cliente!'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-medium hover:bg-brand-primaryHover transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map(client => (
            <div
              key={client.id}
              className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                client.archivedAt
                  ? 'bg-brand-surface/40 border-brand-border/40 opacity-75'
                  : 'bg-brand-surface border-brand-border hover:border-slate-600 shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-base leading-snug">
                        {client.name}
                      </h3>
                      {client.archivedAt && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 border border-amber-600/50 text-amber-300">
                          Arquivado
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-slate-300 mt-2 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{client.address}</span>
                    </div>

                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}

                    {client.notes && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-400 mt-2 p-2 bg-brand-bg/60 rounded-lg border border-brand-border/60">
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="italic">{client.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer with Details and Actions */}
              <div className="flex items-center justify-between border-t border-brand-border/60 pt-3 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Padrão: <strong>{client.defaultServiceMinutes || 30} min</strong></span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenHistory(client)}
                    title="Histórico de visitas deste cliente"
                    className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-brand-bg rounded-lg transition-colors"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(client)}
                    title="Editar cliente"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-brand-bg rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(client)}
                    title={client.archivedAt ? 'Desarquivar cliente' : 'Arquivar cliente'}
                    className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-brand-bg rounded-lg transition-colors"
                  >
                    {client.archivedAt ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    title="Excluir cliente"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-brand-bg rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nome do Cliente / Empresa *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Hospital das Clínicas"
              className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Endereço Completo *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ex: Av. Dr. Arnaldo, 455 - Cerqueira César"
              className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Telefone (Opcional)
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Tempo Previsto Padrão
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={formData.defaultServiceMinutes}
                  onChange={e => setFormData({ ...formData, defaultServiceMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                />
                <span className="text-xs text-slate-400 shrink-0">minutos</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Observações / Instruções de Acesso
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Portaria 2, falar com supervisor, estacionamento gratuito nos fundos..."
              className="w-full px-3.5 py-2.5 bg-brand-input border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-colors"
            >
              {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Visit History Modal */}
      <Modal
        isOpen={!!historyClient}
        onClose={() => setHistoryClient(null)}
        title={`Histórico: ${historyClient?.name || ''}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-bg rounded-xl border border-brand-border text-xs text-slate-300">
            <p><strong>Endereço:</strong> {historyClient?.address}</p>
            {historyClient?.phone && <p className="mt-1"><strong>Telefone:</strong> {historyClient?.phone}</p>}
          </div>

          <h4 className="text-sm font-semibold text-white">
            Visitas Concluídas ({clientStops.length})
          </h4>

          {clientStops.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhuma visita registrada ainda para este cliente.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {clientStops.map((stop, idx) => {
                const serviceDuration = stop.serviceStartedAt && stop.serviceEndedAt
                  ? Math.floor((new Date(stop.serviceEndedAt).getTime() - new Date(stop.serviceStartedAt).getTime()) / 1000)
                  : 0;

                return (
                  <div key={stop.id} className="p-3 bg-brand-bg rounded-xl border border-brand-border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Visita #{clientStops.length - idx}</span>
                      <span className="text-slate-400">
                        {formatDateBr(stop.serviceEndedAt || stop.travelStartedAt)} às {formatTime24h(stop.serviceEndedAt || stop.travelStartedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-300 pt-1">
                      <span>Duração atendimento: <strong>{formatDurationHuman(serviceDuration)}</strong></span>
                    </div>
                    {stop.notes && (
                      <p className="text-slate-400 italic pt-1 border-t border-brand-border/40 mt-1">
                        "{stop.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
