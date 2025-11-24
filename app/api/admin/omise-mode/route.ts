import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'

// GET - Get current Omise mode
export async function GET() {
  try {
    const settingsRef = adminDb.collection('settings').doc('omise')
    const doc = await settingsRef.get()
    
    const mode = doc.exists ? doc.data()?.mode || 'test' : 'test'
    const keys = doc.exists ? doc.data()?.keys : null
    
    return NextResponse.json({
      mode,
      hasTestKeys: !!keys?.test?.publicKey && !!keys?.test?.secretKey,
      hasLiveKeys: !!keys?.live?.publicKey && !!keys?.live?.secretKey,
    })
  } catch (error) {
    console.error('Error getting Omise mode:', error)
    return NextResponse.json({ mode: 'test' })
  }
}

// POST - Switch Omise mode
export async function POST(request: NextRequest) {
  try {
    const { mode, keys } = await request.json()

    if (!['test', 'live'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "test" or "live"' },
        { status: 400 }
      )
    }

    const settingsRef = adminDb.collection('settings').doc('omise')
    const updateData: any = { mode }

    // If keys are provided, update them
    if (keys) {
      if (keys.test) {
        updateData['keys.test'] = {
          publicKey: keys.test.publicKey || '',
          secretKey: keys.test.secretKey || '',
        }
      }
      if (keys.live) {
        updateData['keys.live'] = {
          publicKey: keys.live.publicKey || '',
          secretKey: keys.live.secretKey || '',
        }
      }
    }

    await settingsRef.set(updateData, { merge: true })

    return NextResponse.json({
      success: true,
      mode,
      message: `Switched to ${mode} mode`,
    })
  } catch (error: any) {
    console.error('Error switching Omise mode:', error)
    return NextResponse.json(
      { error: 'Failed to switch mode' },
      { status: 500 }
    )
  }
}
