import React from 'react';
import { X, Tv, Cable, Radio, HardDrive } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface InputsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInput: (inputName: string) => void;
  soundEnabled: boolean;
}

const INPUTS = [
  { id: 'hdmi1', label: 'HDMI 1', icon: Cable, desc: 'Console / Blu-ray' },
  { id: 'hdmi2', label: 'HDMI 2 (eARC)', icon: Cable, desc: 'Soundbar / Home Theater' },
  { id: 'hdmi3', label: 'HDMI 3', icon: Cable, desc: 'Computador / Box' },
  { id: 'antenna', label: 'Antena / TV Aberta', icon: Radio, desc: 'Canais digitais' },
  { id: 'usb', label: 'USB / Mídia', icon: HardDrive, desc: 'Fotos, músicas e vídeos' },
];

export const InputsModal: React.FC<InputsModalProps> = ({
  isOpen,
  onClose,
  onSelectInput,
  soundEnabled,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e1013] border border-neutral-800 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-bottom-6 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-neutral-100">Entradas da TV</h3>
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

        <div className="space-y-2 my-4">
          {INPUTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic('medium', soundEnabled);
                  onSelectInput(item.label);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-black border border-neutral-800 hover:border-neutral-700 active:scale-98 transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0e1013] border border-neutral-800 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-200 group-hover:text-white">
                    {item.label}
                  </div>
                  <div className="text-xs text-neutral-400">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
