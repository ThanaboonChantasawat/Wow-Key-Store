import { adminDb, adminStorage } from './firebase-admin-config'

export interface SliderImage {
  id: string
  url: string
  order: number
  createdAt: string
  updatedAt: string
  active: boolean
}

// Get all slider images (active only for public, all for admin)
export async function getSliderImages(activeOnly = true): Promise<SliderImage[]> {
  try {
    const sliderRef = adminDb.collection('sliders')
    const snapshot = await sliderRef.get()
    
    let images = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as SliderImage[]
    
    // Filter active only if needed
    if (activeOnly) {
      images = images.filter(img => img.active === true)
    }
    
    // Sort by order
    images.sort((a, b) => a.order - b.order)
    
    return images
  } catch (error) {
    console.error('Error fetching slider images:', error)
    throw error
  }
}

// Upload slider image
export async function uploadSliderImage(
  file: File,
  order: number
): Promise<SliderImage> {
  try {
    // Check if we already have 5 images
    const existingImages = await getSliderImages(false)
    if (existingImages.length >= 5) {
      throw new Error('สามารถมีรูป Slider ได้สูงสุด 5 รูปเท่านั้น')
    }

    // Upload to Firebase Storage
    const timestamp = Date.now()
    const fileName = `slider_${timestamp}_${file.name}`
    const bucket = adminStorage.bucket()
    const fileBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)
    
    const fileUpload = bucket.file(`sliders/${fileName}`)
    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    })
    
    // Make the file public
    await fileUpload.makePublic()
    
    const url = `https://storage.googleapis.com/${bucket.name}/sliders/${fileName}`

    // Save to Firestore
    const sliderData = {
      url,
      order: order || existingImages.length + 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const docRef = await adminDb.collection('sliders').add(sliderData)

    return {
      id: docRef.id,
      ...sliderData
    }
  } catch (error) {
    console.error('Error uploading slider image:', error)
    throw error
  }
}

// Update slider image
export async function updateSliderImage(
  id: string,
  updates: Partial<SliderImage>
): Promise<void> {
  try {
    await adminDb.collection('sliders').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating slider image:', error)
    throw error
  }
}

// Delete slider image
export async function deleteSliderImage(id: string, imageUrl: string): Promise<void> {
  try {
    // Delete from Storage
    const bucket = adminStorage.bucket()
    const fileName = imageUrl.split('/').pop()
    if (fileName) {
      const file = bucket.file(`sliders/${fileName}`)
      await file.delete().catch(err => {
        console.log('File may not exist in storage:', err.message)
      })
    }

    // Delete from Firestore
    await adminDb.collection('sliders').doc(id).delete()
  } catch (error) {
    console.error('Error deleting slider image:', error)
    throw error
  }
}

// Reorder slider images
export async function reorderSliderImages(imageIds: string[]): Promise<void> {
  try {
    const batch = adminDb.batch()
    
    imageIds.forEach((id, index) => {
      const docRef = adminDb.collection('sliders').doc(id)
      batch.update(docRef, {
        order: index + 1,
        updatedAt: new Date().toISOString()
      })
    })

    await batch.commit()
  } catch (error) {
    console.error('Error reordering slider images:', error)
    throw error
  }
}
