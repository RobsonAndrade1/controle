import React, { useState } from 'react';
import { X, MonitorPlay, Check, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';
import { AppItem } from '../types';
import { ALL_AVAILABLE_APPS, DEFAULT_SHORTCUT_IDS } from '../data/appsData';

interface AppsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchApp: (appId: string, label: string) => void;
  shortcuts: AppItem[];
  onUpdateShortcuts: (newShortcuts: AppItem[]) => void;
  soundEnabled: boolean;
}

export const AppsModal: React.FC<AppsModalProps> = ({
  isOpen,
  onClose,
  onLaunchApp,
  shortcuts,
  onUpdateShortcuts,
  soundEnabled,
}) => {
  // Slot atualmente selecionado para atribuição (0, 1, 2 ou null)
  const [activeSlotToAssign, setActiveSlotToAssign] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (text: string) => {
    setFeedbackText(text);
    setTimeout(() => {
      setFeedbackText(null);
    }, 2500);
  };

  // Atribuir app ao slot selecionado
  const assignAppToSlot = (app: AppItem, slotIndex: number) => {
    const updated = [...shortcuts];
    // Se o app já estiver em outro slot, troque de posição
    const existingIndex = updated.findIndex((s) => s.id === app.id);
    if (existingIndex !== -1 && existingIndex !== slotIndex) {
      const temp = updated[slotIndex];
      updated[slotIndex] = app;
      updated[existingIndex] = temp;
    } else {
      updated[slotIndex] = app;
    }

    onUpdateShortcuts(updated);
    triggerHaptic('medium', soundEnabled);
    showNotification(`"${app.name}" definido no Atalho ${slotIndex + 1}!`);
    setActiveSlotToAssign(null);
  };

  const handleResetDefaults = () => {
    const defaultApps = DEFAULT_SHORTCUT_IDS.map(
      (id) => ALL_AVAILABLE_APPS.find((a) => a.id === id)!
    );
    onUpdateShortcuts(defaultApps);
    triggerHaptic('selection', soundEnabled);
    showNotification('Atalhos restaurados para o padrão.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e1013] border border-neutral-800 p-5 shadow-[0_10px_35px_rgba(0,0,0,0.95)] animate-in fade-in slide-in-from-bottom-6 duration-200 max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-neutral-100 leading-tight">Grade de Apps</h3>
              <p className="text-[11px] text-neutral-400">Escolha os atalhos e abra na TV</p>
            </div>
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

        {/* Notificação sutil de ação */}
        {feedbackText && (
          <div className="my-2 p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs text-center font-medium animate-in fade-in duration-150 shrink-0">
            {feedbackText}
          </div>
        )}

        {/* Seção de Escolha dos 3 Atalhos Rápidos */}
        <div className="my-3 p-3 rounded-2xl bg-black border border-neutral-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-xs font-bold text-neutral-200">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>3 Atalhos Rápidos no Controle</span>
            </div>
            <button
              onClick={handleResetDefaults}
              title="Restaurar padrão"
              className="text-[10px] text-neutral-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Padrão</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-300 mb-2.5 leading-snug">
            {activeSlotToAssign !== null
              ? `Toque em qualquer app abaixo para atribuir ao Atalho ${activeSlotToAssign + 1}:`
              : 'Toque em uma posição para alterá-la:'}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {shortcuts.map((app, index) => {
              const isSelectedForEdit = activeSlotToAssign === index;
              return (
                <button
                  key={index}
                  onClick={() => {
                    triggerHaptic('light', soundEnabled);
                    setActiveSlotToAssign(isSelectedForEdit ? null : index);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelectedForEdit
                      ? 'bg-neutral-900 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/40'
                      : 'bg-black border-neutral-800 hover:border-neutral-600 text-neutral-300'
                  }`}
                >
                  <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">
                    Slot {index + 1}
                  </span>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
                    style={{ backgroundColor: app.color }}
                  >
                    {app.badge || app.name.slice(0, 2)}
                  </div>
                  <span className="text-[11px] font-semibold truncate max-w-full">
                    {app.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Aplicativos Disponíveis */}
        <div className="flex items-center justify-between mt-1 mb-2 px-1 shrink-0">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Todos os Aplicativos
          </span>
          <span className="text-[10px] text-neutral-500">
            {activeSlotToAssign !== null ? 'Modo de seleção ativo' : 'Toque para abrir'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1">
          {ALL_AVAILABLE_APPS.map((app) => {
            const shortcutIndex = shortcuts.findIndex((s) => s.id === app.id);
            const isAssigned = shortcutIndex !== -1;

            return (
              <div
                key={app.id}
                className={`relative flex flex-col justify-between p-2.5 rounded-2xl border transition-all ${
                  isAssigned
                    ? 'bg-black border-cyan-500/50 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                    : 'bg-black border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {/* Botão de Abertura / Seleção */}
                <button
                  onClick={() => {
                    if (activeSlotToAssign !== null) {
                      assignAppToSlot(app, activeSlotToAssign);
                    } else {
                      triggerHaptic('medium', soundEnabled);
                      onLaunchApp(app.id, app.name);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-2.5 text-left w-full cursor-pointer group"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0"
                    style={{ backgroundColor: app.color }}
                  >
                    {app.badge || app.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="text-xs font-bold text-neutral-200 group-hover:text-white truncate">
                      {app.name}
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">{app.category}</div>
                  </div>
                </button>

                {/* Ações de fixar no atalho rápido */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-800/80">
                  {isAssigned ? (
                    <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Atalho {shortcutIndex + 1}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] text-neutral-500">Fixar:</span>
                  )}

                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((slotIdx) => (
                      <button
                        key={slotIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          assignAppToSlot(app, slotIdx);
                        }}
                        title={`Fixar no Atalho ${slotIdx + 1}`}
                        className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                          shortcutIndex === slotIdx
                            ? 'bg-cyan-400 text-neutral-950 font-extrabold shadow-sm'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {slotIdx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
