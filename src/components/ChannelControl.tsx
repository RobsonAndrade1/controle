import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface ChannelControlProps {
  onChannelUp: () => void;
  onChannelDown: () => void;
  soundEnabled: boolean;
}

export const ChannelControl: React.FC<ChannelControlProps> = ({
  onChannelUp,
  onChannelDown,
  soundEnabled,
}) => {
  return (
    <div className="flex flex-col items-center justify-between w-14 h-48 py-2 rounded-full bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_6px_16px_rgba(0,0,0,0.5)] select-none">
      {/* Botão + de Canal (ou subir canal) */}
      <button
        id="btn-channel-up"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onChannelUp();
        }}
        aria-label="Próximo Canal"
        className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-200 hover:text-white active:scale-90 active:bg-neutral-800 transition-all cursor-pointer"
      >
        <Plus className="w-6 h-6 stroke-[2.2]" />
      </button>

      {/* Rótulo Central 'CH' do ControllaLG */}
      <div className="flex items-center justify-center text-xs font-bold tracking-wider text-neutral-400 py-1">
        CH
      </div>

      {/* Botão - de Canal (ou descer canal) */}
      <button
        id="btn-channel-down"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onChannelDown();
        }}
        aria-label="Canal Anterior"
        className="w-11 h-11 rounded-full flex items-center justify-center text-neutral-200 hover:text-white active:scale-90 active:bg-neutral-800 transition-all cursor-pointer"
      >
        <Minus className="w-6 h-6 stroke-[2.2]" />
      </button>
    </div>
  );
};
