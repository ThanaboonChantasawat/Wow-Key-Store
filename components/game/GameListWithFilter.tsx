'use client'

import { useState } from 'react';
import CategoryFilter from '../category/CategoryFilter';
import GameCard from '../card/GameCard';
import { useGamesByCategory } from '@/hooks/useFirestore';

interface GameListWithFilterProps {
  limit?: number;
  showCategoryFilter?: boolean;
  title?: string;
}

const GameListWithFilter = ({ 
  limit, 
  showCategoryFilter = true, 
  title = "เกมทั้งหมด" 
}: GameListWithFilterProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { games, loading, error } = useGamesByCategory(selectedCategoryId);

  return (
    <div className="w-full">
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{title}</h2>
      )}
      
      {showCategoryFilter && (
        <CategoryFilter 
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
        />
      )}
      
      <GameCard 
        games={games}
        loading={loading}
        error={error}
        limit={limit}
      />
    </div>
  );
};

export default GameListWithFilter;