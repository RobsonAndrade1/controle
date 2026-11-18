import React from 'react';
import { Power, SlidersHorizontal, Settings, Sparkles, Loader2, Wifi } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';
import { TvConnectionState } from '../types';

interface HeaderBarProps {
  connectionState: TvConnectionState;
  onPowerPress: () => void;
  onTvSettingsPress: () => void;
  onOpenAppSettings: () => void;
  onScanPress?: () => void;
  soundEnabled: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  connectionState,
  onPowerPress,
  onTvSettingsPress,
  onOpenAppSettings,
  onScanPress,
  soundEnabled,
}) => {
  return (
    <header className="flex items-center justify-between px-4 pt-3 pb-2 w-full max-w-md mx-auto">
      {/* Botão Power com estilo icônico vermelho neon do ControllaLG */}
      <button
        id="power-btn"
        onClick={() => {
          triggerHaptic('heavy', soundEnabled);
          onPowerPress();
        }}
        aria-label="Ligar ou Desligar TV"
        className="relative group w-12 h-12 rounded-full flex items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer"
      >
        <div className="absolute inset-0 rounded-full bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Power className="w-5 h-5 text-[#ff334b] drop-shadow-[0_0_8px_rgba(255,51,75,0.7)]" strokeWidth={2.5} />
      </button>

      {/* Pílula Central Interativa - Status e Busca Automática da TV LG */}
      <button
        id="tv-connection-pill"
        onClick={() => {
          triggerHaptic('medium', soundEnabled);
          if (onScanPress) {
            onScanPress();
          } else {
            onOpenAppSettings();
          }
        }}
        title={connectionState.isConnected ? 'Conectado à TV LG' : 'Toque para buscar TV na rede'}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black border border-neutral-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.4)] active:scale-95 transition-all cursor-pointer select-none"
      >
        {connectionState.isScanning ? (
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        ) : connectionState.isConnected ? (
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-100">
          {connectionState.isScanning
            ? 'Buscando TV...'
            : connectionState.isPairing
            ? 'Conectando...'
            : connectionState.isConnected
            ? 'LG Conectada'
            : 'Buscar TV LG'}
        </span>
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            connectionState.isConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : connectionState.isScanning || connectionState.isPairing
              ? 'bg-cyan-400 animate-ping shadow-[0_0_8px_#38bdf8]'
              : 'bg-neutral-600'
          }`}
        />
      </button>

      <div className="flex items-center gap-2">
        {/* Botão Configurações da TV (Engrenagem) - Abre menu de configurações, rede, economia na TV */}
        <button
          id="tv-settings-btn"
          onClick={() => {
            triggerHaptic('medium', soundEnabled);
            onTvSettingsPress();
          }}
          aria-label="Menu de Configurações da TV (Rede, Imagem, Economia)"
          title="Configurações da TV"
          className="w-12 h-12 rounded-full flex items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 text-neutral-300 hover:text-cyan-400 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" strokeWidth={2} />
        </button>

        {/* Botão de Conexão e Ajustes do App à direita */}
        <button
          id="app-settings-btn"
          onClick={() => {
            triggerHaptic('light', soundEnabled);
            onOpenAppSettings();
          }}
          aria-label="Conexão Wi-Fi / IP e Ajustes do App"
          title="Conexão e Ajustes"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
};
