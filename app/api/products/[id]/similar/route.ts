import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

/**
 * GET /api/products/[id]/similar
 * Get similar products based on categories
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '6')

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Get current product
    let productDoc = await adminDb.collection('products').doc(id).get()
    let collection = 'products'
    
    // Try games collection if not found in products
    if (!productDoc.exists) {
      productDoc = await adminDb.collection('games').doc(id).get()
      collection = 'games'
    }

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productData = productDoc.data()!
    const categories = productData.categories || []
    const shopId = productData.shopId

    console.log('Product data:', { id, categories, shopId, collection })

    // If no categories, try to find products from same shop or random products
    if (categories.length === 0) {
      if (shopId) {
        // Get products from same shop
        const shopProductsSnapshot = await adminDb
          .collection(collection)
          .where('shopId', '==', shopId)
          .limit(limit + 1) // +1 to account for current product
          .get()

        const shopProducts: any[] = []
        shopProductsSnapshot.docs.forEach((doc) => {
          if (doc.id === id) return // Skip current product
          const data = doc.data()
          shopProducts.push({
            id: doc.id,
            ...data,
            similarityScore: 1,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          })
        })

        if (shopProducts.length > 0) {
          console.log('Found products from same shop:', shopProducts.length)
          return NextResponse.json({ products: shopProducts.slice(0, limit) })
        }
      }

      // If no shop products, get random products
      const allProductsSnapshot = await adminDb
        .collection(collection)
        .limit(limit + 1)
        .get()

      const randomProducts: any[] = []
      allProductsSnapshot.docs.forEach((doc) => {
        if (doc.id === id) return // Skip current product
        const data = doc.data()
        if (data.status && data.status !== 'active') return // Skip inactive
        randomProducts.push({
          id: doc.id,
          ...data,
          similarityScore: 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        })
      })

      console.log('Returning random products:', randomProducts.length)
      return NextResponse.json({ products: randomProducts.slice(0, limit) })
    }

    // Find products with similar categories
    const productsSnapshot = await adminDb
      .collection(collection)
      .get()

    const similarProducts: any[] = []

    productsSnapshot.docs.forEach((doc) => {
      // Skip current product
      if (doc.id === id) return

      const data = doc.data()
      
      // Skip inactive products if status exists
      if (data.status && data.status !== 'active') return
      
      const productCategories = data.categories || []

      // Calculate similarity score (number of matching categories)
      const matchingCategories = productCategories.filter((cat: string) =>
        categories.includes(cat)
      )

      if (matchingCategories.length > 0) {
        similarProducts.push({
          id: doc.id,
          ...data,
          similarityScore: matchingCategories.length,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        })
      }
    })

    // Sort by similarity score (desc) and then by views/sales
    similarProducts.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore
      }
      // Secondary sort by views
      return (b.views || 0) - (a.views || 0)
    })

    // Limit results
    const limitedProducts = similarProducts.slice(0, limit)

    // If still no similar products found, get latest products
    if (limitedProducts.length === 0) {
      console.log('No similar products found, fetching latest products')
      
      // Try both collections
      const latestProductsSnapshot = await adminDb
        .collection('products')
        .where('status', '==', 'active')
        .limit(limit + 1)
        .get()

      const latestGamesSnapshot = await adminDb
        .collection('games')
        .where('status', '==', 'active')
        .limit(limit + 1)
        .get()

      const latestProducts: any[] = []
      
      latestProductsSnapshot.docs.forEach((doc) => {
        if (doc.id === id) return
        const data = doc.data()
        latestProducts.push({
          id: doc.id,
          ...data,
          similarityScore: 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        })
      })

      latestGamesSnapshot.docs.forEach((doc) => {
        if (doc.id === id) return
        const data = doc.data()
        latestProducts.push({
          id: doc.id,
          ...data,
          similarityScore: 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        })
      })

      // Sort by creation date (newest first)
      latestProducts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      const finalProducts = latestProducts.slice(0, limit)
      console.log('Returning latest products:', finalProducts.length)
      return NextResponse.json({ products: finalProducts })
    }

    console.log('Returning similar products by categories:', limitedProducts.length)
    return NextResponse.json({ products: limitedProducts })
  } catch (error: any) {
    console.error('Error getting similar products:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get similar products' },
      { status: 500 }
    )
  }
}
