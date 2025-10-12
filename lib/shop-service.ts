import { db } from "@/components/firebase-config";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";

export interface Shop {
  shopId: string;
  ownerId: string;
  shopName: string;
  description: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'active' | 'suspended' | 'closed';
  totalProducts: number;
  totalSales: number;
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
  }
): Promise<string> {
  try {
    const shopId = `shop_${ownerId}`;
    const shopRef = doc(db, "shops", shopId);
    
    // Remove undefined fields from shopData
    const cleanShopData = Object.fromEntries(
      Object.entries(shopData).filter(([_, value]) => value !== undefined)
    );
    
    await setDoc(shopRef, {
      shopId,
      ownerId,
      ...cleanShopData,
      status: 'active',
      totalProducts: 0,
      totalSales: 0,
      rating: 0,
      createdAt: serverTimestamp(),
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
        status: data.status,
        totalProducts: data.totalProducts || 0,
        totalSales: data.totalSales || 0,
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
        status: data.status,
        totalProducts: data.totalProducts || 0,
        totalSales: data.totalSales || 0,
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
