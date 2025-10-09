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