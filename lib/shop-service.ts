import { adminDb } from "@/lib/firebase-admin-config";
import { storage } from "@/components/firebase-config";
import { ref, deleteObject } from "firebase/storage";
import { updateUserProfile, getUserProfile } from "./user-service";
import { createNotification } from "./notification-service";
import admin from 'firebase-admin';
import type { Shop } from "./shop-types";

export type { Shop };

// Create new shop
export async function createShop(
  ownerId: string,
  shopData: {
    shopName: string;
    description: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    facebookUrl?: string;
    lineId?: string;
    idCardNumber?: string;
    businessRegistration?: string;
  }
): Promise<string> {
  try {
    const shopId = `shop_${ownerId}`;
    const shopRef = adminDb.collection("shops").doc(shopId);
    
    // Remove undefined fields from shopData
    const cleanShopData = Object.fromEntries(
      Object.entries(shopData).filter(([, value]) => value !== undefined)
    );
    
    await shopRef.set({
      shopId,
      ownerId,
      ...cleanShopData,
      status: 'pending',
      verificationStatus: 'pending',
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      rating: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update user profile with shopId
    // Don't change role if user is already superadmin
    const userRef = adminDb.collection("users").doc(ownerId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const currentRole = userData?.role;
    
    const updateData: any = {
      shopId: shopId,
      isSeller: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Only update role to 'seller' if not already superadmin
    if (currentRole !== 'superadmin') {
      updateData.role = 'seller';
    }
    
    await userRef.update(updateData);
    
    return shopId;
  } catch (error) {
    console.error("Error creating shop:", error);
    throw error;
  }
}

// Get shop by owner ID
export async function getShopByOwnerId(ownerId: string): Promise<Shop | null> {
  try {
    const shopId = `shop_${ownerId}`;
    const shopRef = adminDb.collection("shops").doc(shopId);
    const shopDoc = await shopRef.get();
    
    if (shopDoc.exists) {
      const data = shopDoc.data();
      if (!data) return null;
      
      return {
        shopId: data.shopId,
        ownerId: data.ownerId,
        shopName: data.shopName,
        description: data.description,
        logoUrl: data.logoUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        facebookUrl: data.facebookUrl,
        lineId: data.lineId,
        idCardNumber: data.idCardNumber,
        businessRegistration: data.businessRegistration,
        status: data.status,
        verificationStatus: data.verificationStatus,
        rejectionReason: data.rejectionReason,
        suspensionReason: data.suspensionReason,
        suspendedBy: data.suspendedBy,
        suspendedAt: data.suspendedAt?.toDate(),
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt?.toDate(),
        totalProducts: data.totalProducts || 0,
        totalSales: data.totalSales || 0,
        totalRevenue: data.totalRevenue || 0,
        rating: data.rating || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        // Stripe fields
        stripeAccountId: data.stripeAccountId || null,
        stripeAccountStatus: data.stripeAccountStatus || null,
        stripeOnboardingCompleted: data.stripeOnboardingCompleted || false,
        stripeChargesEnabled: data.stripeChargesEnabled || false,
        stripePayoutsEnabled: data.stripePayoutsEnabled || false,
      } as any;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting shop:", error);
    return null;
  }
}

// Get shop by shop ID
export async function getShopById(shopId: string): Promise<Shop | null> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    const shopDoc = await shopRef.get();
    
    if (shopDoc.exists) {
      const data = shopDoc.data();
      if (!data) return null;
      
      return {
        shopId: data.shopId,
        ownerId: data.ownerId,
        shopName: data.shopName,
        description: data.description,
        logoUrl: data.logoUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        facebookUrl: data.facebookUrl,
        lineId: data.lineId,
        idCardNumber: data.idCardNumber,
        businessRegistration: data.businessRegistration,
        status: data.status,
        verificationStatus: data.verificationStatus,
        rejectionReason: data.rejectionReason,
        suspensionReason: data.suspensionReason,
        suspendedBy: data.suspendedBy,
        suspendedAt: data.suspendedAt?.toDate(),
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt?.toDate(),
        totalProducts: data.totalProducts || 0,
        totalSales: data.totalSales || 0,
        totalRevenue: data.totalRevenue || 0,
        rating: data.rating || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting shop:", error);
    return null;
  }
}

// Update shop information
export async function updateShop(
  shopId: string,
  shopData: Partial<Omit<Shop, 'shopId' | 'ownerId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    await shopRef.update({
      ...shopData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating shop:", error);
    throw error;
  }
}

// Check if user has a shop
export async function hasShop(userId: string): Promise<boolean> {
  try {
    const shop = await getShopByOwnerId(userId);
    return shop !== null;
  } catch (error) {
    console.error("Error checking shop:", error);
    return false;
  }
}

// Get all shops with optional filter
export async function getAllShops(statusFilter?: 'pending' | 'active' | 'rejected' | 'suspended' | 'closed'): Promise<Shop[]> {
  try {
    let query = adminDb.collection("shops");
    
    if (statusFilter) {
      query = query.where("status", "==", statusFilter) as any;
    }
    
    const snapshot = await query.get();
    
    const shops = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        shopId: data.shopId,
        ownerId: data.ownerId,
        shopName: data.shopName,
        description: data.description,
        logoUrl: data.logoUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        facebookUrl: data.facebookUrl,
        lineId: data.lineId,
        idCardNumber: data.idCardNumber,
        businessRegistration: data.businessRegistration,
        status: data.status,
        verificationStatus: data.verificationStatus,
        rejectionReason: data.rejectionReason,
        suspensionReason: data.suspensionReason,
        suspendedBy: data.suspendedBy,
        suspendedAt: data.suspendedAt?.toDate(),
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt?.toDate(),
        totalProducts: data.totalProducts || 0,
        totalSales: data.totalSales || 0,
        totalRevenue: data.totalRevenue || 0,
        rating: data.rating || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
    
    // Sort manually by createdAt
    return shops.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
    
  } catch (error) {
    console.error("Error getting shops:", error);
    return [];
  }
}

// Approve shop
export async function approveShop(shopId: string, adminId: string): Promise<void> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    
    // Get shop data to find owner
    const shopSnap = await shopRef.get();
    const shopData = shopSnap.data();
    
    if (shopData) {
      const ownerId = shopData.ownerId;
      
      // Update shop status
      await shopRef.update({
        status: 'active',
        verificationStatus: 'verified',
        verifiedBy: adminId,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      } as Record<string, unknown>);
      
      // Update user role to seller (only if not admin or superadmin)
      try {
        const userProfile = await getUserProfile(ownerId);
        if (userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin') {
          await updateUserProfile(ownerId, {
            role: 'seller',
            isSeller: true
          });
          console.log("User role updated to seller after shop approval");
        }
      } catch (userUpdateError) {
        console.warn("Could not update user role:", userUpdateError);
        // Continue with shop approval even if user update fails
      }

      // 🔔 Send approval notification
      try {
        await createNotification(
          ownerId,
          'shop_approved',
          '🎉 ร้านค้าของคุณได้รับการอนุมัติแล้ว!',
          `ร้านค้า "${shopData.shopName}" ของคุณได้รับการอนุมัติแล้ว คุณสามารถเริ่มขายสินค้าได้ทันที`,
          '/seller'
        );
      } catch (notifError) {
        console.error("Error sending approval notification:", notifError);
        // Don't fail shop approval if notification fails
      }
    }
  } catch (error) {
    console.error("Error approving shop:", error);
    throw error;
  }
}

// Reject shop
export async function rejectShop(shopId: string, adminId: string, reason: string): Promise<void> {
  try {
    // Get shop data to check for logo and owner
    const shopRef = adminDb.collection("shops").doc(shopId);
    const shopDoc = await shopRef.get();
    
    if (shopDoc.exists) {
      const shopData = shopDoc.data();
      if (!shopData) return;
      
      const ownerId = shopData.ownerId;
      
      // Delete logo from storage if exists to save storage space
      if (shopData.logoUrl) {
        try {
          const logoRef = ref(storage, shopData.logoUrl);
          await deleteObject(logoRef);
          console.log("Shop logo deleted from storage after rejection");
        } catch (deleteError) {
          console.warn("Could not delete shop logo:", deleteError);
          // Continue anyway - rejection should still proceed even if logo deletion fails
        }
      }

      // Remove seller role from user
      // Set back to buyer role since shop was rejected
      try {
        await updateUserProfile(ownerId, {
          role: 'buyer',
          isSeller: false
        });
        console.log("User role reverted to buyer after shop rejection");
      } catch (userUpdateError) {
        console.warn("Could not update user role:", userUpdateError);
        // Continue anyway - shop rejection should still proceed
      }
    }
    
    await shopRef.update({
      status: 'rejected',
      verificationStatus: 'rejected',
      verifiedBy: adminId,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason,
      logoUrl: null, // Clear logo URL from database
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    } as Record<string, unknown>);

    // 🔔 Send rejection notification
    if (shopDoc.exists) {
      const shopData = shopDoc.data();
      if (shopData) {
        try {
          await createNotification(
            shopData.ownerId,
            'shop_rejected',
            '❌ ร้านค้าของคุณไม่ได้รับการอนุมัติ',
            `ร้านค้า "${shopData.shopName}" ของคุณไม่ได้รับการอนุมัติ เนื่องจาก: ${reason}`,
            '/seller'
          );
        } catch (notifError) {
          console.error("Error sending rejection notification:", notifError);
        }
      }
    }
  } catch (error) {
    console.error("Error rejecting shop:", error);
    throw error;
  }
}

// Suspend shop
export async function suspendShop(shopId: string, adminId: string, reason: string): Promise<void> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    
    // Get shop data for notification
    const shopDoc = await shopRef.get();
    const shopData = shopDoc.data();
    
    await shopRef.update({
      status: 'suspended',
      suspendedBy: adminId,
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspensionReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    } as Record<string, unknown>);

    // 🔔 Send suspension notification
    if (shopData) {
      try {
        await createNotification(
          shopData.ownerId,
          'shop_suspended',
          '⚠️ ร้านค้าของคุณถูกระงับการใช้งาน',
          `ร้านค้า "${shopData.shopName}" ของคุณถูกระงับการใช้งาน เนื่องจาก: ${reason}`,
          '/seller'
        );
      } catch (notifError) {
        console.error("Error sending suspension notification:", notifError);
      }
    }
  } catch (error) {
    console.error("Error suspending shop:", error);
    throw error;
  }
}

