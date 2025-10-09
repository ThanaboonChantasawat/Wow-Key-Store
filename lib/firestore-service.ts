import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/components/firebase-config';
import { Category, Game, GameWithCategories } from './types';

// ดึงข้อมูล categories ทั้งหมด
export const getCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    console.log('getCategories - snapshot size:', snapshot.size);
    
    const categories: Category[] = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('getCategories - category doc:', doc.id, data);
      return {
        id: doc.id,
        ...data
      } as Category;
    });
    
    console.log('getCategories - final categories:', categories);
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
    console.log('getGames - snapshot size:', snapshot.size);
    
    const games: Game[] = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('getGames - game doc:', doc.id, 'categoryIds:', data.categoryIds);
      return {
        id: doc.id,
        ...data
      } as Game;
    });
    
    console.log('getGames - final games:', games.length);
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
    console.log('getGamesByCategory - searching for categoryId:', categoryId);
    
    // ใช้ Firestore query แบบปกติก่อน
    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef, 
      where('categoryIds', 'array-contains', categoryId)
    );
    const snapshot = await getDocs(q);
    console.log('getGamesByCategory - query snapshot size:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('getGamesByCategory - no games found with Firestore query, trying fallback...');
      
      // Fallback: ดึงข้อมูลทั้งหมดแล้วกรองใน client side
      const allGames = await getGames();
      console.log('getGamesByCategory - all games fetched for filtering:', allGames.length);
      
      const filteredGames = allGames.filter(game => {
        const hasCategory = game.categoryIds && Array.isArray(game.categoryIds) && game.categoryIds.includes(categoryId);
        if (game.categoryIds) {
          console.log('getGamesByCategory - checking game:', game.name, 'categoryIds:', game.categoryIds, 'looking for:', categoryId, 'hasCategory:', hasCategory);
        }
        return hasCategory;
      });
      
      console.log('getGamesByCategory - filtered games (fallback):', filteredGames.length, filteredGames);
      return filteredGames;
    }
    
    const games: Game[] = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('getGamesByCategory - game found via query:', doc.id, data.name, 'categoryIds:', data.categoryIds);
      return {
        id: doc.id,
        ...data
      } as Game;
    });
    
    // Sort manually
    games.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('getGamesByCategory - found games via query:', games.length, games);
    return games;
  } catch (error) {
    console.error('Error fetching games by category:', error);
    
    // ถ้า query ล้มเหลว ให้ลอง fallback
    console.log('getGamesByCategory - query failed, trying fallback...');
    try {
      const allGames = await getGames();
      const filteredGames = allGames.filter(game => 
        game.categoryIds && Array.isArray(game.categoryIds) && game.categoryIds.includes(categoryId)
      );
      console.log('getGamesByCategory - fallback result:', filteredGames.length);
      return filteredGames;
    } catch (fallbackError) {
      console.error('getGamesByCategory - fallback also failed:', fallbackError);
      return [];
    }
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