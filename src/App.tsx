import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout, TabType } from './components/layout/AppLayout';
import { DashboardView } from './features/dashboard/DashboardView';
import { ClientsView } from './features/clients/ClientsView';
import { PlanningView } from './features/planning/PlanningView';
import { JourneyExecutionView } from './features/journey/JourneyExecutionView';
import { ReportsView } from './features/reports/ReportsView';
import { BackupModal } from './features/backup/BackupModal';
import { ToastProvider } from './components/ui/Toast';
import { seedInitialDataIfEmpty } from './db/database';
import { journeyRepository } from './db/repositories/journeyRepository';
import { clientRepository } from './db/repositories/clientRepository';
import type { EnrichedJourney } from './types';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [activeJourney, setActiveJourney] = useState<EnrichedJourney | undefined>();
  const [totalClientsCount, setTotalClientsCount] = useState<number>(0);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  const loadAppState = useCallback(async () => {
    try {
      await seedInitialDataIfEmpty();
      const todayJourney = await journeyRepository.getTodayJourney();
      setActiveJourney(todayJourney);

      const clients = await clientRepository.getAll(false);
      setTotalClientsCount(clients.length);
    } catch (e) {
      console.error('Error loading app state:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    loadAppState();
  }, [loadAppState]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-surface border border-brand-primary flex items-center justify-center animate-spin">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
          <p className="text-sm font-semibold text-slate-300">Carregando RotaPro...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      activeJourney={activeJourney}
      onOpenBackup={() => setIsBackupOpen(true)}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          journey={activeJourney}
          totalClientsCount={totalClientsCount}
          onNavigateToPlanning={() => setCurrentTab('planning')}
          onNavigateToJourney={() => setCurrentTab('journey')}
          onNavigateToReports={() => setCurrentTab('reports')}
          onNavigateToClients={() => setCurrentTab('clients')}
        />
      )}

      {currentTab === 'clients' && (
        <ClientsView />
      )}

      {currentTab === 'planning' && (
        <PlanningView
          activeJourney={activeJourney}
          onJourneyStarted={loadAppState}
          onNavigateToJourney={() => setCurrentTab('journey')}
        />
      )}

      {currentTab === 'journey' && (
        <JourneyExecutionView
          journey={activeJourney}
          onRefresh={loadAppState}
          onNavigateToPlanning={() => setCurrentTab('planning')}
          onNavigateToReports={() => setCurrentTab('reports')}
        />
      )}

      {currentTab === 'reports' && (
        <ReportsView />
      )}

      {/* Backup and restore modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataChanged={loadAppState}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
