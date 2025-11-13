// Comment types for shops and products

export interface BaseComment {
  id: string
  userId: string
  userName: string
  userPhotoURL?: string | null
  text: string
  images?: string[] // Optional comment images
  parentId?: string | null // For nested replies
  createdAt: Date
  updatedAt: Date
}

export interface ShopComment extends BaseComment {
  shopId: string
  shopName: string
  replies?: ShopComment[] // Nested replies
}

export interface ProductComment extends BaseComment {
  productId: string
  productName: string
  shopId: string
  shopName: string
  replies?: ProductComment[] // Nested replies
}

export type CommentType = 'shop' | 'product'
