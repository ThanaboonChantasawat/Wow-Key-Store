import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin-config"
import { verifyAuth } from "@/lib/auth-helpers"

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { orderId } = params

    // Fetch order
    const orderDoc = await adminDb.collection("orders").doc(orderId).get()
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    const orderData = orderDoc.data()

    // Verify seller owns this order
    // Check if user owns the shop
    let isOwner = false

    // For cart orders (with shops array)
    if (orderData?.shops && Array.isArray(orderData.shops)) {
      for (const shop of orderData.shops) {
        const shopDoc = await adminDb.collection("shops").doc(shop.shopId).get()
        if (shopDoc.exists && shopDoc.data()?.userId === user.uid) {
          isOwner = true
          break
        }
      }
    } 
    // For direct orders (with shopId)
    else if (orderData?.shopId) {
      const shopDoc = await adminDb.collection("shops").doc(orderData.shopId).get()
      if (shopDoc.exists && shopDoc.data()?.userId === user.uid) {
        isOwner = true
      }
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: "You do not have permission to view this order" },
        { status: 403 }
      )
    }

    // Return order data with items and deliveredItems
    return NextResponse.json({
      orderId: orderDoc.id,
      orderNumber: orderData?.orderNumber,
      items: orderData?.items || [],
      deliveredItems: orderData?.deliveredItems || [],
      shops: orderData?.shops || [],
      createdAt: orderData?.createdAt,
      status: orderData?.status,
    })

  } catch (error: any) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch order" },
      { status: 500 }
    )
  }
}
