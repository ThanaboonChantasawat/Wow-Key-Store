// Client-side wrapper for favorites service
// Calls API routes instead of directly accessing Firestore
import type { Favorite } from "./favorite-types";

export type { Favorite };

// Add to favorites
export const addToFavorites = async (
  userId: string, 
  itemId: string,
  itemType: 'game' | 'product' = 'game'
) => {
  const response = await fetch('/api/favorites/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, itemId, itemType })
  });

  if (!response.ok) {
    throw new Error('Failed to add to favorites');
  }

  return await response.json();
};

// Remove from favorites
export const removeFromFavorites = async (userId: string, itemId: string) => {
  const response = await fetch('/api/favorites/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, itemId })
  });

  if (!response.ok) {
    throw new Error('Failed to remove from favorites');
  }

  return await response.json();
};

// Get user favorites
export const getUserFavorites = async (userId: string): Promise<string[]> => {
  const response = await fetch(`/api/favorites/user/${userId}`);
  
  if (!response.ok) {
    console.error('Failed to get favorites');
    return [];
  }

  return await response.json();
};

// Check if item is favorited
export const isFavorited = async (userId: string, itemId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/favorites/check?userId=${userId}&itemId=${itemId}`);
    
    if (!response.ok) {
      console.error('Failed to check favorite status');
      return false;
    }

    const data = await response.json();
    return data.isFavorited;
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
};
