import { db } from "@/components/firebase-config";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where
} from "firebase/firestore";

export interface Game {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  categories: string[]; // Array of category IDs
  isPopular: boolean; // For homepage display
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Create new game
export async function createGame(gameData: {
  name: string;
  description?: string;
  imageUrl: string;
  categories: string[];
  isPopular?: boolean;
  status?: 'active' | 'inactive';
}): Promise<string> {
  try {
    console.log("createGame called with data:", gameData);
    
    const gameRef = doc(collection(db, "gamesList"));
    const gameId = gameRef.id;
    
    console.log("Generated game ID:", gameId);
    console.log("Game reference path:", gameRef.path);
    
    const dataToSave = {
      id: gameId,
      ...gameData,
      isPopular: gameData.isPopular || false,
      status: gameData.status || 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log("Data to save:", dataToSave);
    
    await setDoc(gameRef, dataToSave);
    
    console.log("Game saved successfully!");
    
    return gameId;
  } catch (error) {
    console.error("Error creating game:", error);
    throw error;
  }
}

// Get all games
export async function getAllGames(): Promise<Game[]> {
  try {
    const gamesRef = collection(db, "gamesList");
    const q = query(gamesRef, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Game[];
  } catch (error) {
    console.error("Error getting games:", error);
    throw error;
  }
}

// Get popular games (for homepage)
export async function getPopularGames(): Promise<Game[]> {
  try {
    const gamesRef = collection(db, "gamesList");
    const q = query(
      gamesRef, 
      where("isPopular", "==", true)
    );
    const snapshot = await getDocs(q);
    
    // Filter and sort on client side to avoid composite index requirement
    const games = snapshot.docs
      .map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Game[];
    
    return games
      .filter(game => game.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting popular games:", error);
    throw error;
  }
}

// Get games by category
export async function getGamesByCategory(categoryId: string): Promise<Game[]> {
  try {
    const gamesRef = collection(db, "gamesList");
    const q = query(
      gamesRef,
      where("categories", "array-contains", categoryId),
      where("status", "==", "active"),
      orderBy("name", "asc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Game[];
  } catch (error) {
    console.error("Error getting games by category:", error);
    throw error;
  }
}

// Get game by ID
export async function getGameById(gameId: string): Promise<Game | null> {
  try {
    const gameRef = doc(db, "gamesList", gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      return null;
    }
    
    const data = gameDoc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Game;
  } catch (error) {
    console.error("Error getting game:", error);
    throw error;
  }
}

// Update game
export async function updateGame(
  gameId: string,
  gameData: Partial<Omit<Game, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const gameRef = doc(db, "gamesList", gameId);
    await updateDoc(gameRef, {
      ...gameData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating game:", error);
    throw error;
  }
}

// Delete game
export async function deleteGame(gameId: string): Promise<void> {
  try {
    const gameRef = doc(db, "gamesList", gameId);
    await deleteDoc(gameRef);
  } catch (error) {
    console.error("Error deleting game:", error);
    throw error;
  }
}
