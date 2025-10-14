'use client'

import { useState, useEffect } from 'react';
import { GameWithCategories, Category } from '@/lib/types';
import { getGamesWithCategories, getCategories, getGamesByCategory } from '@/lib/firestore-service';

// Hook สำหรับดึงข้อมูลเกมทั้งหมดพร้อม categories
export const useGames = () => {
  const [games, setGames] = useState<GameWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);
        const gamesData = await getGamesWithCategories();
        setGames(gamesData);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูลเกม');
        console.error('Error fetching games:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const refreshGames = async () => {
    try {
      setError(null);
      const gamesData = await getGamesWithCategories();
      setGames(gamesData);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการรีเฟรชข้อมูลเกม');
      console.error('Error refreshing games:', err);
    }
  };

  return { games, loading, error, refreshGames };
};

// Hook สำหรับดึงข้อมูล categories
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่');
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
};

// Hook สำหรับดึงข้อมูลเกมตาม category ที่เลือก
export const useGamesByCategory = (categoryId: string | null) => {
  const [games, setGames] = useState<GameWithCategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGamesByCategory = async () => {
      console.log('useGamesByCategory - fetching with categoryId:', categoryId);
      
      if (!categoryId) {
        // ถ้าไม่มี categoryId ให้ดึงเกมทั้งหมด
        try {
          setLoading(true);
          setError(null);
          console.log('useGamesByCategory - fetching all games');
          const gamesData = await getGamesWithCategories();
          console.log('useGamesByCategory - all games fetched:', gamesData.length, gamesData);
          setGames(gamesData);
        } catch (err) {
          setError('เกิดข้อผิดพลาดในการดึงข้อมูลเกม');
          console.error('Error fetching all games:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('useGamesByCategory - fetching games for category:', categoryId);
        const gamesData = await getGamesByCategory(categoryId);
        console.log('useGamesByCategory - category games fetched:', gamesData.length, gamesData);
        // Convert to GameWithCategories (without populating categories for performance)
        const gamesWithCategories: GameWithCategories[] = gamesData.map(game => ({
          ...game,
          categories: []
        }));
        console.log('useGamesByCategory - setting games:', gamesWithCategories.length);
        setGames(gamesWithCategories);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูลเกม');
        console.error('Error fetching games by category:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGamesByCategory();
  }, [categoryId]);

  return { games, loading, error };
};

// Hook สำหรับค้นหาเกมด้วยข้อความค้นหา (และ optional category)
export const useSearchGames = (queryText: string | null, categoryId?: string | null) => {
  const [games, setGames] = useState<GameWithCategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndFilter = async () => {
      setLoading(true);
      setError(null);
      try {
        const allGames = await getGamesWithCategories();
        let filtered = allGames;

        if (categoryId) {
          filtered = filtered.filter(g => Array.isArray(g.categoryIds) && g.categoryIds.includes(categoryId));
        }

        if (queryText && queryText.trim() !== '') {
          const q = queryText.trim().toLowerCase();
          filtered = filtered.filter(g => (g.name || '').toLowerCase().includes(q));
        }

        setGames(filtered);
      } catch (err) {
        console.error('useSearchGames error:', err);
        setError('เกิดข้อผิดพลาดในการค้นหาเกม');
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilter();
  }, [queryText, categoryId]);

  return { games, loading, error };
};

// Hook สำหรับดึงข้อมูลเกมตาม game ID ที่เลือก
export const useGamesByGameId = (gameId: string | null) => {
  const [games, setGames] = useState<GameWithCategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGamesByGameId = async () => {
      if (!gameId) {
        // ถ้าไม่มี gameId ให้ดึงเกมทั้งหมด
        try {
          setLoading(true);
          setError(null);
          const gamesData = await getGamesWithCategories();
          setGames(gamesData);
        } catch (err) {
          setError('เกิดข้อผิดพลาดในการดึงข้อมูลเกม');
          console.error('Error fetching all games:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const allGames = await getGamesWithCategories();
        // Filter games that match the selected game's gameId
        const filteredGames = allGames.filter(game => game.id === gameId || game.gameId === gameId);
        setGames(filteredGames);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูลเกม');
        console.error('Error fetching games by game ID:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGamesByGameId();
  }, [gameId]);

  return { games, loading, error };
};
// Hook สำหรับดึงข้อมูล favorite items (products และ games)
export const useFavoriteGames = (userId: string | null) => {
  const [games, setGames] = useState<GameWithCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavoriteItems = async () => {
      if (!userId) {
        setGames([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get user's favorite item IDs
        const { getUserFavorites } = await import('@/lib/favorites-service');
        const favoriteItemIds = await getUserFavorites(userId);
        
        if (favoriteItemIds.length === 0) {
          setGames([]);
          setLoading(false);
          return;
        }

        // Import product service
        const { getAllProducts } = await import('@/lib/product-service');
        
        // Get all products
        const allProducts = await getAllProducts();
        
        // Filter favorite products
        const favoriteProducts = allProducts.filter(product => 
          favoriteItemIds.includes(product.id)
        );
        
        // Convert products to GameWithCategories format
        const favoriteGames: GameWithCategories[] = favoriteProducts.map(product => ({
          id: product.id,
          gameId: product.gameId,
          name: product.name,
          description: product.description,
          price: product.price,
          gameImages: product.images.length > 0 
            ? [{
                images: product.images.map((url, index) => ({
                  url,
                  isCover: index === 0,
                  order: index
                }))
              }]
            : [],
          categoryIds: [],
          categories: []
        }));
        
        setGames(favoriteGames);
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
        console.error('Error fetching favorite items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteItems();
  }, [userId]);

  return { games, loading, error };
};
