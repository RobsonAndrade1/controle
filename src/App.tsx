/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ControlMode, TvConnectionState, WebOsCommand, AppItem } from './types';
import { webOsService } from './services/webosService';
import { triggerHaptic } from './services/haptics';
import { getSavedShortcuts, saveCustomShortcuts } from './data/appsData';
import { HeaderBar } from './components/HeaderBar';
import { QuickActionPills } from './components/QuickActionPills';
import { CenterController } from './components/CenterController';
import { SystemRow } from './components/SystemRow';
import { StreamingButtons } from './components/StreamingButtons';
import { NumberPadModal } from './components/NumberPadModal';
import { TextInputModal } from './components/TextInputModal';
import { AppsModal } from './components/AppsModal';
import { SettingsModal } from './components/SettingsModal';
import { TvFeedbackToast } from './components/TvFeedbackToast';
import { Wifi, Radio } from 'lucide-react';

export default function App() {
  // Modo atual do centro: 'dpad' (ControllaLG) ou 'touchpad' (LG ThinQ)
  const [controlMode, setControlMode] = useState<ControlMode>('dpad');

  // Estado de conexão com a TV webOS
  const [connectionState, setConnectionState] = useState<TvConnectionState>(webOsService.getState());

  // Atalhos rápidos personalizáveis (3 botões escolhidos na Grade de Apps)
  const [customShortcuts, setCustomShortcuts] = useState<AppItem[]>(getSavedShortcuts());

  // Estados dos modais
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Notificações na tela (HUD Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSub, setToastSub] = useState<string | undefined>(undefined);

  // Preferências
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const unsubscribe = webOsService.subscribe((state) => {
      setConnectionState(state);
    });
    return unsubscribe;
  }, []);

  const showToast = (message: string, sub?: string) => {
    setToastMessage(message);
    setToastSub(sub);
  };

  const handleCommand = async (cmd: WebOsCommand, param?: string | number) => {
    if (hapticsEnabled) {
      triggerHaptic('light', soundEnabled);
    }

    const res = await webOsService.sendCommand(cmd, param);

    if (!res.success) {
      // Falha REAL: mostra o motivo em vez de fingir que funcionou
      showToast(res.reason || 'Não foi possível enviar', res.label);
      return;
    }

    if (cmd === 'mute') {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      showToast(nextMute ? 'Mudo ativado' : 'Mudo desativado');
    } else if (cmd === 'volumeUp' || cmd === 'volumeDown' || cmd === 'channelUp' || cmd === 'channelDown') {
      if (cmd === 'volumeUp' || cmd === 'volumeDown') setIsMuted(false);
      showToast(res.label, 'Enviado');
    } else {
      showToast(res.label, 'Enviado');
    }
  };

  // Comandos de Touchpad
  const handlePointerMove = (dx: number, dy: number) => {
    webOsService.sendPointerMove(dx, dy);
  };

  const handlePointerClick = () => {
    webOsService.sendPointerClick();
    showToast('Clique do Ponteiro (OK)');
  };

  const handleScroll = (dy: number) => {
    webOsService.sendPointerScroll(dy);
    showToast(dy < 0 ? 'Rolar para Cima' : 'Rolar para Baixo', 'Scroll Wheel');
  };

  const handleUpdateShortcuts = (newShortcuts: AppItem[]) => {
    setCustomShortcuts(newShortcuts);
    saveCustomShortcuts(newShortcuts);
  };

  return (
    <main className="min-h-screen bg-[#0e1013] text-neutral-100 flex flex-col items-center justify-center p-0 sm:p-4 selection:bg-cyan-500/30">
      {/* Toast HUD de feedback visual da TV */}
      <TvFeedbackToast message={toastMessage} subMessage={toastSub} />

      {/* Frame do Controle Remoto com background #0e1013 */}
      <div className="w-full max-w-md bg-[#0e1013] min-h-screen sm:min-h-[820px] sm:rounded-[42px] border-0 sm:border sm:border-neutral-800/80 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden relative pb-6 pt-2">
        {/* Barra superior de status estilo Android discreto */}
        <div className="flex items-center justify-between px-6 pt-1 text-[11px] text-neutral-400 font-mono select-none">
          <span className="font-semibold text-neutral-300">MR22GA</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>webOS</span>
            </span>
            <span className="text-neutral-500">•</span>
            <span className={connectionState.isConnected ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
              {connectionState.isConnected ? (connectionState.pointerReady ? 'Conectado' : 'Conectando...') : connectionState.isMockMode ? 'Simulador' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* 1. HeaderBar: Power (vermelho neon), Pílula TV, Configurações da TV (Engrenagem) e Conexão */}
        <HeaderBar
          connectionState={connectionState}
          onPowerPress={() => handleCommand('power')}
          onTvSettingsPress={() => handleCommand('menu')}
          onOpenAppSettings={() => setIsSettingsOpen(true)}
          onScanPress={() => {
            webOsService.scanNetworkForTvs();
            showToast('Buscando TV LG na rede Wi-Fi...', 'Varredura automática');
          }}
          soundEnabled={soundEnabled}
        />

        {/* Banner discreto de status quando desconectado - Busca automática com 1 toque */}
        {!connectionState.isConnected && (
          <div
            id="quick-tv-scan-banner"
            onClick={() => {
              triggerHaptic('medium', soundEnabled);
              webOsService.scanNetworkForTvs();
              showToast('Buscando TV LG na rede...', 'Varredura automática');
            }}
            className="mx-4 mb-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 flex items-center justify-between text-xs cursor-pointer hover:border-cyan-500/50 active:scale-[0.98] transition-all select-none"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connectionState.isScanning ? 'bg-cyan-400 animate-ping' : 'bg-neutral-500'}`} />
              <span className="text-neutral-300 font-medium">
                {connectionState.isScanning
                  ? 'Buscando TV LG na rede Wi-Fi...'
                  : connectionState.isPairing
                  ? 'Conectando à TV LG...'
                  : connectionState.ip
                  ? `Conectar à TV LG (${connectionState.ip})`
                  : 'Toque para buscar TV LG na rede'}
              </span>
              {(connectionState.statusMessage || connectionState.error) && (
                <span className="block text-[10px] text-amber-300 mt-0.5 leading-tight">
                  {connectionState.error || connectionState.statusMessage}
                </span>
              )}
            </div>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              {connectionState.isScanning ? 'Varrendo' : 'Buscar TV'}
            </span>
          </div>
        )}

        {/* 2. Pílulas Superiores: Teclado Virtual, 1 2 3 (Numpad) e Grade de Apps */}
        <QuickActionPills
          onOpenKeyboard={() => setIsKeyboardOpen(true)}
          onOpenNumberPad={() => setIsNumpadOpen(true)}
          onOpenApps={() => setIsAppsOpen(true)}
          soundEnabled={soundEnabled}
        />

        {/* 3. Seção Central: Volume à esquerda, Canais à direita, e no Centro o D-Pad alternando para o Touchpad do LG ThinQ */}
        <CenterController
          mode={controlMode}
          onToggleMode={(newMode) => setControlMode(newMode)}
          onUp={() => handleCommand('up')}
          onDown={() => handleCommand('down')}
          onLeft={() => handleCommand('left')}
          onRight={() => handleCommand('right')}
          onOk={() => handleCommand('ok')}
          onVolumeUp={() => handleCommand('volumeUp')}
          onVolumeDown={() => handleCommand('volumeDown')}
          onMuteToggle={() => handleCommand('mute')}
          onChannelUp={() => handleCommand('channelUp')}
          onChannelDown={() => handleCommand('channelDown')}
          onPointerMove={handlePointerMove}
          onPointerClick={handlePointerClick}
          onScroll={handleScroll}
          soundEnabled={soundEnabled}
        />

        {/* 4. Linha de Sistema: Voltar, Home (webOS), Mudo */}
        <SystemRow
          onBack={() => handleCommand('back')}
          onHome={() => handleCommand('home')}
          onMute={() => handleCommand('mute')}
          isMuted={isMuted}
          soundEnabled={soundEnabled}
        />

        {/* 5. Atalhos Rápidos Personalizáveis (Escolhidos pelo usuário na Grade de Apps) */}
        <StreamingButtons
          shortcuts={customShortcuts}
          onOpenApp={(appId, label) => handleCommand(appId as WebOsCommand)}
          onOpenAppCustomizer={() => setIsAppsOpen(true)}
          soundEnabled={soundEnabled}
        />

        {/* 6. Rodapé: informações do modelo */}
        <div className="px-6 pt-1 flex items-center justify-center select-none">
          <div className="text-[10px] text-neutral-400 font-mono tracking-tight text-center">
            <div className="text-neutral-300">Controle LG Smart</div>
            <div className="text-neutral-400">ANATEL 123321-01925</div>
          </div>
        </div>
      </div>

      {/* Modais da Aplicação */}
      <NumberPadModal
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        onNumberPress={(num) => handleCommand('number', num)}
        onColorPress={(color) => handleCommand(color)}
        onSpecialPress={(action) => {
          if (action === 'LIST') {
            webOsService.sendRawButton('LIST').then((ok) => showToast(ok ? 'Lista de canais' : 'TV desconectada'));
          } else {
            showToast(action, 'Indisponível neste app');
          }
        }}
        soundEnabled={soundEnabled}
      />

      <TextInputModal
        isOpen={isKeyboardOpen}
        onClose={() => setIsKeyboardOpen(false)}
        onSendText={(text) => {
          webOsService.sendTextInput(text).then((ok) =>
            showToast(ok ? `Texto enviado: "${text}"` : 'Falha ao enviar texto', ok ? undefined : 'Abra um campo de texto na TV'),
          );
        }}
        soundEnabled={soundEnabled}
      />

      <AppsModal
        isOpen={isAppsOpen}
        onClose={() => setIsAppsOpen(false)}
        onLaunchApp={(appId, label) => handleCommand(appId as WebOsCommand)}
        shortcuts={customShortcuts}
        onUpdateShortcuts={handleUpdateShortcuts}
        soundEnabled={soundEnabled}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        connectionState={connectionState}
        onConnect={(ip, port) => webOsService.connect(ip, port)}
        onToggleMockMode={(mock) => webOsService.setMockMode(mock)}
        soundEnabled={soundEnabled}
        onToggleSound={(enabled) => setSoundEnabled(enabled)}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={(enabled) => setHapticsEnabled(enabled)}
      />
    </main>
  );
}

