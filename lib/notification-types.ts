// Notification types and interfaces

export type NotificationType =
  | 'welcome'
  | 'shop_approved'
  | 'shop_rejected'
  | 'shop_suspended'
  | 'shop_unsuspended'
  | 'new_order'
  | 'order_confirmed'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'product_low_stock'
  | 'reopen_approved'
  | 'reopen_rejected'
  | 'system_announcement'
  | 'report'
  | 'warning'
  | 'info'
  | 'success';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>; // Additional data
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  shopUpdates: boolean;
  marketingEmails: boolean;
  updatedAt: Date;
}
