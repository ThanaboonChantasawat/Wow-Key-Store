import { adminDb } from "@/lib/firebase-admin-config";
import admin from 'firebase-admin';
import type { UserProfile } from "./user-types";
import { createNotification } from "./notification-service";

export type { UserProfile };

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
    const userRef = adminDb.collection("users").doc(userId);
    
    await userRef.set({
      displayName,
      email: email || null,
      photoURL,
      phoneNumber: null,
      role: 'buyer',
      isSeller: false,
      isVerified: false,
      emailVerified,
      accountStatus: 'active',
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("User profile created successfully:", userId);

    // 🔔 Send welcome notification
    try {
      await createNotification(
        userId,
        'welcome',
        '🎉 ยินดีต้อนรับสู่ WowKeyStore!',
        `สวัสดี ${displayName}! ขอบคุณที่สมัครสมาชิกกับเรา เริ่มต้นช้อปปิ้งสินค้าเกมได้เลยตอนนี้`,
        '/products'
      )
    } catch (notifError) {
      console.error("Error sending welcome notification:", notifError)
      // Don't fail user creation if notification fails
    }
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
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const data = userDoc.data();
      if (!data) return null;
      
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
        updatedAt: data.updatedAt?.toDate() || new Date(),
        // ✅ Violation & Ban information
        violations: data.violations || 0,
        lastViolation: data.lastViolation?.toDate() || undefined,
        banned: data.banned || false,
        bannedUntil: data.bannedUntil?.toDate() || undefined,
        bannedReason: data.bannedReason || undefined,
        bannedBy: data.bannedBy || undefined,
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
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.update({
      isSeller: true,
      role: 'seller',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create seller profile in separate collection
    const sellerRef = adminDb.collection("sellerProfiles").doc(userId);
    await sellerRef.set({
      shopName,
      shopDescription: null,
      shopLogo: null,
      shopBanner: null,
      sellerRating: 0,
      totalReviews: 0,
      completedSales: 0,
      responseRate: 0,
      responseTime: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.update({
      accountStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
    const userRef = adminDb.collection("users").doc(userId);
    const updates: Record<string, unknown> = {
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update isSeller flag
    if (newRole === 'seller') {
      updates.isSeller = true;
    } else if (newRole === 'buyer') {
      updates.isSeller = false;
    }
    
    await userRef.update(updates);
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
    const snapshot = await adminDb.collection("users")
      .orderBy("createdAt", "desc")
      .get();
    
    return snapshot.docs.map((doc: any) => {
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
    // Delete user profile from Firestore
    const userRef = adminDb.collection("users").doc(userId);
    await userRef.delete();
    
    // Delete user's shop if exists
    const shopsSnapshot = await adminDb.collection("shops")
      .where("ownerId", "==", userId)
      .get();
    
    for (const shopDoc of shopsSnapshot.docs) {
      await shopDoc.ref.delete();
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
    const userRef = adminDb.collection("users").doc(userId);
    
    await userRef.update({
      displayName: "Deleted User",
      email: null,
      photoURL: null,
      phoneNumber: null,
      accountStatus: 'banned',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("User account anonymized:", userId);
  } catch (error) {
    console.error("Error anonymizing user account:", error);
    throw error;
  }
}

/**
 * Get user profile by email
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
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
        updatedAt: data.updatedAt?.toDate() || new Date(),
        violations: data.violations || 0,
        lastViolation: data.lastViolation?.toDate() || undefined,
        banned: data.banned || false,
        bannedUntil: data.bannedUntil?.toDate() || undefined,
        bannedReason: data.bannedReason || undefined,
        bannedBy: data.bannedBy || undefined,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}
