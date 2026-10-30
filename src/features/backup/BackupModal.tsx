import React, { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { backupRepository } from '../../db/repositories/backupRepository';
import { seedInitialDataIfEmpty } from '../../db/database';
import { useToast } from '../../components/ui/Toast';
import { Download, Upload, Trash2, RefreshCw, AlertTriangle, ShieldCheck, HardDrive } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export function BackupModal({ isOpen, onClose, onDataChanged }: BackupModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const backup = await backupRepository.exportData();
      backupRepository.downloadBackupFile(backup);
      showToast('Backup exportado com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao exportar backup: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!backupRepository.validateBackupFile(parsed)) {
        showToast('Arquivo de backup inválido ou incompatível!', 'error');
        return;
      }

      const confirmMsg = importMode === 'replace'
        ? 'Atenção: A restauração com substituição irá apagar os dados locais atuais e carregar os dados do arquivo. Deseja continuar?'
        : 'Os dados do arquivo serão mesclados com os dados atuais. Deseja continuar?';

      if (!window.confirm(confirmMsg)) {
        return;
      }

      const result = await backupRepository.importData(parsed, importMode);
      showToast(`Backup restaurado: ${result.clientsCount} clientes, ${result.journeysCount} jornadas!`, 'success');
      onDataChanged();
      onClose();
    } catch (err: any) {
      showToast('Falha na importação: ' + (err.message || 'Arquivo corrompido'), 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('ATENÇÃO: Deseja realmente apagar TODOS os dados do RotaPro neste dispositivo? Essa ação não pode ser desfeita.')) {
      await backupRepository.clearAllData();
      showToast('Todos os dados foram excluídos.', 'info');
      onDataChanged();
    }
  };

  const handleResetSeed = async () => {
    if (window.confirm('Deseja recarregar os clientes de exemplo padrão do sistema?')) {
      await seedInitialDataIfEmpty();
      showToast('Exemplos carregados com sucesso!', 'success');
      onDataChanged();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backup e Dados Locais" maxWidth="max-w-md">
      <div className="space-y-6">
        {/* Offline info notice */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-700/60 rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Seus dados são <strong>100% privados e locais</strong>. O RotaPro não envia nada para a internet. 
            Exporte cópias periódicas para proteger seus registros em caso de perda ou troca de aparelho.
          </p>
        </div>

        {/* Export section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            <span>Exportar Dados (Backup)</span>
          </h4>
          <p className="text-xs text-slate-400">
            Baixa um arquivo JSON seguro com todos os clientes, jornadas, cronômetros e histórico.
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 transition-colors disabled:opacity-50"
          >
            <HardDrive className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Exportar Arquivo de Backup'}</span>
          </button>
        </div>

        <div className="border-t border-brand-border" />

        {/* Import section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Restaurar Backup</span>
          </h4>
          
          <div className="flex gap-2">
            <label className="flex-1 flex items-center gap-2 p-2.5 rounded-lg border border-brand-border bg-brand-bg text-xs cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-brand-primary"
              />
              <span className="text-white">Substituir tudo</span>
            </label>
            <label className="flex-1 flex items-center gap-2 p-2.5 rounded-lg border border-brand-border bg-brand-bg text-xs cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="text-brand-primary"
              />
              <span className="text-white">Mesclar dados</span>
            </label>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Lendo arquivo...' : 'Selecionar Arquivo JSON'}</span>
          </button>
        </div>

        <div className="border-t border-brand-border" />

        {/* Advanced / Maintenance */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ações Rápidas
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleResetSeed}
              className="flex-1 py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-brand-border"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Clientes Padrão</span>
            </button>
            <button
              onClick={handleClearAll}
              className="py-2 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
