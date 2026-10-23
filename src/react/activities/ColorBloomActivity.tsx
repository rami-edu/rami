import React, { useState, useEffect, useRef } from 'react';

export interface ColorDef {
  id: string;
  name: string;
  hex: string;
}

export const BLOOM_COLORS: ColorDef[] = [
  { id: 'ruby', name: 'Ruby Red', hex: '#e63946' },
  { id: 'amber', name: 'Golden Amber', hex: '#ffb703' },
  { id: 'emerald', name: 'Emerald Green', hex: '#52b788' },
  { id: 'azure', name: 'Azure Blue', hex: '#48cae4' },
  { id: 'violet', name: 'Purple Violet', hex: '#9d4edd' },
  { id: 'blush', name: 'Rose Pink', hex: '#ff70a6' },
  { id: 'coral', name: 'Coral Orange', hex: '#fb8500' }
];

// 8 Petals arranged evenly around 360 degrees
const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// Sparkle angles around blooming flower
const SPARKLE_ANGLES = [22, 67, 112, 157, 202, 247, 292, 337];

/**
 * Guarantees that the same color is NEVER presented consecutively.
 */
export function pickNextTargetColor(lastColorId: string | null): ColorDef {
  const available = lastColorId
    ? BLOOM_COLORS.filter((c) => c.id !== lastColorId)
    : BLOOM_COLORS;
  return available[Math.floor(Math.random() * available.length)] ?? BLOOM_COLORS[0];
}

/**
 * Calculates progressive flower scale: anchors the pot firmly to the ground
 * while stem & blossom shoot upward upon each correct selection!
 */
