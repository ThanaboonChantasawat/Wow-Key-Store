import { adminDb } from "@/lib/firebase-admin-config";
import admin from 'firebase-admin';
import type { Favorite } from "./favorite-types";

export type { Favorite };

// Add to favorites
export const addToFavorites = async (
  userId: string, 
  itemId: string,
  itemType: 'game' | 'product' | 'shop' = 'game'
) => {
  try {
    const favoriteId = `${userId}_${itemId}`;
    const favoriteRef = adminDb.collection("favorites").doc(favoriteId);
    
    await favoriteRef.set({
      userId,
      itemId,
      itemType,
      gameId: itemId, // Keep for backward compatibility
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const favoriteRef = adminDb.collection("favorites").doc(favoriteId);
    
    await favoriteRef.delete();
    
    return { success: true };
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
};

// Get user favorites
export const getUserFavorites = async (userId: string): Promise<string[]> => {
  try {
    const snapshot = await adminDb.collection("favorites")
      .where("userId", "==", userId)
      .get();
    
    const itemIds: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      itemIds.push(data.itemId || data.gameId);
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
    const snapshot = await adminDb.collection("favorites")
      .where("userId", "==", userId)
      .where("itemId", "==", itemId)
      .get();
    
    // If not found with itemId, try with gameId for backward compatibility
    if (snapshot.empty) {
      const legacySnapshot = await adminDb.collection("favorites")
        .where("userId", "==", userId)
        .where("gameId", "==", itemId)
        .get();
      return !legacySnapshot.empty;
    }
    
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
};
