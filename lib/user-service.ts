import { db } from "@/components/firebase-config";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export interface UserProfile {
  displayName: string;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: 'buyer' | 'seller' | 'admin';
  isSeller: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'banned';
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
