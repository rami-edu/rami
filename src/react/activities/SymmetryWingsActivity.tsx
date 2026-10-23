import React, { useState, useRef } from 'react';
import { audioManager } from '../../managers/AudioManager';

export interface WingColorDef {
  id: string;
  hex: string;
  name: string;
}

export const WING_COLORS: WingColorDef[] = [
  { id: 'pink', hex: '#ff006e', name: 'Rose Pink' },
  { id: 'blue', hex: '#3a86ff', name: 'Azure Blue' },
  { id: 'amber', hex: '#ffd166', name: 'Golden Amber' },
  { id: 'green', hex: '#52b788', name: 'Emerald Green' },
  { id: 'purple', hex: '#9d4edd', name: 'Purple Violet' }
];

export const getRandomWingColors = (): [string, string] => {
  const shuffled = [...WING_COLORS].sort(() => 0.5 - Math.random());
  return [shuffled[0].hex, shuffled[1].hex];
};

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const SymmetryWingsActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  // Left Wing (Reference Model Colors): [Upper Wing Gem, Lower Wing Gem]
  const [leftWingColors, setLeftWingColors] = useState<[string, string]>(() => getRandomWingColors());
  // Right Wing (Player Drop Sockets): [Upper Socket, Lower Socket]
  const [rightWingColors, setRightWingColors] = useState<(string | null)[]>([null, null]);

  // Selected color for tap fallback
  const [selectedColor, setSelectedColor] = useState<string>(() => leftWingColors[0]);

  // Drag and drop state
  const [draggedColor, setDraggedColor] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSocketIndex, setHoveredSocketIndex] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Animation states
  const [wobbleSocketIndex, setWobbleSocketIndex] = useState<number | null>(null);
  const [justSnappedIndex, setJustSnappedIndex] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);

  // Sockets DOM references for drag hit-testing
  const socketRefs = useRef<Record<number, HTMLDivElement | null>>({ 0: null, 1: null });

  const setupRound = () => {
    setIsSolved(false);
    setWobbleSocketIndex(null);
    setJustSnappedIndex(null);
    setDraggedColor(null);
    setDragPos(null);
    setIsDragging(false);
    setHoveredSocketIndex(null);

    const newLeftColors = getRandomWingColors();
    setLeftWingColors(newLeftColors);
    setRightWingColors([null, null]);
    setSelectedColor(newLeftColors[0]);
  };

  const handleDropColor = (socketIndex: number, colorHex: string) => {
    if (isSolved) return;

    const nextRight = [...rightWingColors];
    nextRight[socketIndex] = colorHex;
    setRightWingColors(nextRight);

    const expectedColor = leftWingColors[socketIndex];

    if (colorHex === expectedColor) {
      // Correct symmetrical placement!
      audioManager.playPortalReturn();
      setJustSnappedIndex(socketIndex);
      window.setTimeout(() => setJustSnappedIndex(null), 600);

      // Check if both mirrored sockets match the reference left wing
      if (nextRight[0] === leftWingColors[0] && nextRight[1] === leftWingColors[1]) {
        setIsSolved(true);
        onSolved();
        window.setTimeout(() => {
          setupRound();
        }, 1500);
      }
    } else {
      // Asymmetrical placement: gentle pedagogical shake and reset
      setWobbleSocketIndex(socketIndex);
      onMistake();
      window.setTimeout(() => {
        setWobbleSocketIndex(null);
        setRightWingColors((curr) => {
          const reset = [...curr];
          reset[socketIndex] = null;
          return reset;
        });
      }, 550);
    }
  };

  // Pointer Drag Handlers
  const handlePointerDown = (hex: string, e: React.PointerEvent) => {
    if (isSolved) return;
    setSelectedColor(hex);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDraggedColor(hex);
    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedColor) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 8) {
      setIsDragging(true);
    }
    setDragPos({ x: e.clientX, y: e.clientY });

    // Check if hovering over any right-wing socket
    let hoveredIdx: number | null = null;
    for (const idx of [0, 1]) {
      const el = socketRefs.current[idx];
      if (el) {
        const rect = el.getBoundingClientRect();
        const pad = 24;
        if (
          e.clientX >= rect.left - pad &&
          e.clientX <= rect.right + pad &&
          e.clientY >= rect.top - pad &&
          e.clientY <= rect.bottom + pad
        ) {
          hoveredIdx = idx;
          break;
        }
      }
    }
    setHoveredSocketIndex(hoveredIdx);
  };

  const handlePointerUp = (hex: string, e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedColor) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const wasDragged = Math.hypot(dx, dy) > 12;

    if (wasDragged) {
      let droppedSocketIndex: number | null = null;
      for (const idx of [0, 1]) {
        const el = socketRefs.current[idx];
        if (el) {
          const rect = el.getBoundingClientRect();
          const pad = 26;
          if (
            e.clientX >= rect.left - pad &&
            e.clientX <= rect.right + pad &&
            e.clientY >= rect.top - pad &&
            e.clientY <= rect.bottom + pad
          ) {
            droppedSocketIndex = idx;
            break;
          }
        }
      }

      if (droppedSocketIndex !== null) {
        handleDropColor(droppedSocketIndex, draggedColor);
      }
    } else {
      // Tap selection
      setSelectedColor(hex);
    }

    dragStartRef.current = null;
    setDraggedColor(null);
    setDragPos(null);
    setIsDragging(false);
    setHoveredSocketIndex(null);
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    setDraggedColor(null);
    setDragPos(null);
    setIsDragging(false);
    setHoveredSocketIndex(null);
  };

  // Tap-to-paint fallback for right wing sockets
  const handleSocketClick = (socketIndex: number) => {
    if (isDragging || isSolved) return;
    handleDropColor(socketIndex, selectedColor);
  };

  return (
    <div className="symmetry-wings-container">
      {/* Symmetrical Butterfly Canvas Stage */}
      <div className={`butterfly-stage-box ${isSolved ? 'wings-flapping' : ''}`}>
        <svg
          className="butterfly-svg"
          viewBox="0 0 460 300"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Symmetry Butterfly"
        >
          <defs>
            {/* Soft Ambient Wing Sheen Gradient */}
            <linearGradient id="wingSheenLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="wingSheenRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
            </linearGradient>

            {/* Specular Droplet Highlight */}
            <radialGradient id="gemSpecular" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
            </radialGradient>
          </defs>

          {/* Central Vertical Symmetry Mirror Axis */}
          <line
            x1="230"
            y1="30"
            x2="230"
            y2="280"
            stroke="#ffd166"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeOpacity="0.65"
          />

          {/* === LEFT WING (Reference Model Wing) === */}
          <g id="left-wing-group" className="butterfly-wing-left">
            {/* Left Upper Wing Lobe */}
            <path
              d="M 224,120 C 180,40 70,30 50,90 C 30,150 120,195 224,165 Z"
              fill="#183624"
              stroke="#52b788"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 224,120 C 180,40 70,30 50,90 C 30,150 120,195 224,165 Z"
              fill="url(#wingSheenLeft)"
            />

            {/* Left Lower Wing Lobe */}
            <path
              d="M 224,165 C 150,185 60,210 80,260 C 100,295 190,270 224,215 Z"
              fill="#122b1c"
              stroke="#52b788"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 224,165 C 150,185 60,210 80,260 C 100,295 190,270 224,215 Z"
              fill="url(#wingSheenLeft)"
            />

            {/* Left Wing Decorative Edge Veins */}
            <path d="M 224,135 Q 140,110 85,80" stroke="#74c69d" strokeWidth="2.5" fill="none" opacity="0.6" />
            <path d="M 224,185 Q 150,225 105,255" stroke="#74c69d" strokeWidth="2.5" fill="none" opacity="0.6" />

            {/* Left Wing Reference Jewel 0 (Upper) */}
            <g transform="translate(136, 110)">
              <circle cx="0" cy="0" r="28" fill={leftWingColors[0]} stroke="#ffffff" strokeWidth="3.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))" />
              <circle cx="0" cy="0" r="28" fill="url(#gemSpecular)" />
            </g>

            {/* Left Wing Reference Jewel 1 (Lower) */}
            <g transform="translate(152, 222)">
              <circle cx="0" cy="0" r="24" fill={leftWingColors[1]} stroke="#ffffff" strokeWidth="3.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))" />
              <circle cx="0" cy="0" r="24" fill="url(#gemSpecular)" />
            </g>
          </g>

          {/* === RIGHT WING (Target Drop Sockets Wing - Mirrored across x=230) === */}
          <g id="right-wing-group" className="butterfly-wing-right">
            {/* Right Upper Wing Lobe */}
            <path
              d="M 236,120 C 280,40 390,30 410,90 C 430,150 340,195 236,165 Z"
              fill="#183624"
              stroke="#52b788"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 236,120 C 280,40 390,30 410,90 C 430,150 340,195 236,165 Z"
              fill="url(#wingSheenRight)"
            />

            {/* Right Lower Wing Lobe */}
            <path
              d="M 236,165 C 310,185 400,210 380,260 C 360,295 270,270 236,215 Z"
              fill="#122b1c"
              stroke="#52b788"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 236,165 C 310,185 400,210 380,260 C 360,295 270,270 236,215 Z"
              fill="url(#wingSheenRight)"
            />

            {/* Right Wing Decorative Edge Veins */}
            <path d="M 236,135 Q 320,110 375,80" stroke="#74c69d" strokeWidth="2.5" fill="none" opacity="0.6" />
            <path d="M 236,185 Q 310,225 355,255" stroke="#74c69d" strokeWidth="2.5" fill="none" opacity="0.6" />
          </g>

          {/* === BUTTERFLY CENTER BODY & ANTENNAE === */}
          <g id="butterfly-body-spine">
            {/* Antennae */}
            <path d="M 226,60 Q 196,15 180,25" stroke="#ffd166" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <circle cx="180" cy="25" r="5" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />

            <path d="M 234,60 Q 264,15 280,25" stroke="#ffd166" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <circle cx="280" cy="25" r="5" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />

            {/* Slender Thorax and Abdomen */}
            <ellipse cx="230" cy="165" rx="11" ry="65" fill="#2d1b0d" stroke="#ffd166" strokeWidth="2.5" />
            {/* Body Segment Highlights */}
            <ellipse cx="230" cy="140" rx="9" ry="12" fill="#5c3818" />
            <ellipse cx="230" cy="170" rx="8" ry="14" fill="#5c3818" />
            <ellipse cx="230" cy="198" rx="7" ry="12" fill="#5c3818" />

            {/* Head */}
            <circle cx="230" cy="74" r="14" fill="#2d1b0d" stroke="#ffd166" strokeWidth="2.5" />
            <circle cx="225" cy="71" r="3" fill="#ffffff" />
            <circle cx="235" cy="71" r="3" fill="#ffffff" />
          </g>
        </svg>

        {/* Interactive Right Wing Drop Sockets (HTML Overlay over SVG for perfect touch/click target events) */}
        <div className="right-wing-sockets-overlay">
          {/* Socket 0: Upper Right Wing (Mirrored to Left Jewel 0 at x=136, y=110 -> 324, 110) */}
          <div
            ref={(el) => {
              socketRefs.current[0] = el;
            }}
            className={`wing-socket socket-upper ${rightWingColors[0] ? 'filled' : 'empty'} ${hoveredSocketIndex === 0 ? 'drag-hover' : ''} ${wobbleSocketIndex === 0 ? 'wobble' : ''} ${justSnappedIndex === 0 ? 'snapped' : ''}`}
            style={{
              backgroundColor: rightWingColors[0] || 'rgba(10, 26, 16, 0.75)',
              borderColor: rightWingColors[0] ? '#ffffff' : hoveredSocketIndex === 0 ? '#ffd166' : 'rgba(255, 209, 102, 0.65)'
            }}
            onClick={() => handleSocketClick(0)}
            title="Drop matching color here"
            data-socket-index="0"
          >
            {!rightWingColors[0] && <span className="socket-ghost-plus">✨</span>}
            {rightWingColors[0] && <div className="gem-shine-overlay" />}
          </div>

          {/* Socket 1: Lower Right Wing (Mirrored to Left Jewel 1 at x=152, y=222 -> 308, 222) */}
          <div
            ref={(el) => {
              socketRefs.current[1] = el;
            }}
            className={`wing-socket socket-lower ${rightWingColors[1] ? 'filled' : 'empty'} ${hoveredSocketIndex === 1 ? 'drag-hover' : ''} ${wobbleSocketIndex === 1 ? 'wobble' : ''} ${justSnappedIndex === 1 ? 'snapped' : ''}`}
            style={{
              backgroundColor: rightWingColors[1] || 'rgba(10, 26, 16, 0.75)',
              borderColor: rightWingColors[1] ? '#ffffff' : hoveredSocketIndex === 1 ? '#ffd166' : 'rgba(255, 209, 102, 0.65)'
            }}
            onClick={() => handleSocketClick(1)}
            title="Drop matching color here"
            data-socket-index="1"
          >
            {!rightWingColors[1] && <span className="socket-ghost-plus">✨</span>}
            {rightWingColors[1] && <div className="gem-shine-overlay" />}
          </div>
        </div>

        {/* Celebration Stars when Symmetrical Solved */}
        {isSolved && (
          <div className="butterfly-celebration-sparkles">
            <span>✨</span>
            <span style={{ animationDelay: '0.2s' }}>🌟</span>
            <span style={{ animationDelay: '0.4s' }}>✨</span>
          </div>
        )}
      </div>

      {/* Color Palette Shelf: Drag color drops to the matching mirrored wing sockets! */}
      <div className="symmetry-palette-shelf">
        <div className="symmetry-palette-tray">
          {WING_COLORS.map((colDef) => {
            const isSelected = selectedColor === colDef.hex;
            const isBeingDragged = draggedColor === colDef.hex && isDragging;

            return (
              <button
                key={colDef.id}
                type="button"
                className={`symmetry-color-piece ${isSelected ? 'is-selected' : ''} ${isBeingDragged ? 'is-dragged-origin' : ''}`}
                style={{ backgroundColor: colDef.hex }}
                onPointerDown={(e) => handlePointerDown(colDef.hex, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(colDef.hex, e)}
                onPointerCancel={handlePointerCancel}
                onClick={() => setSelectedColor(colDef.hex)}
                aria-label={`Drag ${colDef.name} paint`}
              >
                <span className="color-piece-sparkle">✨</span>
                <div className="gem-shine-overlay" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Drag Clone following pointer during drag-and-drop */}
      {isDragging && draggedColor && dragPos && (
        <div
          className="symmetry-drag-clone"
          style={{
            backgroundColor: draggedColor,
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`
          }}
        >
          <span style={{ fontSize: '26px' }}>✨</span>
          <div className="gem-shine-overlay" />
        </div>
      )}
    </div>
  );
};
