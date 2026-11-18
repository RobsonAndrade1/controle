import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ControlMode } from '../types';
import { DirectionalDPad } from './DirectionalDPad';
import { MagicTouchpad } from './MagicTouchpad';
import { VolumeControl } from './VolumeControl';
import { ChannelControl } from './ChannelControl';
import { MousePointer2, Compass } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';

interface CenterControllerProps {
  mode: ControlMode;
  onToggleMode: (newMode: ControlMode) => void;
  // Comandos de navegação
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onOk: () => void;
  // Comandos de volume
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMuteToggle: () => void;
  // Comandos de canal
  onChannelUp: () => void;
  onChannelDown: () => void;
  // Comandos de Touchpad
  onPointerMove: (dx: number, dy: number) => void;
  onPointerClick: () => void;
  onScroll: (dy: number) => void;
  soundEnabled: boolean;
}

export const CenterController: React.FC<CenterControllerProps> = ({
  mode,
  onToggleMode,
  onUp,
  onDown,
  onLeft,
  onRight,
  onOk,
  onVolumeUp,
  onVolumeDown,
  onMuteToggle,
  onChannelUp,
  onChannelDown,
  onPointerMove,
  onPointerClick,
  onScroll,
  soundEnabled,
}) => {
  // Swipe horizontal na área de controle para alternar D-Pad <-> Touchpad
  const swipeStartX = React.useRef<number | null>(null);
  const swipeStartY = React.useRef<number | null>(null);

  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
  };

  const handleSwipeEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;

    // Se o movimento for predominantemente horizontal e tiver pelo menos 45px
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && mode === 'dpad') {
        // Deslizar para a esquerda vai para o Touchpad
        triggerHaptic('medium', soundEnabled);
        onToggleMode('touchpad');
      } else if (deltaX > 0 && mode === 'touchpad') {
        // Deslizar para a direita volta para o D-Pad
        triggerHaptic('medium', soundEnabled);
        onToggleMode('dpad');
      }
    }

    swipeStartX.current = null;
    swipeStartY.current = null;
  };

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center select-none my-1">
      {/* 2 Pontos de Paginação com área de toque aumentada e suporte a swipe */}
      <div 
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        onMouseDown={handleSwipeStart}
        onMouseUp={handleSwipeEnd}
        className="flex items-center gap-2 mb-2 p-1 cursor-ew-resize"
      >
        {/* Ponto 1: Setas / Direcional */}
        <button
          onClick={() => {
            triggerHaptic('selection', soundEnabled);
            onToggleMode('dpad');
          }}
          aria-label="Controle 1: Setas e Direcional"
          title="Setas / Direcional"
          className="py-1 px-1 cursor-pointer flex items-center justify-center"
        >
          <div
            className={`transition-all rounded-full ${
              mode === 'dpad'
                ? 'w-5 h-1.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                : 'w-2 h-1.5 bg-black hover:bg-neutral-800'
            }`}
          />
        </button>

        {/* Ponto 2: Touchpad */}
        <button
          onClick={() => {
            triggerHaptic('selection', soundEnabled);
            onToggleMode('touchpad');
          }}
          aria-label="Controle 2: Touchpad"
          title="Touchpad"
          className="py-1 px-1 cursor-pointer flex items-center justify-center"
        >
          <div
            className={`transition-all rounded-full ${
              mode === 'touchpad'
                ? 'w-5 h-1.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                : 'w-2 h-1.5 bg-black hover:bg-neutral-800'
            }`}
          />
        </button>
      </div>

      {/* Grid Central: Volume à esquerda, D-Pad/Touchpad no Centro, Canais à direita */}
      <div className="flex items-center justify-between w-full px-2 gap-2">
        {/* Coluna de Volume (Esquerda) */}
        <VolumeControl
          onVolumeUp={onVolumeUp}
          onVolumeDown={onVolumeDown}
          onMuteToggle={onMuteToggle}
          soundEnabled={soundEnabled}
        />

        {/* Seção Central Alternável: D-Pad <-> Magic Touchpad com swipe */}
        <div 
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
          className="relative flex-1 flex items-center justify-center min-h-[230px]"
        >
          <AnimatePresence mode="wait">
            {mode === 'dpad' ? (
              <motion.div
                key="dpad"
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center justify-center w-full"
              >
                <DirectionalDPad
                  onUp={onUp}
                  onDown={onDown}
                  onLeft={onLeft}
                  onRight={onRight}
                  onOk={onOk}
                  soundEnabled={soundEnabled}
                />
              </motion.div>
            ) : (
              <motion.div
                key="touchpad"
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center justify-center w-full"
              >
                <MagicTouchpad
                  onPointerMove={onPointerMove}
                  onPointerClick={onPointerClick}
                  onScroll={onScroll}
                  onMuteToggle={onMuteToggle}
                  soundEnabled={soundEnabled}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Coluna de Canais (Direita) */}
        <ChannelControl
          onChannelUp={onChannelUp}
          onChannelDown={onChannelDown}
          soundEnabled={soundEnabled}
        />
      </div>

      {/* Barra de Alternância Rápida: Botão ou Deslize */}
      <div 
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        className="flex items-center justify-between w-full px-5 mt-2"
      >
        <button
          id="btn-toggle-touchpad-mode"
          onClick={() => {
            const nextMode = mode === 'dpad' ? 'touchpad' : 'dpad';
            triggerHaptic('selection', soundEnabled);
            onToggleMode(nextMode);
          }}
          aria-label={mode === 'dpad' ? 'Mudar para Touchpad Magic' : 'Mudar para Direcional'}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs ${
            mode === 'touchpad'
              ? 'bg-black border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
              : 'bg-black border-neutral-800 text-neutral-300 hover:text-white active:scale-95'
          }`}
        >
          {mode === 'dpad' ? (
            <>
              <MousePointer2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Deslize ou Toque: Touchpad</span>
            </>
          ) : (
            <>
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Deslize ou Toque: Direcional</span>
            </>
          )}
        </button>

        <span className="text-[10px] font-mono text-neutral-400 tracking-wider">
          {mode === 'dpad' ? '◄ SWIPE ►' : '◄ VOLTAR'}
        </span>
      </div>
    </div>
  );
};
