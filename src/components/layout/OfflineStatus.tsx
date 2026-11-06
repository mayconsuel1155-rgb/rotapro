import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { getSyncStatus, subscribeSync, startLocalSync, syncNow, resolveConflict } from '../../services/localSync';

export function OfflineStatus() {
  const [expanded, setExpanded] = useState(false);
  const [pairingKey, setPairingKey] = useState(() => localStorage.getItem('rotapro-pairing-key') || '');
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [installedOffline, setInstalledOffline] = useState(false);
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, sw) { setRegistration(sw); },
    onRegisterError() { setError('Não foi possível preparar o uso offline. Abra por HTTPS com certificado confiável.'); },
  });
  useEffect(() => startLocalSync(), []);
  useEffect(() => {
    if (!registration) return;
    void navigator.serviceWorker.ready.then(() => {
      setInstalledOffline(true);
      void navigator.storage?.persist?.().catch(() => {});
    });
    const check = () => {
      if (document.visibilityState === 'visible') void registration.update().catch(() => {});
    };
    const timer = window.setInterval(check, 60000);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      clearInterval(timer); window.removeEventListener('online', check); window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [registration]);
  const secure = window.isSecureContext;
  const available = offlineReady || installedOffline;
  const savePairing = () => {
    localStorage.setItem('rotapro-pairing-key', pairingKey.trim());
    void syncNow();
  };
  return (
    <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3 text-xs" aria-label="Uso offline e sincronização">
      <div className="rounded-xl border border-brand-border bg-brand-surface p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span role="status" className="text-slate-300">{!secure ? 'Instalação offline requer HTTPS confiável.' : import.meta.env.DEV ? 'Modo de desenvolvimento: use a versão instalada para trabalhar offline.' : available ? 'Disponível offline neste aparelho' : 'Preparando uso offline…'}</span>
          <button className="text-sky-300 underline" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>Sincronização {sync.conflicts.length ? `(${sync.conflicts.length} conflitos)` : ''}</button>
        </div>
        {error && <p role="alert" className="text-amber-300">{error}</p>}
        {needRefresh && <div className="flex flex-wrap items-center gap-3 text-sky-200"><span>Nova versão baixada. Salve o que está preenchendo antes de atualizar.</span><button className="rounded-lg bg-brand-primary px-3 py-2 text-white" onClick={() => void updateServiceWorker(true).catch(() => setError('Não foi possível aplicar a atualização. Tente novamente.'))}>Atualizar aplicativo</button></div>}
        {expanded && <div className="space-y-3 text-slate-300">
          <p>Trabalhe sem o computador. Para trocar dados, ligue o servidor, conecte os aparelhos à mesma rede e abra o app. A verificação ocorre a cada 30 segundos enquanto ele está aberto.</p>
          <label className="block space-y-1"><span>Código de pareamento exibido no terminal do computador</span><input type="password" autoComplete="off" value={pairingKey} onChange={e => setPairingKey(e.target.value)} className="block w-full rounded-lg bg-brand-bg border border-brand-border p-2 text-white" /></label>
          <button disabled={sync.busy || !pairingKey.trim() || !import.meta.env.PROD} onClick={savePairing} className="rounded-lg bg-brand-primary px-3 py-2 text-white disabled:opacity-50">{sync.busy ? 'Sincronizando…' : 'Conectar e sincronizar agora'}</button>
          <p role="status">{sync.message}</p>
          {sync.lastSync && <p>Última sincronização: {new Date(sync.lastSync).toLocaleString('pt-BR')}</p>}
          {sync.conflicts.map(conflict => <div key={conflict.key} className="rounded-lg border border-amber-500/50 p-3 space-y-2">
            <p>Alterações diferentes em: {conflict.key}. {conflict.local && 'name' in conflict.local ? conflict.local.name : conflict.local && 'journey' in conflict.local ? conflict.local.journey.date : 'Registro excluído neste aparelho'}.</p>
            <details><summary className="cursor-pointer text-sky-300">Comparar versões</summary><p>Este aparelho:</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(conflict.local, null, 2)}</pre><p>Computador:</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(conflict.remote.value, null, 2)}</pre></details>
            <p>A versão escolhida substituirá a outra na próxima sincronização.</p>
            <div className="flex flex-wrap gap-2">{(['local', 'remote'] as const).map(source => <button disabled={sync.busy} key={source} className="rounded-lg border border-brand-border px-3 py-2" onClick={() => { if (window.confirm('Confirmar a substituição deste registro pela versão escolhida?')) void resolveConflict(conflict, source).catch(() => setError('Não foi possível resolver o conflito. Tente novamente.')); }}>Manter {source === 'local' ? 'deste aparelho' : 'do computador'}</button>)}</div>
          </div>)}
        </div>}
      </div>
    </section>
  );
}
