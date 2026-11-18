import React, { useRef, useState, useCallback, useEffect } from 'react';
import { triggerHaptic } from '../services/haptics';
import { MousePointer2, Volume2, Move } from 'lucide-react';

interface MagicTouchpadProps {
  onPointerMove: (dx: number, dy: number) => void;
  onPointerClick: () => void;
  onScroll: (dy: number) => void;
  onMuteToggle: () => void;
  soundEnabled: boolean;
}

export const MagicTouchpad: React.FC<MagicTouchpadProps> = ({
  onPointerMove,
  onPointerClick,
  onScroll,
  onMuteToggle,
  soundEnabled,
}) => {
  const touchpadRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);

  // Posição visual do indicador de toque dentro do touchpad
  const [touchIndicator, setTouchIndicator] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  // Posição do indicador da barra de rolagem (de 0 a 100%)
  const [scrollThumbPos, setScrollThumbPos] = useState<number>(50);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);

  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const totalMovementRef = useRef<number>(0);
  const lastScrollYRef = useRef<number | null>(null);

  // Handlers para o Touchpad (Movimentação do Ponteiro)
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (touchpadRef.current) {
      const rect = touchpadRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;
      setTouchIndicator({ x: relativeX, y: relativeY, active: true });
    }

    lastTouchRef.current = { x: clientX, y: clientY, time: Date.now() };
    totalMovementRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!lastTouchRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = (clientX - lastTouchRef.current.x) * 1.5;
    const dy = (clientY - lastTouchRef.current.y) * 1.5;

    totalMovementRef.current += Math.abs(dx) + Math.abs(dy);

    if (touchpadRef.current) {
      const rect = touchpadRef.current.getBoundingClientRect();
      const relativeX = Math.max(8, Math.min(rect.width - 8, clientX - rect.left));
      const relativeY = Math.max(8, Math.min(rect.height - 8, clientY - rect.top));
      setTouchIndicator({ x: relativeX, y: relativeY, active: true });
    }

    onPointerMove(dx, dy);

    lastTouchRef.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const handleTouchEnd = () => {
    if (lastTouchRef.current) {
      const duration = Date.now() - lastTouchRef.current.time;
      // Se movimentou muito pouco e soltou rápido, conta como clique (Tap to Click do LG ThinQ)
      if (totalMovementRef.current < 12 && duration < 350) {
        triggerHaptic('medium', soundEnabled);
        onPointerClick();
      }
    }

    lastTouchRef.current = null;
    totalMovementRef.current = 0;
    setTouchIndicator((prev) => ({ ...prev, active: false }));
  };

  // Handlers para a Barra de Rolagem Lateral (Scroll Wheel do LG ThinQ)
  const handleScrollStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastScrollYRef.current = clientY;
    setIsScrolling(true);
    triggerHaptic('light', soundEnabled);
  };

  const handleScrollMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (lastScrollYRef.current === null) return;
    e.stopPropagation();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - lastScrollYRef.current;

    if (Math.abs(deltaY) > 5) {
      // Inverte para sensação natural de rolar a página da TV
      const scrollDirection = deltaY > 0 ? 1 : -1;
      onScroll(scrollDirection * 3);
      triggerHaptic('light', soundEnabled);

      if (scrollBarRef.current) {
        const rect = scrollBarRef.current.getBoundingClientRect();
        const percentage = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100));
        setScrollThumbPos(percentage);
      }

      lastScrollYRef.current = clientY;
    }
  };

  const handleScrollEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    lastScrollYRef.current = null;
    setIsScrolling(false);
  };

  return (
    <div className="relative w-full max-w-[260px] h-56 rounded-2xl bg-black border border-neutral-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_6px_20px_rgba(0,0,0,0.5)] p-2 flex items-stretch gap-2 select-none overflow-hidden">
      {/* Área Sensível do Touchpad na cor Black */}
      <div
        id="lg-magic-touchpad-area"
        ref={touchpadRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleTouchMove(e);
        }}
        onMouseUp={handleTouchEnd}
        className="relative flex-1 rounded-xl bg-black border border-neutral-900 flex flex-col justify-between p-2 cursor-crosshair touch-none overflow-hidden"
      >
        {/* Topo do touchpad com ícone de volume como no vídeo do LG ThinQ */}
        <div className="flex items-center justify-between w-full opacity-60">
          <button
            id="touchpad-mute-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light', soundEnabled);
              onMuteToggle();
            }}
            className="p-1 hover:text-cyan-300 transition-colors cursor-pointer"
            aria-label="Silenciar áudio"
          >
            <Volume2 className="w-4 h-4 text-neutral-400" />
          </button>
          <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase">
            Touchpad Magic
          </span>
        </div>

        {/* Centro com indicação sutil de toque e cursor */}
        <div className="flex flex-col items-center justify-center opacity-30 pointer-events-none">
          <MousePointer2 className="w-5 h-5 text-neutral-400 mb-1" />
          <span className="text-[11px] font-medium text-neutral-400">Deslize para mover</span>
          <span className="text-[9px] text-neutral-500">Toque para clicar</span>
        </div>

        {/* Rodapé com indicador de arrasto / mover */}
        <div className="flex items-center justify-between w-full opacity-60 pointer-events-none">
          <Move className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[10px] text-neutral-500">MR22GA</span>
        </div>

        {/* Indicador luminoso dinâmico na ponta do dedo */}
        {touchIndicator.active && (
          <div
            className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/80 bg-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.7)] pointer-events-none transition-transform duration-75"
            style={{
              left: `${touchIndicator.x}px`,
              top: `${touchIndicator.y}px`,
            }}
          />
        )}
      </div>

      {/* Barra Lateral de Rolagem Vertical com fundo #383838 e thumb Black */}
      <div
        id="lg-magic-scroll-wheel"
        ref={scrollBarRef}
        onTouchStart={handleScrollStart}
        onTouchMove={handleScrollMove}
        onTouchEnd={handleScrollEnd}
        onMouseDown={handleScrollStart}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleScrollMove(e);
        }}
        onMouseUp={handleScrollEnd}
        aria-label="Barra de rolagem vertical da TV LG"
        className="relative w-8 rounded-xl bg-[#383838] border border-[#505050] flex items-center justify-center cursor-ns-resize touch-none py-2 shadow-inner"
      >
        {/* Ranhuras de textura no fundo da barra de rolagem */}
        <div className="flex flex-col gap-1.5 items-center justify-center opacity-30 pointer-events-none">
          <div className="w-3 h-0.5 bg-neutral-300 rounded-full" />
          <div className="w-3 h-0.5 bg-neutral-300 rounded-full" />
          <div className="w-3 h-0.5 bg-neutral-300 rounded-full" />
          <div className="w-3 h-0.5 bg-neutral-300 rounded-full" />
          <div className="w-3 h-0.5 bg-neutral-300 rounded-full" />
        </div>

        {/* Thumb deslizante da Roda de Scroll na cor Black sobre o fundo #383838 */}
        <div
          className={`absolute w-6 h-14 rounded-lg bg-black border border-neutral-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.8)] -translate-y-1/2 flex items-center justify-center transition-all ${
            isScrolling ? 'scale-105 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : ''
          }`}
          style={{ top: `${scrollThumbPos}%` }}
        >
          {/* Estrias centrais da rodinha física do Magic Remote */}
          <div className="flex flex-col gap-1 items-center justify-center">
            <span className="w-3 h-[2px] rounded-full bg-neutral-300 opacity-80" />
            <span className="w-3 h-[2px] rounded-full bg-neutral-300 opacity-80" />
            <span className="w-3 h-[2px] rounded-full bg-neutral-300 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};
