import React from 'react';
import { triggerHaptic } from '../services/haptics';
import { Play, Sparkles, SlidersHorizontal } from 'lucide-react';
import { AppItem } from '../types';

interface StreamingButtonsProps {
  shortcuts: AppItem[];
  onOpenApp: (appId: string, label: string) => void;
  onOpenAppCustomizer: () => void;
  soundEnabled: boolean;
}

export const StreamingButtons: React.FC<StreamingButtonsProps> = ({
  shortcuts,
  onOpenApp,
  onOpenAppCustomizer,
  soundEnabled,
}) => {
  // Renderiza o estilo visual específico de cada aplicativo para manter fidelidade
  const renderAppContent = (app: AppItem) => {
    switch (app.id) {
      case 'primeVideo':
        return (
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-[11px] font-extrabold tracking-tight text-[#00a8e1] leading-none">
                prime
              </span>
              <span className="text-[11px] font-medium text-neutral-200 leading-none">
                video
              </span>
            </div>
            <div className="w-6 h-1 border-b border-[#00a8e1] rounded-full -mt-0.5" />
          </div>
        );

      case 'netflix':
        return (
          <span className="text-xs font-black tracking-wider text-[#e50914] drop-shadow-[0_0_6px_rgba(229,9,20,0.4)]">
            NETFLIX
          </span>
        );

      case 'youtube':
        return (
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-4 h-3 rounded-xs bg-[#ff0000] flex items-center justify-center">
              <Play className="w-2 h-2 text-white fill-white ml-0.5" />
            </div>
            <span className="text-xs font-bold tracking-tight text-white">YouTube</span>
          </div>
        );

      case 'disney':
        return (
          <span className="text-xs font-extrabold tracking-tight text-[#38bdf8]">
            Disney+
          </span>
        );

      case 'globoplay':
        return (
          <span className="text-xs font-extrabold tracking-tight text-[#ff5500]">
            globoplay
          </span>
        );

      case 'spotify':
        return (
          <span className="text-xs font-bold tracking-tight text-[#1db954]">
            Spotify
          </span>
        );

      case 'max':
        return (
          <span className="text-xs font-black tracking-wider text-[#3b82f6]">
            MAX
          </span>
        );

      default:
        return (
          <span className="text-xs font-semibold tracking-tight text-neutral-200 truncate px-1">
            {app.name}
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto my-2 select-none">
      {/* Fileira dos 3 Atalhos Rápidos Selecionados pelo Usuário */}
      <div className="flex items-center justify-between gap-2.5">
        {shortcuts.slice(0, 3).map((app, index) => (
          <button
            key={app.id}
            id={`btn-shortcut-${index + 1}`}
            onClick={() => {
              triggerHaptic('medium', soundEnabled);
              onOpenApp(app.id, app.name);
            }}
            aria-label={`Abrir ${app.name}`}
            title={`Atalho ${index + 1}: ${app.name} (Toque na Grade de Apps para alterar)`}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 text-neutral-200 hover:text-white transition-all cursor-pointer px-2"
          >
            {renderAppContent(app)}
          </button>
        ))}
      </div>

      {/* Botão de personalização dos 3 atalhos via Grade de Apps */}
      <div className="flex items-center justify-center mt-2">
        <button
          id="btn-customize-shortcuts"
          onClick={() => {
            triggerHaptic('light', soundEnabled);
            onOpenAppCustomizer();
          }}
          className="text-[11px] text-neutral-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-black/30"
        >
          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
          <span>Alterar atalhos na Grade de Apps</span>
        </button>
      </div>
    </div>
  );
};
