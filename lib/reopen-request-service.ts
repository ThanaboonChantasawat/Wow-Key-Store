import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, storage } from '@/components/firebase-config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth } from '@/components/firebase-config';

export interface ReopenRequest {
  id?: string;
  shopId: string;
  shopName: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  
  // ข้อมูลคำขอ
  reason: string; // เหตุผลที่ต้องการเปิดร้านใหม่
  explanation: string; // คำอธิบายการแก้ไขปัญหา
  improvements: string; // มาตรการป้องกันไม่ให้เกิดปัญหาซ้ำ
  contactPhone?: string;
  contactEmail?: string;
  
  // เอกสารแนบ
  documentUrls?: string[]; // URLs ของเอกสารที่อัปโหลด
  
  // สถานะและการจัดการ
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // Admin ID ที่ตรวจสอบ
  reviewedAt?: Timestamp;
  reviewNote?: string; // หมายเหตุจาก Admin
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const REQUESTS_COLLECTION = 'reopenRequests';

/**
 * สร้างคำขอเปิดร้านใหม่
 */
export async function createReopenRequest(
  request: Omit<ReopenRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  files?: File[]
): Promise<string> {
  try {
    // อัปโหลดไฟล์เอกสาร (ถ้ามี)
    let documentUrls: string[] = [];
    if (files && files.length > 0) {
      documentUrls = await uploadDocuments(request.shopId, files);
    }

    const requestData: Omit<ReopenRequest, 'id'> = {
      ...request,
      documentUrls,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), requestData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating reopen request:', error);
    throw error;
  }
}

/**
 * อัปโหลดเอกสารประกอบคำขอ
 */
async function uploadDocuments(shopId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const timestamp = Date.now();
    const fileName = `${timestamp}_${i}_${file.name}`;
    const storageRef = ref(storage, `reopen-documents/${shopId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    urls.push(downloadURL);
  }
  
  return urls;
}

/**
 * ดึงคำขอทั้งหมด (สำหรับ Admin)
 */
export async function getAllReopenRequests(): Promise<ReopenRequest[]> {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ReopenRequest));
  } catch (error) {
    console.error('Error getting reopen requests:', error);
    throw error;
  }
}

/**
 * ดึงคำขอของร้านค้าเฉพาะ
 */
export async function getReopenRequestsByShopId(shopId: string): Promise<ReopenRequest[]> {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('shopId', '==', shopId)
      // ไม่ใช้ orderBy เพื่อหลีกเลี่ยงการสร้าง composite index
    );
    const querySnapshot = await getDocs(q);
    
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ReopenRequest));
    
    // Sort ฝั่ง client แทน
    return requests.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA; // เรียงจากใหม่ไปเก่า (desc)
    });
  } catch (error) {
    console.error('Error getting shop reopen requests:', error);
    throw error;
  }
}

/**
 * ดึงคำขอของเจ้าของร้าน
 */
export async function getReopenRequestsByOwnerId(ownerId: string): Promise<ReopenRequest[]> {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('ownerId', '==', ownerId)
      // ไม่ใช้ orderBy เพื่อหลีกเลี่ยงการสร้าง composite index
    );
    const querySnapshot = await getDocs(q);
    
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ReopenRequest));
    
    // Sort ฝั่ง client แทน
    return requests.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA; // เรียงจากใหม่ไปเก่า (desc)
    });
  } catch (error) {
    console.error('Error getting owner reopen requests:', error);
    throw error;
  }
}

/**
 * ดึงคำขอเฉพาะ
 */
export async function getReopenRequestById(requestId: string): Promise<ReopenRequest | null> {
  try {
    const docRef = doc(db, REQUESTS_COLLECTION, requestId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ReopenRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting reopen request:', error);
    throw error;
  }
}

/**
 * อนุมัติคำขอเปิดร้านใหม่
 */
export async function approveReopenRequest(
  requestId: string,
  adminId: string,
  reviewNote?: string
): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Unauthorized');

    const response = await fetch('/api/admin/reopen-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId,
        action: 'approve',
        reviewNote
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to approve request');
    }
  } catch (error) {
    console.error('Error approving reopen request:', error);
    throw error;
  }
}

/**
 * ปฏิเสธคำขอเปิดร้านใหม่
 */
export async function rejectReopenRequest(
  requestId: string,
  adminId: string,
  reviewNote: string
): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Unauthorized');

    const response = await fetch('/api/admin/reopen-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId,
        action: 'reject',
        reviewNote
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reject request');
    }
  } catch (error) {
    console.error('Error rejecting reopen request:', error);
    throw error;
  }
}

/**
 * ลบคำขอ
 */
export async function deleteReopenRequest(requestId: string): Promise<void> {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data() as ReopenRequest;
    
    // ลบเอกสารที่อัปโหลด
    if (requestData.documentUrls && requestData.documentUrls.length > 0) {
      for (const url of requestData.documentUrls) {
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (error) {
          console.warn('Error deleting document file:', error);
        }
      }
    }
    
    // ลบคำขอ
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error deleting reopen request:', error);
    throw error;
  }
}

/**
 * ตรวจสอบว่ามีคำขอที่รออนุมัติหรือไม่
 */
export async function hasPendingReopenRequest(shopId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('shopId', '==', shopId),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking pending reopen request:', error);
    throw error;
  }
}

/**
 * ลบคำขอทั้งหมดของร้านค้า (ใช้ตอนยกเลิกการระงับหรืออนุมัติคำขอ)
 */
export async function deleteAllReopenRequestsByShopId(shopId: string): Promise<void> {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('shopId', '==', shopId)
    );
    const querySnapshot = await getDocs(q);
    
    // ลบทีละรายการ
    const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
      const requestData = docSnapshot.data() as ReopenRequest;
      
      // ลบเอกสารที่อัปโหลด
      if (requestData.documentUrls && requestData.documentUrls.length > 0) {
        for (const url of requestData.documentUrls) {
          try {
            const fileRef = ref(storage, url);
            await deleteObject(fileRef);
          } catch (error) {
            console.warn('Error deleting document file:', error);
          }
        }
      }
      
      // ลบคำขอ
      await deleteDoc(doc(db, REQUESTS_COLLECTION, docSnapshot.id));
    });
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting reopen requests by shopId:', error);
    throw error;
  }
}
