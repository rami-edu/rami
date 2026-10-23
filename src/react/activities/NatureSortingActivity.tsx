import React, { useState, useRef } from 'react';
import { audioManager } from '../../managers/AudioManager';

export type NatureCategory = 'leaf' | 'stone' | 'fruit';

export interface NatureItem {
  id: string;
  name: string;
  emoji: string;
  category: NatureCategory;
}

export const NATURE_ITEMS: NatureItem[] = [
  // Leaves Class
  { id: 'leaf_oak', name: 'Oak Leaf', emoji: '🍃', category: 'leaf' },
  { id: 'fern', name: 'Fern Frond', emoji: '🌿', category: 'leaf' },
  { id: 'clover', name: 'Four Clover', emoji: '🍀', category: 'leaf' },
  { id: 'maple', name: 'Maple Leaf', emoji: '🍁', category: 'leaf' },

  // Stones Class
  { id: 'pebble', name: 'River Pebble', emoji: '🪨', category: 'stone' },
  { id: 'crystal', name: 'Quartz Gem', emoji: '💎', category: 'stone' },
  { id: 'rock', name: 'Mountain Rock', emoji: '⛰️', category: 'stone' },
  { id: 'amber', name: 'Amber Stone', emoji: '🔶', category: 'stone' },

  // Fruits Class
  { id: 'strawberry', name: 'Wild Strawberry', emoji: '🍓', category: 'fruit' },
  { id: 'blueberry', name: 'Woodland Berries', emoji: '🫐', category: 'fruit' },
  { id: 'cherry', name: 'Tree Cherries', emoji: '🍒', category: 'fruit' },
  { id: 'apple', name: 'Forest Apple', emoji: '🍎', category: 'fruit' }
];

export interface BasketDef {
  category: NatureCategory;
  name: string;
  logoEmoji: string;
  color: string;
  accentColor: string;
  label: string;
}

export const BASKETS: BasketDef[] = [
  {
    category: 'leaf',
    name: 'Leaves Basket',
    logoEmoji: '🍃',
    color: '#2d6a4f',
    accentColor: '#52b788',
    label: 'Leaves'
  },
  {
    category: 'stone',
    name: 'Stones Basket',
    logoEmoji: '🪨',
    color: '#495057',
    accentColor: '#adb5bd',
    label: 'Stones'
  },
  {
    category: 'fruit',
    name: 'Berries Basket',
    logoEmoji: '🍓',
    color: '#9d0208',
    accentColor: '#ff70a6',
    label: 'Berries'
  }
];

export const createRoundItems = (): NatureItem[] => {
  const leafCandidates = NATURE_ITEMS.filter((i) => i.category === 'leaf');
  const stoneCandidates = NATURE_ITEMS.filter((i) => i.category === 'stone');
  const fruitCandidates = NATURE_ITEMS.filter((i) => i.category === 'fruit');

  const randomLeaf = leafCandidates[Math.floor(Math.random() * leafCandidates.length)] || leafCandidates[0];
  const randomStone = stoneCandidates[Math.floor(Math.random() * stoneCandidates.length)] || stoneCandidates[0];
  const randomFruit = fruitCandidates[Math.floor(Math.random() * fruitCandidates.length)] || fruitCandidates[0];

  return [randomLeaf, randomStone, randomFruit].sort(() => 0.5 - Math.random());
};

