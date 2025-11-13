// Review types for shops and products

export interface BaseReview {
  id: string
  userId: string
  userName: string
  userPhotoURL?: string | null
  rating: number // 1-5 stars
  text: string
  images?: string[] // Optional review images
  helpful?: number // Count of helpful votes
  createdAt: Date
  updatedAt: Date
}

export interface ShopReview extends BaseReview {
  shopId: string
  shopName: string
  orderId: string // For verification (must have purchased from this shop)
  verified: boolean // Verified purchase
}

export interface ProductReview extends BaseReview {
  productId: string
  productName: string
  shopId: string
  shopName: string
  orderId: string // For verification (must have purchased this product)
  verified: boolean // Verified purchase
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export type ReviewType = 'shop' | 'product'
