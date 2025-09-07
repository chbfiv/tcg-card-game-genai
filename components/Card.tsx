import React, { useState, useRef, useEffect } from 'react';
import type { CardData } from '../types';
import SwordIcon from './icons/SwordIcon';
import ShieldIcon from './icons/ShieldIcon';
import HeartIcon from './icons/HeartIcon';
import ImageIcon from './icons/ImageIcon';
import RetryIcon from './icons/RetryIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';

interface CardProps {
  card: CardData;
  isDevMode: boolean;
  shards: number;
  onRegenerateImage: (cardId: string) => void;
  onRegenerateText: (cardId: string) => void;
}

const cardTypeColors = {
  Creature: 'from-red-500 to-red-800',
  Spell: 'from-blue-500 to-blue-800',
  Artifact: 'from-gray-500 to-gray-800',
  Environment: 'from-green-500 to-green-800',
};

const Card: React.FC<CardProps> = ({ card, isDevMode, shards, onRegenerateImage, onRegenerateText }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bgColor = cardTypeColors[card.type] || 'from-purple-500 to-purple-800';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const renderImageArea = () => {
    switch (card.imageState) {
      case 'loading':
        return (
          <div className="w-full h-full flex justify-center items-center">
            <div className="w-10 h-10 border-2 border-dashed rounded-full animate-spin border-indigo-300"></div>
          </div>
        );
      case 'error':
        return (
          <div className="w-full h-full flex flex-col justify-center items-center text-center text-red-300">
            <p className="text-sm mb-2">Image failed</p>
            <button
              onClick={() => onRegenerateImage(card.id)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              title={shards > 0 ? "Retry Image Generation (1 Shard)" : "Not enough shards"}
              disabled={shards < 1}
            >
              <RetryIcon className="w-6 h-6" />
            </button>
          </div>
        );
      case 'success':
        return <img src={card.imageUrl} alt={`Art for ${card.name}`} className="w-full h-full object-cover" />;
      case 'pending':
      default:
        return (
          <div className="w-full h-full flex justify-center items-center bg-gray-900">
            <ImageIcon className="w-16 h-16 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <div id={card.id} className="relative w-[300px] h-[420px] bg-gray-800 rounded-xl shadow-lg overflow-hidden border-4 border-gray-600 flex flex-col p-2 transform transition-transform hover:scale-105 hover:shadow-indigo-500/50 break-inside-avoid">
      {isDevMode && (
        <div ref={menuRef} className="absolute top-3 right-3 z-20">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 bg-gray-900 bg-opacity-60 rounded-full hover:bg-opacity-80">
            <DotsVerticalIcon className="w-5 h-5 text-white" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1">
              <button 
                onClick={() => { onRegenerateImage(card.id); setIsMenuOpen(false); }} 
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 disabled:text-gray-500 disabled:hover:bg-gray-800 disabled:cursor-not-allowed"
                disabled={shards < 1}
              >
                Regenerate Image (1 Shard)
              </button>
              <button 
                onClick={() => { onRegenerateText(card.id); setIsMenuOpen(false); }} 
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 disabled:text-gray-500 disabled:hover:bg-gray-800 disabled:cursor-not-allowed"
                disabled={shards < 1}
              >
                Regenerate Text (1 Shard)
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Header */}
      <div className={`flex justify-between items-center bg-gradient-to-r ${bgColor} p-2 rounded-t-md`}>
        <h2 className="text-lg font-bold text-white truncate drop-shadow-md pr-8">{card.name}</h2>
        <span className="text-sm font-semibold bg-gray-900 bg-opacity-50 px-2 py-1 rounded-full">{card.type}</span>
      </div>

      {/* Image */}
      <div className="w-full h-48 bg-black my-2 border-2 border-gray-500 rounded-md overflow-hidden">
        {renderImageArea()}
      </div>

      {/* Ability Text */}
      <div className="flex-grow bg-gray-700 p-2 rounded-md text-sm text-gray-200 border border-gray-600 overflow-y-auto">
        <p>{card.ability}</p>
      </div>

      {/* Stats */}
      {card.type === 'Creature' && (
        <div className="flex justify-around items-center mt-2 p-2 bg-gray-900 rounded-b-md">
          <div className="flex items-center space-x-1" title="Attack">
            <SwordIcon className="w-6 h-6 text-red-400" />
            <span className="text-xl font-bold text-white">{card.attack}</span>
          </div>
          <div className="flex items-center space-x-1" title="Defense">
            <ShieldIcon className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold text-white">{card.defense}</span>
          </div>
          <div className="flex items-center space-x-1" title="Health">
            <HeartIcon className="w-6 h-6 text-green-400" />
            <span className="text-xl font-bold text-white">{card.health}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Card;
