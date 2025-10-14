import { db } from "@/components/firebase-config";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export interface UserProfile {
  displayName: string;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: 'buyer' | 'seller' | 'admin' | 'superadmin';
  isSeller: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'banned';
  shopId?: string | null; // ID of seller's shop
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(
  userId: string,
  displayName: string,
  photoURL: string | null = null,
  email?: string,
  emailVerified: boolean = false
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    
    await setDoc(userRef, {
      displayName,
      email: email || null,
      photoURL,
      phoneNumber: null,
      role: 'buyer',
      isSeller: false,
      isVerified: false,
      emailVerified,
      accountStatus: 'active',
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("User profile created successfully:", userId);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        phoneNumber: data.phoneNumber || null,
        role: data.role || 'buyer',
        isSeller: data.isSeller || false,
        isVerified: data.isVerified || false,
        emailVerified: data.emailVerified || false,
        accountStatus: data.accountStatus || 'active',
        shopId: data.shopId || null,
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'createdAt' | 'lastLoginAt'>>
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log("User profile updated successfully:", userId);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating last login:", error);
    throw error;
  }
}

/**
 * Upgrade user to seller
 */
export async function upgradeToSeller(userId: string, shopName: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isSeller: true,
      role: 'seller',
      updatedAt: serverTimestamp()
    });
    
    // Create seller profile in separate collection
    const sellerRef = doc(db, "sellerProfiles", userId);
    await setDoc(sellerRef, {
      shopName,
      shopDescription: null,
      shopLogo: null,
      shopBanner: null,
      sellerRating: 0,
      totalReviews: 0,
      completedSales: 0,
      responseRate: 0,
      responseTime: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("User upgraded to seller:", userId);
  } catch (error) {
    console.error("Error upgrading to seller:", error);
    throw error;
  }
}

/**
 * Update account status
 */
export async function updateAccountStatus(
  userId: string,
  status: 'active' | 'suspended' | 'banned'
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      accountStatus: status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating account status:", error);
    throw error;
  }
}

/**
 * Update user role (admin function)
 */
export async function updateUserRole(
  userId: string,
  newRole: 'buyer' | 'seller' | 'admin' | 'superadmin'
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const updates: Record<string, unknown> = {
      role: newRole,
      updatedAt: serverTimestamp()
    };
    
    // Update isSeller flag
    if (newRole === 'seller') {
      updates.isSeller = true;
    } else if (newRole === 'buyer') {
      updates.isSeller = false;
    }
    
    await updateDoc(userRef, updates);
    console.log("User role updated successfully:", userId, newRole);
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

/**
 * Get all users (admin function)
 */
export async function getAllUsers(): Promise<(UserProfile & { id: string })[]> {
  try {
    const { collection, getDocs, query, orderBy } = await import("firebase/firestore");
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName || "Unknown",
        email: data.email || null,
        photoURL: data.photoURL || null,
        phoneNumber: data.phoneNumber || null,
        role: data.role || 'buyer',
        isSeller: data.isSeller || false,
        isVerified: data.isVerified || false,
        emailVerified: data.emailVerified || false,
        accountStatus: data.accountStatus || 'active',
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}

/**
 * Delete user account (soft delete by marking as deleted)
 * Note: This doesn't delete Firebase Auth account, only Firestore data
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    const { deleteDoc, collection, query, where, getDocs } = await import("firebase/firestore");
    
    // Delete user profile from Firestore
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    
    // Delete user's shop if exists
    const shopsRef = collection(db, "shops");
    const shopsQuery = query(shopsRef, where("ownerId", "==", userId));
    const shopsSnapshot = await getDocs(shopsQuery);
    
    for (const shopDoc of shopsSnapshot.docs) {
      await deleteDoc(shopDoc.ref);
    }
    
    // Note: Additional cleanup can be added here:
    // - Delete user's products
    // - Delete user's orders
    // - Delete user's cart
    // - Delete user's favorites
    // - Delete uploaded images from Storage
    
    console.log("User account deleted successfully:", userId);
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw error;
  }
}

/**
 * Anonymize user data (GDPR compliant alternative to deletion)
 */
export async function anonymizeUserAccount(userId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    
    await updateDoc(userRef, {
      displayName: "Deleted User",
      email: null,
      photoURL: null,
      phoneNumber: null,
      accountStatus: 'banned',
      updatedAt: serverTimestamp()
    });
    
    console.log("User account anonymized:", userId);
  } catch (error) {
    console.error("Error anonymizing user account:", error);
    throw error;
  }
}
