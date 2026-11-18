import React from 'react';
import { Keyboard, LayoutGrid } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface QuickActionPillsProps {
  onOpenKeyboard: () => void;
  onOpenNumberPad: () => void;
  onOpenApps: () => void;
  soundEnabled: boolean;
}

export const QuickActionPills: React.FC<QuickActionPillsProps> = ({
  onOpenKeyboard,
  onOpenNumberPad,
  onOpenApps,
  soundEnabled,
}) => {
  return (
    <div className="flex items-center justify-center gap-6 my-2 w-full max-w-xs mx-auto">
      {/* Botão Teclado Virtual / Digitação */}
      <button
        id="btn-open-keyboard"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onOpenKeyboard();
        }}
        aria-label="Abrir teclado de digitação na TV"
        className="w-13 h-13 rounded-full flex items-center justify-center bg-black border border-neutral-800 text-neutral-300 hover:text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer"
      >
        <Keyboard className="w-5 h-5 opacity-90" strokeWidth={1.8} />
      </button>

      {/* Botão Central: "1 2 3" com as 4 cores características do LG Magic */}
      <button
        id="btn-open-numpad"
        onClick={() => {
          triggerHaptic('selection', soundEnabled);
          onOpenNumberPad();
        }}
        aria-label="Teclado numérico e botões de cores"
        className="w-16 h-16 rounded-full flex flex-col items-center justify-center bg-black border border-neutral-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_6px_14px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer group"
      >
        <span className="text-xs font-bold tracking-widest text-neutral-200 group-hover:text-white mb-1">
          1 2 3
        </span>
        {/* As 4 bolinhas coloridas (Vermelho, Verde, Amarelo, Azul) idênticas à foto */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff334b] shadow-[0_0_4px_#ff334b]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_4px_#10b981]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shadow-[0_0_4px_#f59e0b]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_4px_#3b82f6]" />
        </div>
      </button>

      {/* Botão Apps / Grade Colorida */}
      <button
        id="btn-open-apps"
        onClick={() => {
          triggerHaptic('light', soundEnabled);
          onOpenApps();
        }}
        aria-label="Abrir grade de aplicativos"
        className="w-13 h-13 rounded-full flex items-center justify-center bg-black border border-neutral-800 text-neutral-300 hover:text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.5)] active:scale-95 transition-all cursor-pointer"
      >
        {/* Grade 3x3 com cores representando a diversidade de canais e apps da LG */}
        <div className="grid grid-cols-3 gap-0.5">
          <span className="w-1.5 h-1.5 rounded-xs bg-[#ef4444]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#10b981]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#f59e0b]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#3b82f6]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#8b5cf6]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#ec4899]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#06b6d4]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#84cc16]" />
          <span className="w-1.5 h-1.5 rounded-xs bg-[#f97316]" />
        </div>
      </button>
    </div>
  );
};
