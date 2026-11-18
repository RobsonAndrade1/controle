import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { webOsService } from '../services/webosService';
import { triggerHaptic } from '../services/haptics';

// Mock dos serviços nativos/rede para isolar o teste da camada de hardware e WebSocket
vi.mock('../services/webosService', () => ({
  webOsService: {
    getState: vi.fn(() => ({
      ip: '',
      port: 3000,
      clientKey: '',
      isConnected: false,
      isPairing: false,
      isScanning: false,
      tvName: '',
      modelName: '',
      statusMessage: 'Desconectado',
      pointerReady: false,
      isMockMode: false,
      discoveredTvs: [],
    })),
    subscribe: vi.fn(() => () => {}),
    sendCommand: vi.fn().mockResolvedValue({ success: true, label: 'Comando' }),
    scanNetworkForTvs: vi.fn().mockResolvedValue([]),
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    sendPointerMove: vi.fn(),
    sendPointerClick: vi.fn(),
    sendScroll: vi.fn(),
    sendText: vi.fn().mockResolvedValue(true),
    sendBackspace: vi.fn().mockResolvedValue(true),
    sendEnterKey: vi.fn().mockResolvedValue(true),
    wakeTv: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/haptics', () => ({
  triggerHaptic: vi.fn(),
}));

describe('Controle LG Smart - Suíte de Testes Principais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o cabeçalho do controle e o estado inicial desconectado', () => {
    render(<App />);

    expect(screen.getByText('MR22GA')).toBeInTheDocument();
    expect(screen.getByText('webOS')).toBeInTheDocument();
    expect(screen.getAllByText('Desconectado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Buscar TV LG/i })).toBeInTheDocument();
  });

  it('deve acionar a varredura automática na rede ao clicar no botão Buscar TV LG', async () => {
    render(<App />);

    const scanButton = screen.getByRole('button', { name: /Buscar TV LG/i });
    fireEvent.click(scanButton);

    expect(triggerHaptic).toHaveBeenCalledWith('medium', true);
    expect(webOsService.scanNetworkForTvs).toHaveBeenCalledTimes(1);
  });

  it('deve exibir o status Conectado e enviar comando com feedback quando a TV estiver conectada', async () => {
    vi.mocked(webOsService.getState).mockReturnValue({
      ip: '192.168.1.100',
      port: 3000,
      clientKey: 'chave-teste-123',
      isConnected: true,
      isPairing: false,
      isScanning: false,
      tvName: 'LG OLED TV',
      modelName: 'OLED55C3',
      statusMessage: 'Conectado à LG OLED TV',
      pointerReady: true,
      isMockMode: false,
      discoveredTvs: [],
    });

    render(<App />);

    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buscar TV LG/i })).not.toBeInTheDocument();

    const powerButton = screen.getByRole('button', { name: /Ligar ou Desligar TV/i });
    fireEvent.click(powerButton);

    await waitFor(() => {
      expect(triggerHaptic).toHaveBeenCalled();
    });
  });
});