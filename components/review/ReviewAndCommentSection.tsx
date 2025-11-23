"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Star, MessageCircle } from "lucide-react"
import { ReviewList } from "@/components/review/review-list"
import { CommentList } from "@/components/comment/comment-list"
import { useAuth } from "@/components/auth-context"

interface ReviewAndCommentSectionProps {
  type: "shop" | "product"
  shopId?: string
  shopName?: string
  productId?: string
  productName?: string
}

export function ReviewAndCommentSection({
  type,
  shopId,
  shopName,
  productId,
  productName,
}: ReviewAndCommentSectionProps) {
  const { user } = useAuth()

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              รีวิว{type === "shop" ? "ร้านค้า" : "สินค้า"}
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              คำถาม & ความคิดเห็น
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews">
            <ReviewList
              type={type}
              shopId={type === "shop" ? shopId : undefined}
              productId={type === "product" ? productId : undefined}
              currentUserId={user?.uid}
            />
          </TabsContent>

          <TabsContent value="comments">
            <CommentList
              type={type}
              shopId={shopId || ''}
              productId={productId}
              shopName={shopName || ''}
              productName={productName}
              currentUserId={user?.uid}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
