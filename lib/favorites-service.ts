import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/components/firebase-config";

export interface Favorite {
  id: string;
  userId: string;
  gameId: string;
  createdAt: Timestamp;
}

// Add to favorites
export const addToFavorites = async (userId: string, gameId: string) => {
  try {
    const favoriteId = `${userId}_${gameId}`;
    const favoriteRef = doc(db, "favorites", favoriteId);
    
    await setDoc(favoriteRef, {
      userId,
      gameId,
      createdAt: Timestamp.now(),
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

// Remove from favorites
export const removeFromFavorites = async (userId: string, gameId: string) => {
  try {
    const favoriteId = `${userId}_${gameId}`;
    const favoriteRef = doc(db, "favorites", favoriteId);
    
    await deleteDoc(favoriteRef);
    
    return { success: true };
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
};

// Get user favorites
export const getUserFavorites = async (userId: string): Promise<string[]> => {
  try {
    const favoritesRef = collection(db, "favorites");
    const q = query(favoritesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const gameIds: string[] = [];
    querySnapshot.forEach((doc) => {
      gameIds.push(doc.data().gameId);
    });
    
    return gameIds;
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
};

// Check if game is favorited
export const isFavorited = async (userId: string, gameId: string): Promise<boolean> => {
  try {
    const favoritesRef = collection(db, "favorites");
    const q = query(
      favoritesRef,
      where("userId", "==", userId),
      where("gameId", "==", gameId)
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
};
