import React from 'react';
import type { CowBreed } from '../types';
import { Stars } from './ui/Stars';
import { Binoculars, Heart } from 'lucide-react';

interface CowCardProps {
  cow: CowBreed;
  mainPhoto?: string;
  fallbackPhoto?: string;
  seenCount: number;
  isWishlisted: boolean;
  onClick: () => void;
  onSpot: (e: React.MouseEvent) => void;
}

export const CowCard: React.FC<CowCardProps> = ({ 
  cow, 
  mainPhoto,
  fallbackPhoto,
  seenCount, 
  isWishlisted, 
  onClick, 
  onSpot 
}) => {
  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 1: return 'bg-rarity-1';
      case 2: return 'bg-rarity-2';
      case 3: return 'bg-rarity-3';
      case 4: return 'bg-rarity-4';
      case 5: return 'bg-rarity-5';
      case 6: return 'bg-rarity-6';
      default: return 'bg-rarity-1';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        ${getRarityColor(cow.rarity)} rounded-md retro-shadow p-3 flex items-center gap-3 cursor-pointer transition-transform active:scale-95
        ${seenCount > 0 ? 'border-2 border-cow-accent' : ''}
      `}
    >
      {/* Icon/Image Placeholder */}
      <div className="w-16 h-16 bg-white rounded flex-shrink-0 overflow-hidden border border-orange-200 flex items-center justify-center">
        {mainPhoto ? (
          <img src={mainPhoto} className="w-full h-full object-cover" alt={cow.name} />
        ) : fallbackPhoto ? (
          <img src={fallbackPhoto} className="w-full h-full object-cover" alt={cow.name} />
        ) : (
          <span className="text-3xl text-cow-accent opacity-50">🐄</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-1">
          <h3 className="font-bold text-lg leading-tight truncate">{cow.name}</h3>
          <div className="flex-shrink-0">
            <Stars count={cow.rarity} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {cow.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-white/50 px-1 rounded border border-orange-200 text-cow-text">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          {seenCount > 0 && (
            <span className="text-xs bg-cow-accent text-white px-1.5 rounded">Seen x{seenCount}</span>
          )}
          {isWishlisted && (
            <span className="text-xs bg-white text-cow-accent px-1.5 rounded border border-cow-accent flex items-center gap-1">
              <Heart size={10} className="fill-current" /> Wanted
            </span>
          )}
        </div>
      </div>

      {/* Spot Button */}
      <button 
        onClick={onSpot}
        className="w-10 h-10 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-cow-accent hover:bg-orange-50 shadow-sm border border-orange-200"
      >
        <Binoculars size={20} />
      </button>
    </div>
  );
};
