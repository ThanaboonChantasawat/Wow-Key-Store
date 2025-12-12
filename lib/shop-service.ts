import { adminDb } from "@/lib/firebase-admin-config";
import { storage } from "@/components/firebase-config";
import { ref, deleteObject } from "firebase/storage";
import { updateUserProfile, getUserProfile } from "./user-service";
import { createNotification } from "./notification-service";
import { logActivity } from "./admin-activity-service";
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
    // ตรวจสอบชื่อร้านค้าซ้ำก่อนสร้าง
    const nameExists = await checkShopNameExists(shopData.shopName);
    if (nameExists) {
      throw new Error('ชื่อร้านค้านี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น');
    }

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
    console.error("เกิดข้อผิดพลาดในการสร้างร้านค้า:", error);
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
        // Bank account fields
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankAccountName: data.bankAccountName || null,
        bankBranch: data.bankBranch || null,
        enableBank: data.enableBank || false,
        // PromptPay fields
        promptPayId: data.promptPayId || null,
        promptPayType: data.promptPayType || null,
        enablePromptPay: data.enablePromptPay || false,
      } as any;
    }
    
    return null;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า:", error);
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
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า:", error);
    return null;
  }
}

// Update shop information
export async function updateShop(
  shopId: string,
  shopData: Partial<Omit<Shop, 'shopId' | 'ownerId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    // ถ้ามีการเปลี่ยนชื่อร้าน ให้ตรวจสอบชื่อซ้ำ
    if (shopData.shopName) {
      const nameExists = await checkShopNameExists(shopData.shopName, shopId);
      if (nameExists) {
        throw new Error('ชื่อร้านค้านี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น');
      }
    }

    const shopRef = adminDb.collection("shops").doc(shopId);
    await shopRef.update({
      ...shopData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตร้านค้า:", error);
    throw error;
  }
}

// Check if user has a shop
export async function hasShop(userId: string): Promise<boolean> {
  try {
    const shop = await getShopByOwnerId(userId);
    return shop !== null;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการตรวจสอบร้านค้า:", error);
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
    console.error("เกิดข้อผิดพลาดในการดึงรายการร้านค้า:", error);
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
          console.log("อัปเดตบทบาทผู้ใช้เป็นผู้ขายหลังอนุมัติร้านค้าแล้ว");
        }
      } catch (userUpdateError) {
        console.warn("ไม่สามารถอัปเดตบทบาทผู้ใช้ได้:", userUpdateError);
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
        console.error("เกิดข้อผิดพลาดในการส่งการแจ้งเตือนการอนุมัติ:", notifError);
        // Don't fail shop approval if notification fails
      }

      // 📝 Log admin activity
      try {
        await logActivity(
          adminId,
          'approve_shop',
          `อนุมัติร้านค้า: ${shopData.shopName}`,
          { shopId, shopName: shopData.shopName, ownerId, targetType: 'shop', targetId: shopId, targetName: shopData.shopName, affectedUserId: ownerId }
        );
      } catch (logError) {
        console.error("เกิดข้อผิดพลาดในการบันทึกกิจกรรมผู้ดูแล:", logError);
      }
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอนุมัติร้านค้า:", error);
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
          console.log("ลบโลโก้ร้านค้าจากพื้นที่จัดเก็บหลังปฏิเสธร้านค้าแล้ว");
        } catch (deleteError) {
          console.warn("ไม่สามารถลบโลโก้ร้านค้าได้:", deleteError);
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
        console.log("ปรับบทบาทผู้ใช้กลับเป็นผู้ซื้อหลังปฏิเสธร้านค้าแล้ว");
      } catch (userUpdateError) {
        console.warn("ไม่สามารถอัปเดตบทบาทผู้ใช้ได้:", userUpdateError);
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
          console.error("เกิดข้อผิดพลาดในการส่งการแจ้งเตือนการปฏิเสธ:", notifError);
        }

        // 📝 Log admin activity
        try {
          await logActivity(
            adminId,
            'reject_shop',
            `ปฏิเสธร้านค้า: ${shopData.shopName} - เหตุผล: ${reason}`,
            { shopId, shopName: shopData.shopName, ownerId: shopData.ownerId, reason, targetType: 'shop', targetId: shopId, targetName: shopData.shopName, affectedUserId: shopData.ownerId }
          );
        } catch (logError) {
          console.error("เกิดข้อผิดพลาดในการบันทึกกิจกรรมผู้ดูแล:", logError);
        }
      }
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการปฏิเสธร้านค้า:", error);
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
        console.error("เกิดข้อผิดพลาดในการส่งการแจ้งเตือนการระงับร้านค้า:", notifError);
      }

      // 📝 Log admin activity
      try {
        await logActivity(
          adminId,
          'suspend_shop',
          `ระงับร้านค้า: ${shopData.shopName} - เหตุผล: ${reason}`,
          { shopId, shopName: shopData.shopName, ownerId: shopData.ownerId, reason, targetType: 'shop', targetId: shopId, targetName: shopData.shopName, affectedUserId: shopData.ownerId }
        );
      } catch (logError) {
        console.error("เกิดข้อผิดพลาดในการบันทึกกิจกรรมผู้ดูแล:", logError);
      }
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการระงับร้านค้า:", error);
    throw error;
  }
}

