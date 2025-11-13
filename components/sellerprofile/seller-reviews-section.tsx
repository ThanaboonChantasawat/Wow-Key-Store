'use client'

import { Star, MessageCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewList } from "@/components/review/review-list"
import { CommentList } from "@/components/comment/comment-list"
import { useAuth } from "@/components/auth-context"

interface SellerReviewsSectionProps {
  shopId: string
  shopName: string
}

export function SellerReviewsSection({ shopId, shopName }: SellerReviewsSectionProps) {
  const { user } = useAuth()

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              รีวิวร้านค้า
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              คำถาม & ความคิดเห็น
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="reviews">
            <ReviewList
              type="shop"
              shopId={shopId}
              currentUserId={user?.uid}
            />
          </TabsContent>
          
          <TabsContent value="comments">
            <CommentList
              type="shop"
              shopId={shopId}
              shopName={shopName}
              currentUserId={user?.uid}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
