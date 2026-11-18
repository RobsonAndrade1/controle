import React from 'react';
import { triggerHaptic } from '../services/haptics';

interface DirectionalDPadProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onOk: () => void;
  soundEnabled: boolean;
}

export const DirectionalDPad: React.FC<DirectionalDPadProps> = ({
  onUp,
  onDown,
  onLeft,
  onRight,
  onOk,
  soundEnabled,
}) => {
  return (
    <div className="relative w-56 h-56 rounded-full bg-black p-1.5 border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_10px_25px_rgba(0,0,0,0.6)] flex items-center justify-center select-none">
      {/* Botão CIMA */}
      <button
        id="dpad-up"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onUp();
        }}
        aria-label="Direcional Cima"
        className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-12 flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 active:text-cyan-400 transition-all cursor-pointer group"
      >
        <div className="w-0 h-0 border-x-[7px] border-x-transparent border-b-[10px] border-b-neutral-300 group-hover:border-b-white group-active:border-b-cyan-400 transition-colors" />
      </button>

      {/* Botão DIREITA */}
      <button
        id="dpad-right"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onRight();
        }}
        aria-label="Direcional Direita"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-16 flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 active:text-cyan-400 transition-all cursor-pointer group"
      >
        <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-neutral-300 group-hover:border-l-white group-active:border-l-cyan-400 transition-colors" />
      </button>

      {/* Botão BAIXO */}
      <button
        id="dpad-down"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onDown();
        }}
        aria-label="Direcional Baixo"
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-12 flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 active:text-cyan-400 transition-all cursor-pointer group"
      >
        <div className="w-0 h-0 border-x-[7px] border-x-transparent border-t-[10px] border-t-neutral-300 group-hover:border-t-white group-active:border-t-cyan-400 transition-colors" />
      </button>

      {/* Botão ESQUERDA */}
      <button
        id="dpad-left"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onLeft();
        }}
        aria-label="Direcional Esquerda"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-16 flex items-center justify-center text-neutral-300 hover:text-white active:scale-90 active:text-cyan-400 transition-all cursor-pointer group"
      >
        <div className="w-0 h-0 border-y-[7px] border-y-transparent border-r-[10px] border-r-neutral-300 group-hover:border-r-white group-active:border-r-cyan-400 transition-colors" />
      </button>

      {/* Botão Central OK na cor #0e1013 */}
      <button
        id="dpad-ok"
        onClick={() => {
          triggerHaptic('medium', soundEnabled);
          onOk();
        }}
        aria-label="Confirmar (OK)"
        className="w-24 h-24 rounded-full bg-[#0e1013] border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.6)] flex items-center justify-center text-white active:scale-95 active:bg-neutral-900 transition-all cursor-pointer group"
      >
        <span className="text-sm font-bold tracking-wider text-white group-hover:text-cyan-300 group-active:text-cyan-400">
          OK
        </span>
      </button>
    </div>
  );
};