export function getFlowerGrowthScale(growthStage: number, isBloomed = false): number {
  const currentBaseScale = Math.min(1.30, 0.85 + (growthStage - 1) * 0.08);
  return isBloomed ? Number((currentBaseScale * 1.12).toFixed(3)) : Number(currentBaseScale.toFixed(3));
}

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const ColorBloomActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [targetColor, setTargetColor] = useState<ColorDef>(BLOOM_COLORS[0]);
  const [choices, setChoices] = useState<ColorDef[]>([]);
  const [isBloomed, setIsBloomed] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);

  // Progressive flower growth level: starts at 1, increases on each correct answer
  const [growthStage, setGrowthStage] = useState(1);
  const lastColorIdRef = useRef<string | null>(null);

  // Drag-and-drop state
  const [draggedColor, setDraggedColor] = useState<ColorDef | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const flowerRef = useRef<HTMLDivElement>(null);

  const setupRound = () => {
    setIsBloomed(false);
    setIsWiggling(false);
    setDraggedColor(null);
    setDragPos(null);
    setIsDragging(false);

    // 1. Pick target color ensuring the SAME color is NEVER presented consecutively!
    const target = pickNextTargetColor(lastColorIdRef.current);
    lastColorIdRef.current = target.id;
    setTargetColor(target);

    // 2. Pick 2 random distractors from remaining colors, shuffled
    const remainingColors = BLOOM_COLORS.filter((c) => c.id !== target.id);
    const shuffledDistractors = [...remainingColors].sort(() => 0.5 - Math.random());
    const distractors = shuffledDistractors.slice(0, 2);
    const roundChoices = [target, ...distractors].sort(() => 0.5 - Math.random());
    setChoices(roundChoices);
  };

  useEffect(() => {
    setupRound();
  }, []);

  const handleSelectColor = (choice: ColorDef) => {
    if (isBloomed) return;

    if (choice.id === targetColor.id) {
      setIsBloomed(true);
      // Flower visibly grows on every correct answer!
      setGrowthStage((prev) => prev + 1);
      onSolved();
      window.setTimeout(() => {
        setupRound();
      }, 1400);
    } else {
      setIsWiggling(true);
      onMistake();
      window.setTimeout(() => {
        setIsWiggling(false);
      }, 500);
    }
  };

  // Pointer drag handling for tactile toddler drag-and-drop
  const handlePointerDown = (choice: ColorDef, e: React.PointerEvent) => {
    if (isBloomed) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDraggedColor(choice);
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
  };

  const handlePointerUp = (choice: ColorDef, e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedColor) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const wasDragged = Math.hypot(dx, dy) > 12;

    if (wasDragged && flowerRef.current) {
      const rect = flowerRef.current.getBoundingClientRect();
      const flowerCenterX = rect.left + rect.width / 2;
      const flowerCenterY = rect.top + rect.height * 0.38; // Center of blossom
      const distanceToFlower = Math.hypot(e.clientX - flowerCenterX, e.clientY - flowerCenterY);

      // Dropped on or near flower blossom (within generous 150px radius)
      if (distanceToFlower < 150) {
        handleSelectColor(draggedColor);
      }
    } else if (!wasDragged) {
      // Simple tap/click
      handleSelectColor(choice);
    }

    dragStartRef.current = null;
    setDraggedColor(null);
    setDragPos(null);
    setIsDragging(false);
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    setDraggedColor(null);
    setDragPos(null);
    setIsDragging(false);
  };

  // Progressive growth scale: base starts at 0.85 and grows by 0.08 per correct answer up to 1.30
  // Pot stays firmly anchored at the bottom while the stem and blossom shoot upward!
  const currentScale = getFlowerGrowthScale(growthStage, isBloomed);

  return (
    <div className="color-bloom-container">
      {/* Complete Flower: Flowerpot, soil, stem, leaves, and full 8-petal blooming blossom */}
      <div
        ref={flowerRef}
        className={`bloom-flower-center ${isWiggling ? 'wiggle' : ''} ${isBloomed ? 'bloomed' : ''}`}
        style={{
          transform: `scale(${currentScale})`,
          transformOrigin: 'center bottom',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        data-growth-stage={growthStage}
      >
        <svg
          className="bloom-flower-svg"
          viewBox="0 0 320 380"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Color Bloom Flower"
        >
          <defs>
            {/* Dewdrop Specular Highlight Gradient */}
            <linearGradient id="nectarGleam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Petal Inner Glow Gradient */}
            <radialGradient id="petalGlow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Terracotta Flowerpot & Soil at the base (y=295..365) */}
          <g id="flower-pot">
            {/* Soft Shadow under pot */}
            <ellipse cx="160" cy="366" rx="56" ry="9" fill="rgba(0, 0, 0, 0.35)" />

            {/* Rich Potting Soil */}
            <ellipse cx="160" cy="302" rx="44" ry="10" fill="#2b180d" stroke="#4a2816" strokeWidth="2" />
            {/* Forest Moss Patch on soil */}
            <ellipse cx="160" cy="301" rx="38" ry="7" fill="#2d6a4f" opacity="0.9" />

            {/* Pot Rim */}
            <rect x="114" y="301" width="92" height="16" rx="5" fill="#bc6c25" stroke="#7f4f24" strokeWidth="2.5" />
            <rect x="117" y="303" width="86" height="5" rx="2.5" fill="#dda15e" opacity="0.75" />

            {/* Pot Body */}
            <path
              d="M 120,317 L 130,358 Q 160,366 190,358 L 200,317 Z"
              fill="#936639"
              stroke="#7f4f24"
              strokeWidth="2.5"
            />
            {/* Pot Body Shading / Highlight */}
            <path
              d="M 126,319 L 134,354 Q 160,361 186,354 L 194,319 Z"
              fill="#a67c52"
              opacity="0.35"
            />

            {/* Golden Garden Emblem on pot */}
            <circle cx="160" cy="338" r="9" fill="#dda15e" stroke="#7f4f24" strokeWidth="1.5" />
            <circle cx="160" cy="338" r="4.5" fill="#bc6c25" />
          </g>

          {/* 2. Curved Green Stem rising from pot into the blossom */}
          <g id="flower-stem">
            {/* Outer stem stroke */}
            <path
              d="M 160,145 Q 155,225 160,305"
              stroke="#1b4332"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Main stem body */}
            <path
              d="M 160,145 Q 155,225 160,305"
              stroke="#2d6a4f"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            {/* Stem light highlight */}
            <path
              d="M 158,148 Q 153,225 158,303"
              stroke="#52b788"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* 3. Lush Green Leaves on the stem with veins */}
          <g id="flower-leaves">
            {/* Left Leaf */}
            <g
              transform={`translate(157, 220) rotate(-35) scale(${Math.min(1.3, 1 + (growthStage - 1) * 0.06)})`}
              style={{ transition: 'transform 0.5s ease-out' }}
            >
              <path
                d="M 0,0 C -30,-15 -55,-5 -60,15 C -45,30 -15,20 0,0 Z"
                fill="#40916c"
                stroke="#1b4332"
                strokeWidth="2.5"
              />
              {/* Leaf Vein */}
              <path
                d="M 0,0 C -25,2 -45,10 -58,15"
                stroke="#74c69d"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </g>

            {/* Right Leaf */}
            <g
              transform={`translate(161, 248) rotate(32) scale(${Math.min(1.3, 1 + (growthStage - 1) * 0.06)})`}
              style={{ transition: 'transform 0.5s ease-out' }}
            >
              <path
                d="M 0,0 C 30,-15 55,-5 60,15 C 45,30 15,20 0,0 Z"
                fill="#52b788"
                stroke="#1b4332"
                strokeWidth="2.5"
              />
              {/* Leaf Vein */}
              <path
                d="M 0,0 C 25,2 45,10 58,15"
                stroke="#95d5b2"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* 4. Complete 8-Petal Blossom centered at (160, 130) */}
          <g
            id="flower-blossom"
            style={{
              transform: isBloomed ? 'scale(1.15)' : `scale(${Math.min(1.24, 1 + (growthStage - 1) * 0.04)})`,
              transformOrigin: '160px 130px',
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Target Color Aura Ring */}
            <circle
              cx="160"
              cy="130"
              r="98"
              fill="none"
              stroke={targetColor.hex}
              strokeWidth="3.5"
              strokeDasharray="8 8"
              opacity={isBloomed ? 0.9 : 0.65}
              className="bloom-aura-ring"
            />

            {/* 8 Full Flower Petals: Rotated around (160, 130) with explicit SVG group transform */}
            {PETAL_ANGLES.map((deg) => (
              <g key={deg} transform={`rotate(${deg}, 160, 130)`}>
                {/* Petal Body (Teardrop / Lotus contour) */}
                <path
                  d="M 160,112 C 138,94 134,56 160,42 C 186,56 182,94 160,112 Z"
                  fill={isBloomed ? targetColor.hex : 'rgba(255, 255, 255, 0.22)'}
                  stroke={isBloomed ? '#ffffff' : targetColor.hex}
                  strokeWidth={isBloomed ? '3' : '2.5'}
                  className="flower-petal"
                  style={{
                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                />

                {/* Petal Inner Glow / Highlight Overlay */}
                <path
                  d="M 160,110 C 142,94 140,64 160,50 C 180,64 178,94 160,110 Z"
                  fill="url(#petalGlow)"
                  opacity={isBloomed ? 0.7 : 0.3}
                  pointerEvents="none"
                />
              </g>
            ))}

            {/* Flower Center Target Vial / Core (Heart of the Blossom) */}
            <circle
              cx="160"
              cy="130"
              r="38"
              fill="none"
              stroke="#ffd166"
              strokeWidth="2.5"
              opacity="0.85"
            />
            <circle
              cx="160"
              cy="130"
              r="34"
              fill={targetColor.hex}
              stroke="#ffffff"
              strokeWidth="4"
              filter="drop-shadow(0 0 10px rgba(255,255,255,0.7))"
              className="flower-center-core"
            />

            {/* Golden Botanical Pistil Seed Dots */}
            {PETAL_ANGLES.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const dotX = 160 + Math.cos(rad) * 22;
              const dotY = 130 + Math.sin(rad) * 22;
              return (
                <circle
                  key={deg}
                  cx={dotX}
                  cy={dotY}
                  r="2.5"
                  fill="#ffd166"
                  opacity={0.85}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Dewy Specular Droplet Highlight on Center */}
            <ellipse
              cx="148"
              cy="118"
              rx="9"
              ry="5"
              fill="url(#nectarGleam)"
              transform="rotate(-30, 148, 118)"
              pointerEvents="none"
            />
          </g>

          {/* 5. Blooming Celebration Sparkles when Solved */}
          {isBloomed && (
            <g id="bloom-celebration-sparkles">
              {SPARKLE_ANGLES.map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const spX = 160 + Math.cos(rad) * 118;
                const spY = 130 + Math.sin(rad) * 118;
                return (
                  <text
                    key={deg}
                    x={spX}
                    y={spY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="18"
                    className="bloom-sparkle-star"
                  >
                    ✨
                  </text>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Color Nectar Pots to choose from */}
      <div className="color-pots-row">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`color-pot ${draggedColor?.id === c.id && isDragging ? 'is-dragged-origin' : ''}`}
            style={{ backgroundColor: c.hex }}
            onPointerDown={(e) => handlePointerDown(c, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(c, e)}
            onPointerCancel={handlePointerCancel}
            aria-label={c.name}
          >
            <span style={{ fontSize: '26px', pointerEvents: 'none' }}>✨</span>
          </button>
        ))}
      </div>

      {/* Floating Drag Avatar following pointer when toddler drags a nectar drop */}
      {isDragging && draggedColor && dragPos && (
        <div
          className="color-pot-drag-clone"
          style={{
            backgroundColor: draggedColor.hex,
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`
          }}
        >
          <span style={{ fontSize: '28px' }}>✨</span>
        </div>
      )}
    </div>
  );
};
