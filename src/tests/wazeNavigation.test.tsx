import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JourneyExecutionView } from '../features/journey/JourneyExecutionView';
import { ToastProvider } from '../components/ui/Toast';
import { db } from '../db/database';
import { journeyRepository } from '../db/repositories/journeyRepository';
import type { EnrichedJourney } from '../types';

describe('navegação no Waze durante a jornada', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.clients.clear();
    await db.journeys.clear();
    await db.stops.clear();
    await db.events.clear();
    const now = new Date().toISOString();
    await db.clients.bulkPut([
      { id: 'normal', name: 'Cliente Normal', address: 'Rua São João, 10 - São Paulo, SP', createdAt: now, updatedAt: now },
      { id: 'urgent', name: 'Cliente Urgente', address: 'Av. Saúde & Paz, 200 - São Paulo, SP', createdAt: now, updatedAt: now }
    ]);
    await db.journeys.put({ id: 'journey', date: now.slice(0, 10), status: 'in_progress', startedAt: now, createdAt: now, updatedAt: now });
    await db.stops.put({ id: 'return', journeyId: 'journey', clientId: 'return_to_base', isReturnToBase: true, position: 1, status: 'traveling', travelStartedAt: now });
  });

  function view(journey: EnrichedJourney, onRefresh = vi.fn()) {
    return <ToastProvider><JourneyExecutionView journey={journey} onRefresh={onRefresh} onNavigateToPlanning={vi.fn()} onNavigateToReports={vi.fn()} /></ToastProvider>;
  }

  function destination() {
    const link = screen.getByRole('link', { name: 'Abrir no Waze' });
    const url = new URL(link.getAttribute('href')!);
    expect(url.origin).toBe('https://waze.com');
    expect(url.searchParams.get('navigate')).toBe('yes');
    return url.searchParams.get('q');
  }

  it('salva o destino da empresa para o retorno, inclusive ao reabrir a jornada', async () => {
    const journey = (await journeyRepository.getEnrichedById('journey'))!;
    const rendered = render(view(journey));
    expect(screen.queryByRole('link', { name: 'Abrir no Waze' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Waze · Endereço da empresa'));
    fireEvent.change(screen.getByLabelText('Endereço completo para o retorno'), { target: { value: '  Rua da Empresa, 50 - Santos, SP  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar endereço da empresa' }));
    expect(destination()).toBe('Rua da Empresa, 50 - Santos, SP');
    rendered.unmount();
    render(view(journey));
    expect(destination()).toBe('Rua da Empresa, 50 - Santos, SP');
  });

  it('troca o destino da empresa pelo cliente quando surge uma emergência durante o retorno', async () => {
    localStorage.setItem('rotapro-company-address', 'Rua da Empresa, 50 - Santos, SP');
    const refresh = vi.fn();
    const rendered = render(view((await journeyRepository.getEnrichedById('journey'))!, refresh));
    expect(destination()).toBe('Rua da Empresa, 50 - Santos, SP');
    fireEvent.click(screen.getByRole('button', { name: 'Desviar para Emergência' }));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'urgent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Desviar e Iniciar Deslocamento' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    rendered.rerender(view((await journeyRepository.getEnrichedById('journey'))!, refresh));
    expect(destination()).toBe('Av. Saúde & Paz, 200 - São Paulo, SP');
    expect(screen.getByRole('button', { name: 'Cheguei ao Cliente' })).toBeInTheDocument();
    expect((await db.journeys.get('journey'))?.status).toBe('in_progress');
  });

  it('oferece o destino do cliente somente depois de iniciar o deslocamento', async () => {
    await db.stops.clear();
    await db.stops.put({ id: 'visit', journeyId: 'journey', clientId: 'normal', position: 1, status: 'pending' });
    const refresh = vi.fn();
    const rendered = render(view((await journeyRepository.getEnrichedById('journey'))!, refresh));
    expect(screen.queryByRole('link', { name: 'Abrir no Waze' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Deslocamento' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    rendered.rerender(view((await journeyRepository.getEnrichedById('journey'))!, refresh));
    expect(destination()).toBe('Rua São João, 10 - São Paulo, SP');
  });
});
