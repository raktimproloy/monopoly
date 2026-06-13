"use client";

import { useState, useRef, useEffect } from 'react';

export default function ResizableSidebar({ 
  children,
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 1000
}: { 
  children: React.ReactNode,
  defaultWidth?: number,
  minWidth?: number,
  maxWidth?: number
}) {
  // NOTE: If you manually change the defaultWidth prop in your code, please do a hard refresh (F5) to reset stale React state.
  const [width, setWidth] = useState(defaultWidth);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isResizing.current) return;
      
      // Use absolute delta from the initial drag start to avoid jitter and state lag
      const deltaX = startX.current - clientX;
      const newWidth = startWidth.current + deltaX;
      
      setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

    const handleUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    const handleMouseUp = () => handleUp();
    const handleTouchEnd = () => handleUp();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [minWidth, maxWidth]);

  return (
    <div 
      style={{ 
        width: `${width}px`, 
        minWidth: `${width}px`, 
        maxWidth: `${width}px`,
        flexBasis: `${width}px`,
        flexShrink: 0,
        flexGrow: 0 
      }} 
      className="relative z-50 shrink-0 flex flex-col h-full transition-none bg-[#0B0E14] border-l border-slate-800" // z-50 ensures drag handle sits above the center board DOM nodes
    >
      {/* Hover & Drag Handle */}
      <div
        className="absolute top-0 -left-3 w-6 h-full cursor-ew-resize hover:bg-cyber-blue/10 z-[50] flex flex-col items-center justify-center group touch-none pointer-events-auto transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          isResizing.current = true;
          startX.current = e.clientX;
          startWidth.current = width;
          document.body.style.cursor = 'ew-resize';
          document.body.style.userSelect = 'none'; // Prevent text selection while dragging
        }}
        onTouchStart={(e) => {
          isResizing.current = true;
          startX.current = e.touches[0].clientX;
          startWidth.current = width;
          document.body.style.cursor = 'ew-resize';
          document.body.style.userSelect = 'none';
        }}
      >
        {/* Neon Grip indicator */}
        <div className="flex flex-col gap-1 items-center bg-slate-800 p-1.5 rounded-full border border-slate-600 shadow-md">
          <div className="w-0.5 h-3 bg-slate-400 group-hover:bg-cyber-blue rounded-full transition-colors" />
          <div className="w-0.5 h-3 bg-slate-400 group-hover:bg-cyber-blue rounded-full transition-colors" />
        </div>
      </div>
      
      {/* Inner Content Container */}
      <div className="flex-1 min-w-0 h-full w-full flex flex-col gap-4 pl-2">
        {children}
      </div>
    </div>
  );
}