// Unsuspend shop (reactivate)
export async function unsuspendShop(shopId: string): Promise<void> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    await shopRef.update({
      status: 'active',
      suspendedBy: admin.firestore.FieldValue.delete(),
      suspendedAt: admin.firestore.FieldValue.delete(),
      suspensionReason: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error unsuspending shop:", error);
    throw error;
  }
}

// Update shop sales and revenue
export async function updateShopStats(
  shopId: string, 
  salesIncrement: number, 
  revenueIncrement: number
): Promise<void> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    const shopDoc = await shopRef.get();
    
    if (shopDoc.exists) {
      const currentData = shopDoc.data();
      if (!currentData) return;
      
      await shopRef.update({
        totalSales: (currentData.totalSales || 0) + salesIncrement,
        totalRevenue: (currentData.totalRevenue || 0) + revenueIncrement,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      } as Record<string, unknown>);
    }
  } catch (error) {
    console.error("Error updating shop stats:", error);
    throw error;
  }
}

// Get top shops by sales
export async function getTopShopsBySales(limit: number = 10): Promise<Shop[]> {
  try {
    const snapshot = await adminDb.collection("shops").get();
    const shops: Shop[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      // Only include active shops
      if (data.status === "active") {
        shops.push({
          shopId: data.shopId,
          ownerId: data.ownerId,
          shopName: data.shopName,
          description: data.description,
          logoUrl: data.logoUrl,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          facebookUrl: data.facebookUrl,
          lineId: data.lineId,
          status: data.status,
          verificationStatus: data.verificationStatus,
          rejectionReason: data.rejectionReason,
          suspensionReason: data.suspensionReason,
          suspendedBy: data.suspendedBy,
          suspendedAt: data.suspendedAt?.toDate(),
          verifiedBy: data.verifiedBy,
          verifiedAt: data.verifiedAt?.toDate(),
          totalProducts: data.totalProducts || 0,
          totalSales: data.totalSales || 0,
          totalRevenue: data.totalRevenue || 0,
          rating: data.rating || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      }
    });
    
    // Sort by totalSales descending and limit
    return shops
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting top shops:", error);
    throw error;
  }
}

// Get top shops by revenue
export async function getTopShopsByRevenue(limit: number = 10): Promise<Shop[]> {
  try {
    const snapshot = await adminDb.collection("shops").get();
    const shops: Shop[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      // Only include active shops
      if (data.status === "active") {
        shops.push({
          shopId: data.shopId,
          ownerId: data.ownerId,
          shopName: data.shopName,
          description: data.description,
          logoUrl: data.logoUrl,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          facebookUrl: data.facebookUrl,
          lineId: data.lineId,
          status: data.status,
          verificationStatus: data.verificationStatus,
          rejectionReason: data.rejectionReason,
          suspensionReason: data.suspensionReason,
          suspendedBy: data.suspendedBy,
          suspendedAt: data.suspendedAt?.toDate(),
          verifiedBy: data.verifiedBy,
          verifiedAt: data.verifiedAt?.toDate(),
          totalProducts: data.totalProducts || 0,
          totalSales: data.totalSales || 0,
          totalRevenue: data.totalRevenue || 0,
          rating: data.rating || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      }
    });
    
    // Sort by totalRevenue descending and limit
    return shops
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting top shops by revenue:", error);
    throw error;
  }
}

// Update shop product count
export async function updateShopProductCount(shopId: string): Promise<void> {
  try {
    const productsSnapshot = await adminDb
      .collection("products")
      .where("shopId", "==", shopId)
      .where("status", "==", "active")
      .get();
    
    const totalProducts = productsSnapshot.size;
    
    await adminDb.collection("shops").doc(shopId).update({
      totalProducts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating shop product count:", error);
    throw error;
  }
}

// Update shop sales stats
export async function updateShopSalesStats(shopId: string): Promise<void> {
  try {
    const ordersSnapshot = await adminDb
      .collection("orders")
      .where("shopId", "==", shopId)
      .where("status", "==", "completed")
      .get();
    
    let totalSales = 0;
    let totalRevenue = 0;
    
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      totalSales += 1;
      totalRevenue += data.totalAmount || 0;
    });
    
    await adminDb.collection("shops").doc(shopId).update({
      totalSales,
      totalRevenue,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating shop sales stats:", error);
    throw error;
  }
}


