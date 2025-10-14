import { db } from "@/components/firebase-config";
import { storage } from "@/components/firebase-config";
import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteField
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { updateUserProfile, getUserProfile } from "./user-service";

export interface Shop {
  shopId: string;
  ownerId: string;
  shopName: string;
  description: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  lineId?: string;
  idCardNumber?: string;
  businessRegistration?: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended' | 'closed';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

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
    const shopRef = doc(db, "shops", shopId);
    
    // Remove undefined fields from shopData
    const cleanShopData = Object.fromEntries(
      Object.entries(shopData).filter(([, value]) => value !== undefined)
    );
    
    await setDoc(shopRef, {
      shopId,
      ownerId,
      ...cleanShopData,
      status: 'pending',
      verificationStatus: 'pending',
      totalProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      rating: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update user profile with shopId
    const userRef = doc(db, "users", ownerId);
    await updateDoc(userRef, {
      shopId: shopId,
      isSeller: true,
      role: 'seller',
      updatedAt: serverTimestamp()
    });
    
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
    const shopRef = doc(db, "shops", shopId);
    const shopDoc = await getDoc(shopRef);
    
    if (shopDoc.exists()) {
      const data = shopDoc.data();
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

// Get shop by shop ID
export async function getShopById(shopId: string): Promise<Shop | null> {
  try {
    const shopRef = doc(db, "shops", shopId);
    const shopDoc = await getDoc(shopRef);
    
    if (shopDoc.exists()) {
      const data = shopDoc.data();
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
    const shopRef = doc(db, "shops", shopId);
    await updateDoc(shopRef, {
      ...shopData,
      updatedAt: serverTimestamp()
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
    const shopsRef = collection(db, "shops");
    let q = query(shopsRef, orderBy("createdAt", "desc"));
    
    if (statusFilter) {
      q = query(shopsRef, where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
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
  } catch (error) {
    console.error("Error getting shops:", error);
    return [];
  }
}

// Approve shop
export async function approveShop(shopId: string, adminId: string): Promise<void> {
  try {
    const shopRef = doc(db, "shops", shopId);
    
    // Get shop data to find owner
    const shopSnap = await getDoc(shopRef);
    const shopData = shopSnap.data();
    
    if (shopData) {
      const ownerId = shopData.ownerId;
      
      // Update shop status
      await updateDoc(shopRef, {
        status: 'active',
        verificationStatus: 'verified',
        verifiedBy: adminId,
        verifiedAt: serverTimestamp(),
        rejectionReason: null,
        updatedAt: serverTimestamp()
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
    const shopRef = doc(db, "shops", shopId);
    const shopDoc = await getDoc(shopRef);
    
    if (shopDoc.exists()) {
      const shopData = shopDoc.data();
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
    
    await updateDoc(shopRef, {
      status: 'rejected',
      verificationStatus: 'rejected',
      verifiedBy: adminId,
      verifiedAt: serverTimestamp(),
      rejectionReason: reason,
      logoUrl: null, // Clear logo URL from database
      updatedAt: serverTimestamp()
    } as Record<string, unknown>);
  } catch (error) {
    console.error("Error rejecting shop:", error);
    throw error;
  }
}

// Suspend shop
export async function suspendShop(shopId: string, adminId: string, reason: string): Promise<void> {
  try {
    const shopRef = doc(db, "shops", shopId);
    await updateDoc(shopRef, {
      status: 'suspended',
      suspendedBy: adminId,
      suspendedAt: serverTimestamp(),
      suspensionReason: reason,
      updatedAt: serverTimestamp()
    } as Record<string, unknown>);
  } catch (error) {
    console.error("Error suspending shop:", error);
    throw error;
  }
}

// Unsuspend shop (reactivate)
export async function unsuspendShop(shopId: string): Promise<void> {
  try {
    const shopRef = doc(db, "shops", shopId);
    await updateDoc(shopRef, {
      status: 'active',
      suspendedBy: deleteField(),
      suspendedAt: deleteField(),
      suspensionReason: deleteField(),
      updatedAt: serverTimestamp()
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
    const shopRef = doc(db, "shops", shopId);
    const shopDoc = await getDoc(shopRef);
    
    if (shopDoc.exists()) {
      const currentData = shopDoc.data();
      await updateDoc(shopRef, {
        totalSales: (currentData.totalSales || 0) + salesIncrement,
        totalRevenue: (currentData.totalRevenue || 0) + revenueIncrement,
        updatedAt: serverTimestamp()
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
    const shopsRef = collection(db, "shops");
    // Fetch all shops and filter/sort in JavaScript to avoid composite index requirement
    const q = query(shopsRef);
    
    const querySnapshot = await getDocs(q);
    const shops: Shop[] = [];
    
    querySnapshot.forEach((doc) => {
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
    const shopsRef = collection(db, "shops");
    // Fetch all shops and filter/sort in JavaScript to avoid composite index requirement
    const q = query(shopsRef);
    
    const querySnapshot = await getDocs(q);
    const shops: Shop[] = [];
    
    querySnapshot.forEach((doc) => {
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

