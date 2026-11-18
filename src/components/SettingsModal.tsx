import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { X, Wifi, WifiOff, Volume2, VolumeX, Smartphone, Info, RefreshCw, CheckCircle2, Download, Code, Search, Tv } from 'lucide-react';
import { DiscoveredTv, TvConnectionState } from '../types';
import { triggerHaptic } from '../services/haptics';
import { webOsService } from '../services/webosService';
import { PWAInstallSection } from './PWAInstallSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionState: TvConnectionState;
  onConnect: (ip: string, port: number) => Promise<boolean>;
  onToggleMockMode: (mock: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  connectionState,
  onConnect,
  onToggleMockMode,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
}) => {
  const [ipAddress, setIpAddress] = useState(connectionState.ip || '');
  const [port, setPort] = useState(connectionState.port || 3001);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [macInput, setMacInput] = useState('');
  const [macMsg, setMacMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScanNetwork = async () => {
    setIsScanning(true);
    triggerHaptic('medium', soundEnabled);
    setFeedbackMsg('Varrendo a rede local procurando TVs LG webOS...');

    try {
      const tvs = await webOsService.scanNetworkForTvs();
      setIsScanning(false);
      if (tvs.length > 0) {
        setIpAddress(tvs[0].ip);
        setPort(tvs[0].port);
        setFeedbackMsg(`TV Encontrada com sucesso: ${tvs[0].name} (${tvs[0].ip})!`);
        triggerHaptic('heavy', soundEnabled);
      } else {
        setFeedbackMsg('Nenhuma TV LG respondeu via SSDP/Rede. Se a TV estiver no cabo ou Wi-Fi, verifique se está ligada e confirme a opção "LG Connect Apps" na TV.');
      }
    } catch {
      setIsScanning(false);
      setFeedbackMsg('Erro durante a busca de rede.');
    }
  };

  const handleSaveMac = () => {
    const ok = webOsService.setMac(macInput);
    setMacMsg(ok ? 'MAC salvo. Agora o botão Power consegue ligar a TV.' : 'MAC inválido. Use o formato AA:BB:CC:DD:EE:FF.');
    if (ok) setMacInput('');
  };

  const handleDetectMac = async () => {
    setMacMsg('Procurando o MAC na TV...');
    await webOsService.captureMacs(true);
    setMacMsg(webOsService.getMacs().length > 0 ? 'MAC detectado e salvo.' : 'A TV não informou o MAC. Digite-o manualmente.');
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    setIsConnecting(true);
    setFeedbackMsg(null);
    triggerHaptic('medium', soundEnabled);

    const success = await onConnect(ipAddress.trim(), port);
    setIsConnecting(false);

    if (success) {
      setFeedbackMsg('Conectado à TV LG com sucesso!');
    } else {
      setFeedbackMsg(webOsService.getState().error || 'Não foi possível conectar à TV.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e1013] border border-neutral-800 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-neutral-100">Configurações & Conexão</h3>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onClose();
            }}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Atual */}
        <div className="my-4 p-3.5 rounded-2xl bg-black border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionState.isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-neutral-200">
                {connectionState.isConnected ? (connectionState.pointerReady ? 'Conectado à TV (Wi-Fi)' : 'Conectado — abrindo canal de controle...') : connectionState.isMockMode ? 'Modo Simulador (navegador)' : 'Desconectado'}
              </div>
              <div className="text-[11px] text-neutral-400">
                {connectionState.isConnected
                  ? `IP: ${connectionState.ip}`
                  : connectionState.isMockMode ? 'Nada é enviado à TV' : 'Use a busca ou digite o IP abaixo'}
              </div>
            </div>
          </div>

          <button
            style={{ display: connectionState.isMockMode || !Capacitor.isNativePlatform() ? undefined : 'none' }}
            onClick={() => {
              onToggleMockMode(!connectionState.isMockMode);
              triggerHaptic('selection', soundEnabled);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline decoration-dotted"
          >
            {connectionState.isMockMode ? 'Usar TV Real' : 'Simular'}
          </button>
        </div>

        {/* Botão de Busca Automática na Rede (Auto-Discovery) */}
        <div className="mb-3">
          <button
            type="button"
            onClick={handleScanNetwork}
            disabled={isScanning || isConnecting}
            className="w-full py-2.5 px-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Varrendo rede Wi-Fi procurando TVs LG...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Buscar TVs LG na Rede Automaticamente</span>
              </>
            )}
          </button>

          {/* Lista de TVs descobertas se houver */}
          {connectionState.discoveredTvs && connectionState.discoveredTvs.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="text-[11px] font-semibold text-neutral-400">TVs encontradas:</div>
              {connectionState.discoveredTvs.map((tv) => (
                <button
                  key={tv.ip}
                  type="button"
                  onClick={() => {
                    setIpAddress(tv.ip);
                    setPort(tv.port);
                    triggerHaptic('selection', soundEnabled);
                  }}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    ipAddress === tv.ip
                      ? 'bg-cyan-500/10 border-cyan-400 text-cyan-200'
                      : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{tv.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400">Porta {tv.port}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Formulário de Conexão com a TV Real */}
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Endereço IP da TV LG (Cabo de Rede ou Wi-Fi)
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="Digite o IP da TV (Ex: 192.168.1.50)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-cyan-400 font-mono"
            />
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Na TV: Configurações &gt; Rede &gt; Conexão com Fio (Ethernet) ou Wi-Fi.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPort(3000)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                port === 3000
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              Porta 3000 (ws://)
            </button>
            <button
              type="button"
              onClick={() => setPort(3001)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                port === 3001
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              Porta 3001 (webOS 22+)
            </button>
          </div>

          <button
            type="submit"
            disabled={isConnecting || !ipAddress.trim()}
            className="w-full py-2.5 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-700 disabled:opacity-50 text-cyan-300 font-bold text-sm shadow-[0_0_12px_rgba(0,0,0,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Aguardando resposta da TV...</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-cyan-400" />
                <span>Parear e Conectar</span>
              </>
            )}
          </button>

          {isConnecting && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-center animate-pulse">
              📺 <strong>Atenção à TV!</strong> Se aparecer uma janela perguntando se você aceita conectar, clique em <strong>"Sim / Aceitar"</strong> com o controle da TV!
            </div>
          )}

          {connectionState.error && !isConnecting && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 text-center">
              {connectionState.error}
            </div>
          )}

          {feedbackMsg && (
            <div className="p-2.5 rounded-xl bg-black border border-neutral-800 text-xs text-neutral-300 text-center">
              {feedbackMsg}
            </div>
          )}
        </form>

        {/* Ligar a TV (Wake-on-LAN) */}
        {Capacitor.isNativePlatform() && (
          <div className="mt-5 pt-4 border-t border-neutral-800">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              Ligar a TV (Wake-on-LAN)
            </div>
            <div className="text-xs text-neutral-300 mb-2">
              {connectionState.macAddress ? (
                <>
                  MAC salvo: <span className="font-mono text-cyan-300">{connectionState.macAddress}</span>
                </>
              ) : (
                'MAC ainda não salvo. Conecte uma vez com a TV ligada ou digite abaixo.'
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={macInput}
                onChange={(e) => setMacInput(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-cyan-400 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveMac}
                className="px-4 rounded-xl bg-black border border-neutral-800 text-xs font-semibold text-neutral-200 hover:border-cyan-400 cursor-pointer"
              >
                Salvar
              </button>
            </div>
            {connectionState.isConnected && (
              <button
                type="button"
                onClick={handleDetectMac}
                className="mt-2 w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-neutral-300 hover:border-cyan-400 cursor-pointer"
              >
                Detectar MAC pela TV
              </button>
            )}
            {macMsg && <div className="mt-2 text-xs text-neutral-300 text-center">{macMsg}</div>}
            <span className="text-[10px] text-neutral-400 mt-2 block">
              Na TV, ative "Ligar via Wi-Fi" (ou "Ligar com dispositivo móvel"). O nome do menu varia conforme a versão do webOS.
              A TV precisa estar em espera, ligada na tomada.
            </span>
          </div>
        )}

        {/* Preferências de Feedback do Controle */}
        <div className="mt-5 pt-4 border-t border-neutral-800 space-y-2.5">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Preferências
          </div>

          {/* Som de clique físico */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300">Som de clique dos botões</span>
            <button
              onClick={() => {
                onToggleSound(!soundEnabled);
                triggerHaptic('selection', !soundEnabled);
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Vibração Haptic */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300">Vibração háptica no toque</span>
            <button
              onClick={() => {
                onToggleHaptics(!hapticsEnabled);
                triggerHaptic('medium', soundEnabled);
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                hapticsEnabled
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-500'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Instalação do Aplicativo no Celular & Download para VSCode */}
        {!Capacitor.isNativePlatform() && (
        <div className="mt-5 pt-4 border-t border-neutral-800">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
            Instalação
          </div>
          <PWAInstallSection soundEnabled={soundEnabled} />
        </div>
        )}

        {/* Especificações do Modelo Fornecido */}
        <div className="mt-5 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 mb-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span>Dados do Controle Físico</span>
          </div>
          <div className="bg-[#121319] p-3 rounded-xl border border-neutral-800/80 text-[11px] font-mono space-y-1 text-neutral-400">
            <div><strong className="text-neutral-300">Linha:</strong> Smart Magic LG</div>
            <div><strong className="text-neutral-300">Modelo:</strong> MR22GA</div>
            <div><strong className="text-neutral-300">Cód SVC:</strong> SVCMR22</div>
            <div><strong className="text-neutral-300">ANATEL:</strong> 123321-01925</div>
          </div>
        </div>
      </div>
    </div>
  );
};
