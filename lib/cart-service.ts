import { db } from "@/components/firebase-config";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  getDoc,
  updateDoc,
  increment
} from "firebase/firestore";

export interface CartItem {
  userId: string;
  itemId: string; // Can be gameId or productId
  itemType: 'game' | 'product'; // Type of item
  quantity: number;
  addedAt: Date;
}

// Add item to cart
export async function addToCart(
  userId: string, 
  itemId: string, 
  quantity: number = 1,
  itemType: 'game' | 'product' = 'game'
): Promise<void> {
  try {
    const cartRef = doc(db, "cart", `${userId}_${itemId}`);
    
    // Check if item already exists in cart
    const cartDoc = await getDoc(cartRef);
    
    if (cartDoc.exists()) {
      // Update quantity if item exists
      await updateDoc(cartRef, {
        quantity: increment(quantity)
      });
    } else {
      // Add new item to cart
      await setDoc(cartRef, {
        userId,
        itemId,
        itemType,
        gameId: itemId, // Keep for backward compatibility
        quantity,
        addedAt: new Date()
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw error;
  }
}

// Remove item from cart
export async function removeFromCart(userId: string, itemId: string): Promise<void> {
  try {
    const cartRef = doc(db, "cart", `${userId}_${itemId}`);
    await deleteDoc(cartRef);
  } catch (error) {
    console.error("Error removing from cart:", error);
    throw error;
  }
}

// Update item quantity in cart
export async function updateCartQuantity(userId: string, itemId: string, quantity: number): Promise<void> {
  try {
    if (quantity <= 0) {
      await removeFromCart(userId, itemId);
      return;
    }
    
    const cartRef = doc(db, "cart", `${userId}_${itemId}`);
    await updateDoc(cartRef, {
      quantity
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    throw error;
  }
}

// Get user's cart items
export async function getUserCart(userId: string): Promise<string[]> {
  try {
    const cartQuery = query(collection(db, "cart"), where("userId", "==", userId));
    const querySnapshot = await getDocs(cartQuery);
    
    return querySnapshot.docs.map(doc => doc.data().itemId || doc.data().gameId);
  } catch (error) {
    console.error("Error getting user cart:", error);
    throw error;
  }
}

// Get user's cart items with full details
export async function getUserCartWithDetails(userId: string): Promise<Array<{id: string, itemId: string, itemType: string, quantity: number}>> {
  try {
    const cartQuery = query(collection(db, "cart"), where("userId", "==", userId));
    const querySnapshot = await getDocs(cartQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      itemId: doc.data().itemId || doc.data().gameId,
      itemType: doc.data().itemType || 'game',
      quantity: doc.data().quantity || 1
    }));
  } catch (error) {
    console.error("Error getting user cart:", error);
    throw error;
  }
}

// Check if item is in cart
export async function isInCart(userId: string, itemId: string): Promise<boolean> {
  try {
    const cartRef = doc(db, "cart", `${userId}_${itemId}`);
    const cartDoc = await getDoc(cartRef);
    return cartDoc.exists();
  } catch (error) {
    console.error("Error checking cart:", error);
    return false;
  }
}

// Get cart item count
export async function getCartCount(userId: string): Promise<number> {
  try {
    const cartQuery = query(collection(db, "cart"), where("userId", "==", userId));
    const querySnapshot = await getDocs(cartQuery);
    
    // Sum up all quantities
    let totalCount = 0;
    querySnapshot.docs.forEach(doc => {
      totalCount += doc.data().quantity || 1;
    });
    
    return totalCount;
  } catch (error) {
    console.error("Error getting cart count:", error);
    return 0;
  }
}

// Clear entire cart
export async function clearCart(userId: string): Promise<void> {
  try {
    const cartQuery = query(collection(db, "cart"), where("userId", "==", userId));
    const querySnapshot = await getDocs(cartQuery);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw error;
  }
}
