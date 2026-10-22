import React, { useState, useEffect } from 'react';

type NatureCategory = 'leaf' | 'stone' | 'fruit';

interface NatureItem {
  id: string;
  name: string;
  emoji: string;
  category: NatureCategory;
}

const NATURE_ITEMS: NatureItem[] = [
  { id: 'leaf_green', name: 'Oak Leaf', emoji: '🍃', category: 'leaf' },
  { id: 'fern', name: 'Fern Frond', emoji: '🌿', category: 'leaf' },
  { id: 'clover', name: 'Four Clover', emoji: '🍀', category: 'leaf' },
  { id: 'pebble', name: 'River Pebble', emoji: '🪨', category: 'stone' },
  { id: 'crystal', name: 'Quartz Gem', emoji: '💎', category: 'stone' },
  { id: 'wood', name: 'Pine Branch', emoji: '🪵', category: 'stone' },
  { id: 'strawberry', name: 'Wild Strawberry', emoji: '🍓', category: 'fruit' },
  { id: 'blueberry', name: 'Woodland Berries', emoji: '🫐', category: 'fruit' },
  { id: 'cherry', name: 'Tree Cherries', emoji: '🍒', category: 'fruit' }
];

interface Props {
  onSolved: () => void;
  onMistake: () => void;
}

export const NatureSortingActivityComponent: React.FC<Props> = ({ onSolved, onMistake }) => {
  const [currentItem, setCurrentItem] = useState<NatureItem>(NATURE_ITEMS[0]);
  const [solvedCount, setSolvedCount] = useState(0);

  const setupItem = () => {
    const random = NATURE_ITEMS[Math.floor(Math.random() * NATURE_ITEMS.length)];
    setCurrentItem(random);
  };

  useEffect(() => {
    setupItem();
  }, []);

  const handleSelectBasket = (category: NatureCategory) => {
    if (currentItem.category === category) {
      const nextCount = solvedCount + 1;
      setSolvedCount(nextCount);

      if (nextCount >= 2) {
        onSolved();
        setSolvedCount(0);
      }
      setupItem();
    } else {
      onMistake();
    }
  };

  return (
    <div className="nature-sorting-container">
      {/* Central Nature Item to sort */}
      <div className="shape-socket" style={{ width: '130px', height: '130px' }}>
        <span style={{ fontSize: '72px' }}>{currentItem.emoji}</span>
      </div>

      {/* 3 Woven Nature Baskets */}
      <div className="nature-baskets-row">
        <button
          type="button"
          className="nature-basket"
          onClick={() => handleSelectBasket('leaf')}
          aria-label="Leaves basket"
        >
          <span style={{ fontSize: '48px' }}>🍃</span>
        </button>

        <button
          type="button"
          className="nature-basket"
          onClick={() => handleSelectBasket('stone')}
          aria-label="Stones basket"
        >
          <span style={{ fontSize: '48px' }}>🪨</span>
        </button>

        <button
          type="button"
          className="nature-basket"
          onClick={() => handleSelectBasket('fruit')}
          aria-label="Berries basket"
        >
          <span style={{ fontSize: '48px' }}>🍓</span>
        </button>
      </div>
    </div>
  );
};
