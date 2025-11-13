// In-app notification service
import { adminDb } from './firebase-admin-config';
import admin from 'firebase-admin';
import type { Notification, NotificationType } from './notification-types';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  data?: Record<string, any>
): Promise<string> {
  try {
    const notificationRef = await adminDb.collection(NOTIFICATIONS_COLLECTION).add({
      userId,
      type,
      title,
      message,
      link: link || null,
      data: data || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Notification created: ${notificationRef.id} for user ${userId}`);
    return notificationRef.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50
): Promise<Notification[]> {
  try {
    // Use simple query without orderBy to avoid index requirement
    // Then sort in memory
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where('userId', '==', userId)
      .limit(limit * 2) // Get more to ensure we have enough after sorting
      .get();

    if (snapshot.empty) {
      console.log(`ℹ️ No notifications found for user ${userId}`);
      return [];
    }

    // Map and sort in memory
    const notifications = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit) as Notification[];

    console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);
    return notifications;
  } catch (error: any) {
    console.error('❌ Error getting notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await adminDb.collection(NOTIFICATIONS_COLLECTION).doc(notificationId).update({
      read: true,
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    console.log(`✅ Marked ${snapshot.size} notifications as read for user ${userId}`);
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    return snapshot.size;
  } catch (error: any) {
    // Handle missing index error gracefully
    if (error?.code === 9 || error?.message?.includes('index')) {
      console.warn('⚠️ Firestore index not created yet. Returning 0.');
      return 0;
    }
    
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await adminDb.collection(NOTIFICATIONS_COLLECTION).doc(notificationId).delete();
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    throw error;
  }
}
