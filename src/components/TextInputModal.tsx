import React, { useState } from 'react';
import { X, Send, Keyboard } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendText: (text: string) => void;
  soundEnabled: boolean;
}

export const TextInputModal: React.FC<TextInputModalProps> = ({
  isOpen,
  onClose,
  onSendText,
  soundEnabled,
}) => {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    triggerHaptic('medium', soundEnabled);
    onSendText(inputText.trim());
    setInputText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e1013] border border-neutral-800 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-neutral-100">Digitar na TV</h3>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light', soundEnabled);
              onClose();
            }}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-black border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 my-3">
          Digite no celular para enviar o texto diretamente para os campos de pesquisa e login da sua TV LG.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ex: Oppenheimer, Netflix, etc."
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-black border border-neutral-800 text-white placeholder-neutral-500 focus:outline-hidden focus:border-cyan-400 transition-colors"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 bg-black text-sm font-medium text-neutral-300 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-sm shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
