import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Navigation, 
  BarChart3, 
  HardDrive,
  WifiOff,
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X
} from 'lucide-react';
import type { EnrichedJourney } from '../../types';
import { Modal } from '../ui/Modal';

export type TabType = 'dashboard' | 'clients' | 'planning' | 'journey' | 'reports';

interface AppLayoutProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeJourney?: EnrichedJourney;
  onOpenBackup: () => void;
  children: React.ReactNode;
}

export function AppLayout({
  currentTab,
  onSelectTab,
  activeJourney,
  onOpenBackup,
  children
}: AppLayoutProps) {
  const isJourneyRunning = activeJourney?.status === 'in_progress';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if running in standalone mode (already installed)
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Meu Dia', icon: LayoutDashboard },
    { id: 'clients' as TabType, label: 'Clientes', icon: Users },
    { id: 'planning' as TabType, label: 'Programação', icon: CalendarCheck },
    { 
      id: 'journey' as TabType, 
      label: 'Jornada', 
      icon: Navigation,
      badge: isJourneyRunning
    },
    { id: 'reports' as TabType, label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-brand-bg/95 backdrop-blur-md border-b border-brand-border px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Visual Official App Icon */}
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-brand-border shrink-0 bg-brand-surface">
              <img 
                src="/icons/icon-192x192.png" 
                alt="RotaPro Ícone" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to SVG if PNG fails
                  (e.currentTarget as HTMLImageElement).src = '/favicon.svg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Rota<span className="text-sky-400">Pro</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border text-slate-400">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-brand-muted hidden sm:block">Gestão de Atendimento Externo</p>
            </div>
          </div>

          {/* Center / Right status actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 100% Offline Badge */}
            <div 
              title="Todos os dados ficam armazenados localmente no seu dispositivo. Não requer internet."
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-xs text-slate-300 font-medium"
            >
              <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">100% Offline</span>
            </div>

            {/* Install App Button */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                title="Instalar aplicativo no Android ou Windows"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/50 text-xs text-sky-300 font-semibold transition-all hover:scale-105"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar App</span>
              </button>
            )}

            {/* Active Journey Indicator */}
            {isJourneyRunning && (
              <button
                onClick={() => onSelectTab('journey')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 font-semibold glow-active hover:bg-emerald-900 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Em Andamento</span>
              </button>
            )}

            {/* Backup / Config button */}
            <button
              onClick={onOpenBackup}
              title="Backup, exportação e restauração local"
              className="p-2 text-slate-400 hover:text-white hover:bg-brand-surface border border-transparent hover:border-brand-border rounded-xl transition-all"
            >
              <HardDrive className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex max-w-6xl mx-auto mt-3 gap-2 border-t border-brand-border/60 pt-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-brand-surface'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-bg/95 backdrop-blur-lg border-t border-brand-border px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all min-w-[56px] ${
                  isActive
                    ? 'text-sky-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-brand-bg animate-pulse" />
                  )}
                </div>
                <span className={`text-[11px] mt-1 font-medium ${isActive ? 'text-sky-300 font-bold' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-1 rounded-full bg-sky-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Install App Guidance Modal */}
      <Modal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        title="Instalar RotaPro no seu Dispositivo"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-brand-bg rounded-xl border border-brand-border">
            <img src="/icons/icon-192x192.png" alt="RotaPro" className="w-12 h-12 rounded-xl shrink-0" />
            <div>
              <h4 className="font-bold text-white text-sm">RotaPro - App Offline</h4>
              <p className="text-xs text-slate-400">Instale direto pelo navegador, sem necessidade de app store.</p>
            </div>
          </div>

          {/* Android instructions */}
          <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-2">
            <h5 className="font-semibold text-white text-xs flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Como instalar no Celular (Android)</span>
            </h5>
            <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>Abra esta página no <strong>Google Chrome</strong>.</li>
              <li>Toque no menu de <strong>3 pontinhos</strong> (canto superior direito).</li>
              <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
              <li>Confirme. O ícone do RotaPro aparecerá na grade de aplicativos do seu celular.</li>
            </ol>
          </div>

          {/* Windows instructions */}
          <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-2">
            <h5 className="font-semibold text-white text-xs flex items-center gap-2">
              <Laptop className="w-4 h-4 text-sky-400" />
              <span>Como instalar no Computador (Windows)</span>
            </h5>
            <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>No <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, olhe para o canto direito da barra de endereço (URL).</li>
              <li>Clique no ícone de <strong>instalação</strong> (um computador com uma seta ou sinal de +).</li>
              <li>Clique em <strong>"Instalar"</strong>. O RotaPro abrirá em janela própria e pode ser fixado na Barra de Tarefas.</li>
            </ol>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
