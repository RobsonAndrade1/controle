import React from 'react';
import { Plus, Minus, Volume2 } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface VolumeControlProps {
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMuteToggle?: () => void;
  soundEnabled: boolean;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  onVolumeUp,
  onVolumeDown,
  onMuteToggle,
  soundEnabled,
}) => {
  return (
    <div className="flex flex-col items-center justify-between w-14 h-48 py-2 rounded-full bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_6px_16px_rgba(0,0,0,0.5)] select-none">
      {/* Botão + de Volume */}
      <button
        id="btn-volume-up"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onVolumeUp();
        }}
        aria-label="Aumentar Volume"
        className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-200 hover:text-white active:scale-90 active:bg-neutral-800 transition-all cursor-pointer"
      >
        <Plus className="w-6 h-6 stroke-[2.2]" />
      </button>

      {/* Ícone Central de Volume com feedback de clique para Mute */}
      <button
        id="btn-volume-icon"
        onClick={() => {
          if (onMuteToggle) {
            triggerHaptic('medium', soundEnabled);
            onMuteToggle();
          }
        }}
        aria-label="Status do Volume / Mudo"
        className="flex items-center justify-center text-neutral-400 hover:text-neutral-200 active:scale-95 transition-all cursor-pointer py-1"
      >
        <Volume2 className="w-5 h-5 stroke-[1.8]" />
      </button>

      {/* Botão - de Volume */}
      <button
        id="btn-volume-down"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onVolumeDown();
        }}
        aria-label="Diminuir Volume"
        className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-200 hover:text-white active:scale-90 active:bg-neutral-800 transition-all cursor-pointer"
      >
        <Minus className="w-6 h-6 stroke-[2.2]" />
      </button>
    </div>
  );
};
