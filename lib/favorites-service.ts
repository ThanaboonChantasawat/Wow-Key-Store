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
  itemId: string; // Can be gameId or productId
  itemType: 'game' | 'product'; // Type of item
  gameId?: string; // Keep for backward compatibility
  createdAt: Timestamp;
}

// Add to favorites
export const addToFavorites = async (
  userId: string, 
  itemId: string,
  itemType: 'game' | 'product' = 'game'
) => {
  try {
    const favoriteId = `${userId}_${itemId}`;
    const favoriteRef = doc(db, "favorites", favoriteId);
    
    await setDoc(favoriteRef, {
      userId,
      itemId,
      itemType,
      gameId: itemId, // Keep for backward compatibility
      createdAt: Timestamp.now(),
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

// Remove from favorites
export const removeFromFavorites = async (userId: string, itemId: string) => {
  try {
    const favoriteId = `${userId}_${itemId}`;
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
    
    const itemIds: string[] = [];
    querySnapshot.forEach((doc) => {
      itemIds.push(doc.data().itemId || doc.data().gameId);
    });
    
    return itemIds;
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
};

// Check if item is favorited
export const isFavorited = async (userId: string, itemId: string): Promise<boolean> => {
  try {
    const favoritesRef = collection(db, "favorites");
    const q = query(
      favoritesRef,
      where("userId", "==", userId),
      where("itemId", "==", itemId)
    );
    const querySnapshot = await getDocs(q);
    
    // If not found with itemId, try with gameId for backward compatibility
    if (querySnapshot.empty) {
      const qLegacy = query(
        favoritesRef,
        where("userId", "==", userId),
        where("gameId", "==", itemId)
      );
      const querySnapshotLegacy = await getDocs(qLegacy);
      return !querySnapshotLegacy.empty;
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
};