// Unsuspend shop (reactivate)
export async function unsuspendShop(shopId: string, adminId?: string): Promise<void> {
  try {
    const shopRef = adminDb.collection("shops").doc(shopId);
    
    // Get shop data for logging
    const shopDoc = await shopRef.get();
    const shopData = shopDoc.data();
    
    await shopRef.update({
      status: 'active',
      suspendedBy: admin.firestore.FieldValue.delete(),
      suspendedAt: admin.firestore.FieldValue.delete(),
      suspensionReason: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 📝 Log admin activity
    if (adminId && shopData) {
      try {
        await logActivity(
          adminId,
          'unsuspend_shop',
          `ยกเลิกระงับร้านค้า: ${shopData.shopName}`,
          { shopId, shopName: shopData.shopName, ownerId: shopData.ownerId, targetType: 'shop', targetId: shopId, targetName: shopData.shopName, affectedUserId: shopData.ownerId }
        );
      } catch (logError) {
        console.error("เกิดข้อผิดพลาดในการบันทึกกิจกรรมผู้ดูแล:", logError);
      }
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการยกเลิกระงับร้านค้า:", error);
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
    console.error("เกิดข้อผิดพลาดในการอัปเดตสถิติร้านค้า:", error);
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
    console.error("เกิดข้อผิดพลาดในการดึงร้านค้ายอดนิยม:", error);
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
    console.error("เกิดข้อผิดพลาดในการดึงร้านค้ายอดนิยมตามรายได้:", error);
    throw error;
  }
}

// Update shop product count
export async function updateShopProductCount(shopId: string): Promise<void> {
  try {
    const productsSnapshot = await adminDb
      .collection("products")
      .where("shopId", "==", shopId)
      .get();
    
    const totalProducts = productsSnapshot.size;
    
    await adminDb.collection("shops").doc(shopId).update({
      totalProducts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตจำนวนสินค้าของร้านค้า:", error);
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
    console.error("เกิดข้อผิดพลาดในการอัปเดตสถิติยอดขายของร้านค้า:", error);
    throw error;
  }
}

// Check if shop name already exists
export async function checkShopNameExists(shopName: string, excludeShopId?: string): Promise<boolean> {
  try {
    const normalizedName = shopName.toLowerCase().trim();
    
    // ดึงเฉพาะร้านที่ชื่อตรงกัน (case-insensitive ต้องเช็คด้วย loop)
    const shopsSnapshot = await adminDb
      .collection("shops")
      .get();
    
    for (const doc of shopsSnapshot.docs) {
      const data = doc.data();
      if (data && data.shopName && data.shopName.toLowerCase().trim() === normalizedName) {
        // ถ้ามี excludeShopId (สำหรับการแก้ไข) ให้ข้ามร้านนั้น
        if (excludeShopId && doc.id === excludeShopId) {
          continue;
        }
        console.log(`พบชื่อร้านค้าซ้ำ: ${data.shopName}`);
        return true; // พบชื่อซ้ำ
      }
    }
    
    return false; // ไม่มีชื่อซ้ำ
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการตรวจสอบชื่อร้านค้า:", error);
    // ถ้า error ให้คืนค่า false เพื่อไม่บล็อกการสร้างร้าน
    return false;
  }
}



