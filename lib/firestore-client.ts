// Client-side wrapper for firestore operations
// Calls API routes instead of using Firebase Client SDK directly

import { Category, Game, GameWithCategories } from './types';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch('/api/categories')
    if (!response.ok) throw new Error('Failed to fetch categories')
    return await response.json()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export const getGames = async (): Promise<Game[]> => {
  try {
    const response = await fetch('/api/games')
    if (!response.ok) throw new Error('Failed to fetch games')
    return await response.json()
  } catch (error) {
    console.error('Error fetching games:', error)
    return []
  }
}

export const getGamesWithCategories = async (): Promise<GameWithCategories[]> => {
  try {
    const [games, categories] = await Promise.all([
      getGames(),
      getCategories()
    ])
    
    const gamesWithCategories: GameWithCategories[] = games.map(game => ({
      ...game,
      categories: categories.filter(category => 
        game.categoryIds?.includes(category.id)
      )
    }))
    
    return gamesWithCategories
  } catch (error) {
    console.error('Error fetching games with categories:', error)
    return []
  }
}

export const getGamesByCategory = async (categoryId: string): Promise<Game[]> => {
  try {
    const response = await fetch(`/api/games?categoryId=${categoryId}`)
    if (!response.ok) throw new Error('Failed to fetch games by category')
    return await response.json()
  } catch (error) {
    console.error('Error fetching games by category:', error)
    return []
  }
}

export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
  try {
    const categories = await getCategories()
    return categories.find(c => c.id === categoryId) || null
  } catch (error) {
    console.error('Error fetching category:', error)
    return null
  }
}

// For backward compatibility - keep search function
export const useSearchGames = () => {
  // This will be handled by the hook itself
  return { games: [], loading: false }
}
