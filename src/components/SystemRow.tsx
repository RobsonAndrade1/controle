import React from 'react';
import { Undo2, Home, VolumeX } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface SystemRowProps {
  onBack: () => void;
  onHome: () => void;
  onMute: () => void;
  isMuted?: boolean;
  soundEnabled: boolean;
}

export const SystemRow: React.FC<SystemRowProps> = ({
  onBack,
  onHome,
  onMute,
  isMuted,
  soundEnabled,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 my-3 w-full max-w-xs mx-auto">
      {/* Botão VOLTAR (Back) */}
      <button
        id="btn-back"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onBack();
        }}
        aria-label="Voltar"
        className="flex-1 h-13 rounded-full flex items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 active:bg-neutral-900 text-neutral-300 hover:text-white transition-all cursor-pointer"
      >
        <Undo2 className="w-5 h-5 stroke-[2]" />
      </button>

      {/* Botão HOME (Menu webOS) */}
      <button
        id="btn-home"
        onClick={() => {
          triggerHaptic('medium', soundEnabled);
          onHome();
        }}
        aria-label="Tela Inicial (Home webOS)"
        className="flex-1 h-13 rounded-full flex items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 active:bg-neutral-900 text-neutral-200 hover:text-white transition-all cursor-pointer group"
      >
        <Home className="w-5 h-5 stroke-[2] group-hover:text-cyan-300 transition-colors" />
      </button>

      {/* Botão MUTE (Mudo) */}
      <button
        id="btn-mute"
        onClick={() => {
          triggerHaptic('medium', soundEnabled);
          onMute();
        }}
        aria-label="Mudo"
        className={`flex-1 h-13 rounded-full flex items-center justify-center bg-black border shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer ${
          isMuted
            ? 'border-red-500/80 text-red-400 bg-red-950/40'
            : 'border-neutral-800 text-neutral-300 hover:text-white active:bg-neutral-900'
        }`}
      >
        <VolumeX className="w-5 h-5 stroke-[2]" />
      </button>
    </div>
  );
};