export interface FlyingItem {
  id: string;
  item: NatureItem;
  category: NatureCategory;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  targetX: number;
  targetY: number;
}

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const NatureSortingActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  // Items currently waiting to be sorted on the woodland tray
  const [remainingItems, setRemainingItems] = useState<NatureItem[]>(() => createRoundItems());
  // Currently active/spotlighted item
  const [activeItem, setActiveItem] = useState<NatureItem | null>(() => remainingItems[0] || null);
  // Items visibly contained inside each basket: { leaf: [...], stone: [...], fruit: [...] }
  const [basketContents, setBasketContents] = useState<Record<NatureCategory, NatureItem[]>>({
    leaf: [],
    stone: [],
    fruit: []
  });

  const [wobbleBasket, setWobbleBasket] = useState<NatureCategory | null>(null);
  const [catchingBasket, setCatchingBasket] = useState<NatureCategory | null>(null);
  const [catchBurstBasket, setCatchBurstBasket] = useState<NatureCategory | null>(null);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [isRoundComplete, setIsRoundComplete] = useState(false);

  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState<NatureItem | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const basketRefs = useRef<Record<NatureCategory, HTMLDivElement | null>>({
    leaf: null,
    stone: null,
    fruit: null
  });

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Pick one random item from each class to ensure a balanced, rewarding 3-item round
  const setupRound = () => {
    setIsRoundComplete(false);
    setWobbleBasket(null);
    setCatchingBasket(null);
    setCatchBurstBasket(null);
    setFlyingItems([]);
    setDraggedItem(null);
    setDragPos(null);
    setIsDragging(false);

    // Empty the baskets for the new round
    setBasketContents({
      leaf: [],
      stone: [],
      fruit: []
    });

    const roundItems = createRoundItems();
    setRemainingItems(roundItems);
    setActiveItem(roundItems[0] || null);
  };

  // Handle selecting a basket as the destination for the active/dragged item
  const handleSelectBasket = (
    category: NatureCategory,
    itemToSort?: NatureItem,
    dropCoords?: { x: number; y: number } | null
  ) => {
    const targetItem = itemToSort || activeItem;
    if (!targetItem || isRoundComplete) return;

    if (targetItem.category === category) {
      // Correct class! Play sound cue
      audioManager.playPortalReturn();

      // Immediately remove item from tray so it cannot be double-triggered
      const nextRemaining = remainingItems.filter((i) => i.id !== targetItem.id);
      setRemainingItems(nextRemaining);
      setActiveItem(nextRemaining[0] || null);

      // Determine flight origin (drop coordinates or center of tray button)
      let startX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
      let startY = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 450;

      if (dropCoords) {
        startX = dropCoords.x;
        startY = dropCoords.y;
      } else if (itemRefs.current[targetItem.id]) {
        const iRect = itemRefs.current[targetItem.id]!.getBoundingClientRect();
        if (iRect.width > 0) {
          startX = iRect.left + iRect.width / 2;
          startY = iRect.top + iRect.height / 2;
        }
      }

      // Determine flight destination (center of target basket interior slot)
      let targetX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
      let targetY = typeof window !== 'undefined' ? window.innerHeight * 0.35 : 200;

      if (basketRefs.current[category]) {
        const bRect = basketRefs.current[category]!.getBoundingClientRect();
        if (bRect.width > 0) {
          targetX = bRect.left + bRect.width / 2;
          // Target the open basket interior mouth
          targetY = bRect.top + bRect.height * 0.32;
        }
      }

      const midX = (startX + targetX) / 2;
      const arcHeight = Math.max(45, Math.abs(startX - targetX) * 0.28);
      const midY = Math.min(startY, targetY) - arcHeight;

      const flyingId = `${targetItem.id}-${Date.now()}`;
      const newFlyingItem: FlyingItem = {
        id: flyingId,
        item: targetItem,
        category,
        startX,
        startY,
        midX,
        midY,
        targetX,
        targetY
      };

      setFlyingItems((prev) => [...prev, newFlyingItem]);

      // Flight animation duration is 480ms
      window.setTimeout(() => {
        // Remove flying item
        setFlyingItems((prev) => prev.filter((f) => f.id !== flyingId));

        // Put the item visibly inside the basket interior
        setBasketContents((prev) => ({
          ...prev,
          [category]: [...prev[category], targetItem]
        }));

        // Trigger basket catch reaction and sparkle burst
        setCatchingBasket(category);
        setCatchBurstBasket(category);
        window.setTimeout(() => setCatchingBasket(null), 380);
        window.setTimeout(() => setCatchBurstBasket(null), 500);

        // Check if all items in the round have been sorted into their baskets
        if (nextRemaining.length === 0) {
          setIsRoundComplete(true);
          onSolved();
          window.setTimeout(() => {
            setupRound();
          }, 1500);
        }
      }, 480);
    } else {
      // Wrong basket: soft wobble animation and gentle pedagogical retry
      setWobbleBasket(category);
      onMistake();
      window.setTimeout(() => {
        setWobbleBasket(null);
      }, 500);
    }
  };

  // Drag handling
  const handlePointerDown = (item: NatureItem, e: React.PointerEvent) => {
    if (isRoundComplete) return;
    setActiveItem(item);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDraggedItem(item);
    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedItem) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 8) {
      setIsDragging(true);
    }
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (item: NatureItem, e: React.PointerEvent) => {
    if (!dragStartRef.current || !draggedItem) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const wasDragged = Math.hypot(dx, dy) > 12;

    if (wasDragged) {
      // Check which basket the item was dropped onto
      let matchedCategory: NatureCategory | null = null;

      for (const b of BASKETS) {
        const el = basketRefs.current[b.category];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            matchedCategory = b.category;
            break;
          }
        }
      }

      if (matchedCategory) {
        handleSelectBasket(matchedCategory, draggedItem, { x: e.clientX, y: e.clientY });
      }
    } else {
      // Simple tap selects the item
      setActiveItem(item);
    }

    dragStartRef.current = null;
    setDraggedItem(null);
    setDragPos(null);
    setIsDragging(false);
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    setDraggedItem(null);
    setDragPos(null);
    setIsDragging(false);
  };

  return (
    <div className="nature-sorting-container">
      {/* 3 Selectable Nature Baskets with visible class logos & visible contained items */}
      <div className="nature-baskets-row">
        {BASKETS.map((basket) => {
          const contained = basketContents[basket.category];
          const isTargetCategory = activeItem?.category === basket.category;
          const isWobbling = wobbleBasket === basket.category;
          const isCatching = catchingBasket === basket.category;
          const isBursting = catchBurstBasket === basket.category;

          return (
            <div
              key={basket.category}
              ref={(el) => {
                basketRefs.current[basket.category] = el;
              }}
              className={`nature-basket ${isWobbling ? 'wobble' : ''} ${isCatching ? 'catching' : ''} ${isRoundComplete ? 'celebrating' : ''} ${isTargetCategory ? 'hint-glow' : ''}`}
              onClick={() => handleSelectBasket(basket.category)}
              role="button"
              tabIndex={0}
              aria-label={`${basket.label} Basket (select to sort item here)`}
              data-category={basket.category}
            >
              {/* Basket Catch Burst Sparkles when an item lands inside */}
              {isBursting && (
                <div className="basket-catch-burst">
                  <span>✨</span>
                </div>
              )}

              {/* Basket Overhead Arch Handle */}
              <div
                className="basket-handle"
                style={{ borderColor: basket.color }}
              />

              {/* Basket Open Interior: Items put inside are clearly visible! */}
              <div className="basket-interior">
                {contained.length === 0 ? (
                  <div className="basket-empty-slot" title="Ready for items">
                    <span className="basket-empty-icon" style={{ opacity: 0.35 }}>
                      {basket.logoEmoji}
                    </span>
                  </div>
                ) : (
                  <div className="basket-items-nest">
                    {contained.map((cItem, idx) => (
                      <div
                        key={`${cItem.id}-${idx}`}
                        className="basket-contained-item"
                        title={cItem.name}
                      >
                        <span className="contained-item-emoji">{cItem.emoji}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Front Wicker Hamper Body */}
              <div className="basket-body" style={{ borderColor: basket.accentColor }}>
                <div className="basket-weave-texture" />

                {/* Class Logo Emblem Badge on Front of Basket */}
                <div
                  className="basket-class-badge"
                  style={{
                    borderColor: basket.accentColor,
                    boxShadow: `0 4px 14px ${basket.color}99`
                  }}
                >
                  <span className="basket-class-logo-emoji">{basket.logoEmoji}</span>
                  <span className="basket-class-logo-label">{basket.label}</span>
                </div>
              </div>

              {/* Celebration Sparkles when Round is Solved */}
              {isRoundComplete && (
                <div className="basket-celebration-sparkles">
                  <span>✨</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unsorted Woodland Treasures Tray */}
      <div className="nature-tray-section">
        <div className="nature-tray-pedestal">
          {remainingItems.length > 0 ? (
            <div className="nature-items-tray">
              {remainingItems.map((item) => {
                const isSelected = activeItem?.id === item.id;
                const isBeingDragged = draggedItem?.id === item.id && isDragging;

                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    className={`nature-item-piece ${isSelected ? 'is-selected' : ''} ${isBeingDragged ? 'is-dragged-origin' : ''}`}
                    onPointerDown={(e) => handlePointerDown(item, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => handlePointerUp(item, e)}
                    onPointerCancel={handlePointerCancel}
                    onClick={() => setActiveItem(item)}
                    aria-label={`Select ${item.name}`}
                  >
                    <span className="item-piece-emoji">{item.emoji}</span>
                    {isSelected && <div className="item-piece-selection-aura" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="nature-tray-complete">
              <span style={{ fontSize: '36px' }}>🌟</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Drag Clone following pointer when dragging an item */}
      {isDragging && draggedItem && dragPos && (
        <div
          className="nature-item-drag-clone"
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`
          }}
        >
          <span style={{ fontSize: '46px' }}>{draggedItem.emoji}</span>
        </div>
      )}

      {/* Animated Items Flying into Basket */}
      {flyingItems.map((fItem) => (
        <div
          key={fItem.id}
          className="nature-flying-item"
          style={
            {
              '--start-x': `${fItem.startX - 32}px`,
              '--start-y': `${fItem.startY - 32}px`,
              '--mid-x': `${fItem.midX - 32}px`,
              '--mid-y': `${fItem.midY - 32}px`,
              '--target-x': `${fItem.targetX - 32}px`,
              '--target-y': `${fItem.targetY - 32}px`
            } as React.CSSProperties
          }
        >
          <span className="flying-item-emoji">{fItem.item.emoji}</span>
          <div className="flying-item-sparkle-trail">✨</div>
        </div>
      ))}
    </div>
  );
};
