import React from 'react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface NumberPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNumberPress: (num: number) => void;
  onColorPress: (color: 'red' | 'green' | 'yellow' | 'blue') => void;
  onSpecialPress: (action: string) => void;
  soundEnabled: boolean;
}

export const NumberPadModal: React.FC<NumberPadModalProps> = ({
  isOpen,
  onClose,
  onNumberPress,
  onColorPress,
  onSpecialPress,
  soundEnabled,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e1013] border border-neutral-800 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-100">Teclado Numérico</h3>
            <p className="text-xs text-neutral-400">MR22GA Smart Magic</p>
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

        {/* 4 Teclas Coloridas Contextuais da TV LG */}
        <div className="grid grid-cols-4 gap-2 my-4">
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onColorPress('red');
            }}
            className="h-9 rounded-xl bg-[#ff334b] text-white font-bold text-xs shadow-[0_2px_8px_rgba(255,51,75,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            Vermelho
          </button>
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onColorPress('green');
            }}
            className="h-9 rounded-xl bg-[#10b981] text-white font-bold text-xs shadow-[0_2px_8px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            Verde
          </button>
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onColorPress('yellow');
            }}
            className="h-9 rounded-xl bg-[#f59e0b] text-neutral-900 font-bold text-xs shadow-[0_2px_8px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            Amarelo
          </button>
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onColorPress('blue');
            }}
            className="h-9 rounded-xl bg-[#3b82f6] text-white font-bold text-xs shadow-[0_2px_8px_rgba(59,130,246,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            Azul
          </button>
        </div>

        {/* Grade Numérica 3x4 */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => {
                triggerHaptic('light', soundEnabled);
                onNumberPress(num);
              }}
              className="h-14 rounded-2xl bg-black border border-neutral-800 text-xl font-bold text-neutral-200 hover:text-white active:scale-95 active:bg-neutral-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_4px_8px_rgba(0,0,0,0.4)] transition-all cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* LIST */}
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onSpecialPress('LIST');
            }}
            className="h-14 rounded-2xl bg-black border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white active:scale-95 shadow-[0_4px_8px_rgba(0,0,0,0.4)] transition-all cursor-pointer flex items-center justify-center"
          >
            LIST
          </button>

          {/* 0 */}
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onNumberPress(0);
            }}
            className="h-14 rounded-2xl bg-black border border-neutral-800 text-xl font-bold text-neutral-200 hover:text-white active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_4px_8px_rgba(0,0,0,0.4)] transition-all cursor-pointer flex items-center justify-center"
          >
            0
          </button>

          {/* QUICK ACCESS / AD/SAP */}
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onSpecialPress('QUICK ACCESS');
            }}
            className="h-14 rounded-2xl bg-black border border-neutral-800 text-[10px] font-bold text-neutral-300 hover:text-white active:scale-95 shadow-[0_4px_8px_rgba(0,0,0,0.4)] transition-all cursor-pointer flex flex-col items-center justify-center leading-tight"
          >
            <span>QUICK</span>
            <span className="text-[9px] text-neutral-400">ACCESS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
