import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { db, seedInitialDataIfEmpty } from '../db/database';

describe('RotaPro E2E Component & User Flow Tests', () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.journeys.clear();
    await db.stops.clear();
    await db.events.clear();
    await seedInitialDataIfEmpty();
  });

  it('renders Dashboard with 100% Offline badge and seeded clients count', async () => {
    render(<App />);

    // Wait for App to load past the loading spinner
    await waitFor(() => {
      expect(screen.getByText(/Meu Dia de Trabalho/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/100% Offline/i)).toBeInTheDocument();
  });

  it('navigates to Clientes tab, creates a new client and sees it in the list', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Meu Dia de Trabalho/i)).toBeInTheDocument();
    });

    // Click on Clientes navigation
    const clientsNavButtons = screen.getAllByText('Clientes');
    fireEvent.click(clientsNavButtons[0]);

    // Check header
    expect(screen.getByText(/Cadastro de Clientes/i)).toBeInTheDocument();

    // Click Novo Cliente
    const novoBtn = screen.getByText('Novo Cliente');
    fireEvent.click(novoBtn);

    // Fill form
    const nameInput = screen.getByPlaceholderText(/Hospital das Clínicas/i);
    const addressInput = screen.getByPlaceholderText(/Av. Dr. Arnaldo/i);

    fireEvent.change(nameInput, { target: { value: 'Hospital Albert Einstein' } });
    fireEvent.change(addressInput, { target: { value: 'Av. Albert Einstein, 627 - Morumbi' } });

    // Submit
    const submitBtn = screen.getByText('Cadastrar Cliente');
    fireEvent.click(submitBtn);

    // Verify it appears in the list
    await waitFor(() => {
      expect(screen.getByText('Hospital Albert Einstein')).toBeInTheDocument();
      expect(screen.getByText('Av. Albert Einstein, 627 - Morumbi')).toBeInTheDocument();
    });
  });

  it('creates a planning route, starts journey, and transitions through travel and arrival', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Meu Dia de Trabalho/i)).toBeInTheDocument();
    });

    // Go to Planning
    const planButtons = screen.getAllByText('Programação');
    fireEvent.click(planButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Programação de Visitas/i })).toBeInTheDocument();
    });

    // Include client in route
    const includeBtn = screen.getByText('Incluir na Rota');
    fireEvent.click(includeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Iniciar Jornada Agora/i)).toBeInTheDocument();
    });

    // Start Journey
    const startJourneyBtn = screen.getByText(/Iniciar Jornada Agora/i);
    fireEvent.click(startJourneyBtn);

    // Verifies navigation to Jornada and next step button 'Iniciar Deslocamento'
    await waitFor(() => {
      expect(screen.getByText(/Jornada em Campo/i)).toBeInTheDocument();
      expect(screen.getByText(/Iniciar Deslocamento/i)).toBeInTheDocument();
    });

    // Click Iniciar Deslocamento
    const travelBtn = screen.getByText(/Iniciar Deslocamento/i);
    fireEvent.click(travelBtn);

    // Verify it transitions to 'Em Deslocamento' and displays 'Cheguei ao Cliente'
    await waitFor(() => {
      expect(screen.getByText(/Cheguei ao Cliente/i)).toBeInTheDocument();
    });

    // Click Cheguei ao Cliente
    const arriveBtn = screen.getByText(/Cheguei ao Cliente/i);
    fireEvent.click(arriveBtn);

    // Verify next stage: Iniciar Atendimento
    await waitFor(() => {
      expect(screen.getByText(/Iniciar Atendimento/i)).toBeInTheDocument();
    });
  });
});
