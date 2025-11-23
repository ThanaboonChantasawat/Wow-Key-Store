import { db, auth } from "@/components/firebase-config";
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
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
  popularOrder?: number; // Order for homepage display
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
}

// Create new game (via API route)
export async function createGame(gameData: {
  name: string;
  description?: string;
  imageUrl: string;
  categories: string[];
  isPopular?: boolean;
  status?: 'active' | 'inactive';
}): Promise<string> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(gameData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create game');
    }

    const result = await response.json();
    return result.id;
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

// Update game (via API route)
export async function updateGame(
  gameId: string,
  gameData: Partial<Omit<Game, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch('/api/games', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: gameId, ...gameData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update game');
    }
  } catch (error) {
    console.error("Error updating game:", error);
    throw error;
  }
}

// Delete game (via API route)
export async function deleteGame(gameId: string): Promise<void> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`/api/games?id=${gameId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete game');
    }
  } catch (error) {
    console.error("Error deleting game:", error);
    throw error;
  }
}
