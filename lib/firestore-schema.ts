/*
Consolidated Firestore schema (collections + key fields) derived from the codebase.
This file is for documentation and type references only.
*/

// Core entities
export interface User {
  uid: string; // PK
  displayName?: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: 'buyer' | 'seller' | 'admin' | 'superadmin';
  isSeller?: boolean;
  isVerified?: boolean;
  emailVerified?: boolean;
  accountStatus?: 'active' | 'suspended' | 'banned';
  wallet?: number;
  shopId?: string; // FK -> shops.shopId (if seller)
  violationCount?: number;
  violations?: Array<{
    type: string;
    reason: string;
    date: number;
  }>;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface Shop {
  shopId: string; // PK
  ownerId: string; // FK -> users.uid
  shopName: string;
  description?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  lineId?: string;
  idCardNumber?: string;
  businessRegistration?: string;
  status?: 'pending' | 'active' | 'suspended' | 'closed';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  rating?: number;
  totalProducts?: number;
  totalSales?: number;
  totalRevenue?: number;
  bankAccounts?: Array<{
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    isDefault?: boolean;
    isActive?: boolean;
    recipientId?: string; // Omise recipient ID
  }>;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Product {
  id: string; // PK
  shopId: string; // FK -> shops.shopId
  name: string;
  description?: string;
  price: number;
  // Taxonomy and game linkage
  categoryIds?: string[]; // FK -> categories.id
  category?: string; // denormalized category name/slug as seen in Firestore
  gameId?: string; // FK -> games.gameId
  gameName?: string; // denormalized game name as seen in Firestore
  // Media
  images?: string[]; // array of image URLs stored on Firebase Storage
  // Operational fields
  status?: string; // e.g., active, inactive
  views?: number; // total views
  soldCount?: number; // total sold count
  stock?: number; // available stock
  // Timestamps
  createdAt?: number; // epoch millis
  updatedAt?: number; // epoch millis
  lastViewedAt?: number; // epoch millis
}

export interface OrderItem {
  productId: string; // FK -> products.id
  quantity: number;
  price: number;
}

export interface Order {
  id: string; // PK
  userId: string; // FK -> users.uid (buyer)
  buyerId?: string; // alias for userId
  shopId: string; // FK -> shops.shopId
  type?: 'direct_purchase' | 'cart_checkout';
  items: OrderItem[];
  // Legacy multi-shop format
  shops?: Array<{
    shopId: string;
    shopName: string;
    items: OrderItem[];
    subtotal: number;
  }>;
  amount: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled' | 'refunded' | 'completed';
  paymentStatus?: 'pending' | 'completed' | 'failed';
  paymentMethod?: 'promptpay' | 'credit_card' | 'bank_transfer';
  paymentRef?: string;
  // Omise/PromptPay fields
  omiseChargeId?: string;
  omiseStatus?: string;
  omisePaid?: boolean;
  promptPayChargeId?: string;
  promptPayQRCreatedAt?: number;
  promptPayQRExpiresAt?: number;
  // Cart reference
  cartItemIds?: string[];
  // Review tracking
  hasReviewed?: boolean;
  // Timestamps
  paidAt?: number;
  deliveredAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface CartItem {
  productId: string; // FK -> products.id
  quantity: number;
}

export interface Cart {
  id: string; // PK
  userId: string; // FK -> users.uid
  items: CartItem[];
  updatedAt?: number;
}

// Cart items stored as standalone docs in 'cart' collection
// Observed doc id format: `${userId}_${itemId}`
export interface CartItemDoc {
  id: string; // PK (doc id)
  userId: string; // FK -> users.uid
  itemId: string; // FK -> products.id | shops.shopId depending on itemType
  itemType: 'product' | 'shop';
  gameId?: string; // optional linkage when item relates to a game
  quantity: number;
  addedAt?: number; // epoch millis
}

export interface Favorite {
  id: string; // PK
  userId: string; // FK -> users.uid
  itemId: string; // productId | shopId
  itemType: 'product' | 'shop';
}

export interface Notification {
  id: string; // PK
  userId: string; // FK -> users.uid
  type: 'order' | 'payment' | 'shop' | 'product' | 'review' | 'welcome' | 'system' | string;
  title: string;
  message: string;
  link?: string; // navigation link
  data?: Record<string, any>; // additional context
  read: boolean;
  createdAt?: number;
}

// Content & taxonomy
export interface Category {
  id: string; // PK
  name: string;
  slug: string;
  description?: string;
  createdAt?: number; // epoch millis
  updatedAt?: number; // epoch millis
}

export interface GameImage { url: string; isCover: boolean; }
export interface GameImageContainer { images: GameImage[]; }

export interface Game {
  id: string; // PK (doc id)
  name: string;
  gameId?: string; // legacy: logical id referenced by products
  description?: string;
  imageUrl?: string; // single image URL for game listing
  gameImages?: GameImageContainer[]; // legacy: detailed images array
  price?: number; // legacy field
  categoryIds?: string[]; // FK -> categories.id
  categories?: string[]; // denormalized category names
  shopId?: string; // FK -> shops.shopId (legacy)
  shopName?: string; // legacy
  isPopular?: boolean;
  views?: number;
  status?: 'active' | 'inactive';
  createdAt?: number;
  updatedAt?: number;
}

// Discussions & reviews
export interface ShopComment {
  id: string; // PK
  shopId: string; // FK -> shops.shopId
  userId: string; // FK -> users.uid
  content: string;
  createdAt?: number;
}

export interface ProductComment {
  id: string; // PK
  productId: string; // FK -> products.id
  userId: string; // FK -> users.uid
  content: string;
  createdAt?: number;
}

export interface ShopReview {
  id: string; // PK
  shopId: string; // FK -> shops.shopId
  userId: string; // FK -> users.uid
  rating: number; // 1-5
  comment?: string;
  createdAt?: number;
}

export interface ProductReview {
  id: string; // PK
  productId: string; // FK -> products.id
  userId: string; // FK -> users.uid
  rating: number; // 1-5
  comment?: string;
  createdAt?: number;
}

// Legacy combined reviews referenced by scripts
export interface ReviewLegacy {
  id: string; // PK
  targetType: 'shop' | 'product';
  targetId: string; // shopId | productId
  userId: string;
  rating: number;
  comment?: string;
}

// Support & admin
export interface SupportMessage {
  id: string; // PK
  userId: string; // FK -> users.uid
  subject: string;
  status?: 'open' | 'pending' | 'resolved';
  adminNotes?: string;
}

export interface Report {
  id: string; // PK
  reporterId: string; // FK -> users.uid
  targetId: string; // FK -> shops.shopId | products.id | users.uid
  targetType: 'shop' | 'product' | 'user';
  status?: 'open' | 'closed' | 'dismissed';
}

export interface AdminActivity {
  id: string; // PK
  // Admin identifiers
  adminId: string; // FK -> users.uid
  adminEmail?: string;
  adminName?: string;
  // Action context
  action: string; // e.g., delete_content, suspend_user, approve_shop
  details?: string; // freeform details / reason / notes
  // Target context
  targetId?: string; // commentId | reviewId | userId | shopId | productId
  targetType?: 'comment' | 'review' | 'user' | 'shop' | 'product' | string;
  targetName?: string; // denormalized name/title
  // Affected user (if applicable)
  affectedUserId?: string; // FK -> users.uid
  // Timestamp
  createdAt?: number; // epoch millis
}

export interface Dispute {
  id: string; // PK
  orderId: string; // FK -> orders.id
  userId: string; // FK -> users.uid
  type: string;
  status?: 'open' | 'in_review' | 'resolved';
}

export interface OrderChatMessage {
  id: string; // PK
  orderId: string; // FK -> orders.id
  senderId: string; // FK -> users.uid
  message: string;
  createdAt: number;
}

export interface ReopenRequest {
  id: string; // PK
  shopId: string; // FK -> shops.shopId
  reason: string;
  status?: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Sliders (home page)
export interface Slider {
  id: string; // PK
  title?: string;
  imageUrl: string;
  targetUrl?: string;
  order?: number;
}

// Finance & transfers
export interface Payout {
  id: string; // PK
  shopId: string; // FK -> shops.shopId
  amount: number;
  status: 'requested' | 'processing' | 'paid' | 'failed';
  method?: 'bank_transfer' | 'omise';
  orderIds?: string[]; // FK -> orders.id (orders included in this payout)
  bankAccountId?: string; // selected bank account
  transferId?: string; // Omise transfer ID
  failureReason?: string;
  createdAt?: number;
  updatedAt?: number;
  paidAt?: number;
}

export interface OmiseTransfer {
  id: string; // PK
  payoutId: string; // FK -> payouts.id
  transferId: string;
  status: string;
}

export interface BankVerification {
  id: string; // PK
  shopId: string; // FK -> shops.shopId
  status: 'pending' | 'verified' | 'failed';
  bankName?: string;
  accountNumberMasked?: string;
}

export interface TransferLog {
  id: string; // PK
  level: 'info' | 'warn' | 'error';
  message: string;
  refId?: string; // payoutId | transferId | orderId
  createdAt: number;
}

export interface TransferError {
  id: string; // PK
  context: string; // e.g., webhook, payout
  errorCode?: string;
  errorMessage: string;
  refId?: string; // payoutId | transferId | orderId
  createdAt: number;
}

// Settings (singleton docs)
export interface OmiseSettings {
  id: 'omise';
  publicKey: string;
  secretKey: string;
}

// Issues (maintenance/cleanup)
export interface Issue {
  id: string; // PK
  type: string;
  message: string;
  createdAt: number;
}

// Seller profiles (stored as docs by userId)
export interface SellerProfile {
  id: string; // PK (userId)
  // Add seller-specific fields as needed
  createdAt?: number;
  updatedAt?: number;
}

// Collection name constants (to reduce stringly-typed refs)
export const Collections = {
  users: 'users',
  shops: 'shops',
  products: 'products',
  orders: 'orders',
  cart: 'cart',
  favorites: 'favorites',
  notifications: 'notifications',
  categories: 'categories',
  gamesList: 'gamesList',
  sliders: 'sliders',
  shopComments: 'shopComments',
  productComments: 'productComments',
  shopReviews: 'shopReviews',
  productReviews: 'productReviews',
  reviewsLegacy: 'reviews',
  supportMessages: 'support_messages',
  reports: 'reports',
  adminActivities: 'adminActivities',
  disputes: 'disputes',
  orderChats: 'orderChats',
  reopenRequests: 'reopenRequests',
  payouts: 'payouts',
  omiseTransfers: 'omise_transfers',
  bankVerifications: 'bankVerifications',
  transferLogs: 'transfer_logs',
  transferErrors: 'transfer_errors',
  settings: 'settings',
  issues: 'issues',
} as const;

export type CollectionName = typeof Collections[keyof typeof Collections];

// Helper mappings of simple FKs to hint relationships in code
export const ForeignKeys = {
  Shop: { ownerId: Collections.users },
  Product: { shopId: Collections.shops },
  Order: { buyerId: Collections.users, shopId: Collections.shops },
  Cart: { userId: Collections.users },
  Favorite: { userId: Collections.users },
  Notification: { userId: Collections.users },
  ShopComment: { shopId: Collections.shops, userId: Collections.users },
  ProductComment: { productId: Collections.products, userId: Collections.users },
  ShopReview: { shopId: Collections.shops, userId: Collections.users },
  ProductReview: { productId: Collections.products, userId: Collections.users },
  Dispute: { orderId: Collections.orders, userId: Collections.users },
  OrderChatMessage: { orderId: Collections.orders, senderId: Collections.users },
  ReopenRequest: { shopId: Collections.shops },
  Payout: { shopId: Collections.shops },
  OmiseTransfer: { payoutId: Collections.payouts },
  BankVerification: { shopId: Collections.shops },
} as const;
