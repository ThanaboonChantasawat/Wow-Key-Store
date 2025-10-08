import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/components/firebase-config';
import { Category, Game, GameWithCategories } from './types';

// ดึงข้อมูล categories ทั้งหมด
export const getCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    
    const categories: Category[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Category));
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// ดึงข้อมูล category เดียวตาม id
export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef);
    
    if (categorySnap.exists()) {
      return {
        id: categorySnap.id,
        ...categorySnap.data()
      } as Category;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
};

// ดึงข้อมูล games ทั้งหมด
export const getGames = async (): Promise<Game[]> => {
  try {
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    const games: Game[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Game));
    
    return games;
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
};

// ดึงข้อมูล games พร้อม categories
export const getGamesWithCategories = async (): Promise<GameWithCategories[]> => {
  try {
    const [games, categories] = await Promise.all([
      getGames(),
      getCategories()
    ]);
    
    // Map categories to games
    const gamesWithCategories: GameWithCategories[] = games.map(game => ({
      ...game,
      categories: categories.filter(category => 
        game.categoryIds.includes(category.id)
      )
    }));
    
    return gamesWithCategories;
  } catch (error) {
    console.error('Error fetching games with categories:', error);
    return [];
  }
};

// ดึงข้อมูล games ตาม category
export const getGamesByCategory = async (categoryId: string): Promise<Game[]> => {
  try {
    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef, 
      where('categoryIds', 'array-contains', categoryId),
      orderBy('name')
    );
    const snapshot = await getDocs(q);
    
    const games: Game[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Game));
    
    return games;
  } catch (error) {
    console.error('Error fetching games by category:', error);
    return [];
  }
};

// ดึงข้อมูล game เดียวตาม id
export const getGameById = async (gameId: string): Promise<Game | null> => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (gameSnap.exists()) {
      return {
        id: gameSnap.id,
        ...gameSnap.data()
      } as Game;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
};