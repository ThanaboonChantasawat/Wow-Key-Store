import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'
import { createNotification } from '@/lib/notification-service'
import { logActivity } from '@/lib/admin-activity-service'
import admin from 'firebase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // In a real app, verify admin role here

    const body = await request.json()
    const { reportId, action, adminNote, banDuration } = body

    if (!reportId || !action) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    const reportRef = adminDb.collection('reports').doc(reportId)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'ไม่พบรายงาน' }, { status: 404 })
    }

    const reportData = reportDoc.data()
    const targetId = reportData?.targetId
    const targetType = reportData?.targetType
    const targetUserId = reportData?.targetUserId
    const reportReason = reportData?.reason
    
    // Fetch target user name for logging
    let targetName = 'ผู้ใช้'
    if (targetUserId) {
      const userDoc = await adminDb.collection('users').doc(targetUserId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        targetName = userData?.displayName || userData?.email || 'ผู้ใช้'
      }
    }

    const batch = adminDb.batch()

    // Update report status
    batch.update(reportRef, {
      status: 'resolved',
      resolution: action,
      adminNote: adminNote || '',
      resolvedAt: new Date(),
      resolvedBy: token.uid
    })

    if (action === 'delete' || action === 'ban') {
      // Delete content
      if (targetType === 'review') {
        // Check shopReviews first
        const shopReviewRef = adminDb.collection('shopReviews').doc(targetId)
        const shopReviewDoc = await shopReviewRef.get()
        
        if (shopReviewDoc.exists) {
          batch.delete(shopReviewRef)
        } else {
          // Check productReviews
          const productReviewRef = adminDb.collection('productReviews').doc(targetId)
          const productReviewDoc = await productReviewRef.get()
          if (productReviewDoc.exists) {
            batch.delete(productReviewRef)
          }
        }
      } else if (targetType === 'comment') {
        // Check shopComments first
        const shopCommentRef = adminDb.collection('shopComments').doc(targetId)
        const shopCommentDoc = await shopCommentRef.get()
        
        if (shopCommentDoc.exists) {
          batch.delete(shopCommentRef)
        } else {
          // Check productComments
          const productCommentRef = adminDb.collection('productComments').doc(targetId)
          const productCommentDoc = await productCommentRef.get()
          if (productCommentDoc.exists) {
            batch.delete(productCommentRef)
          }
        }
      }

      // Increment violations
      if (targetUserId) {
        const userRef = adminDb.collection('users').doc(targetUserId)
        batch.update(userRef, {
          violations: admin.firestore.FieldValue.increment(1),
          lastViolation: new Date()
        })
      }
    }

    if (action === 'ban' && targetUserId) {
      const userRef = adminDb.collection('users').doc(targetUserId)
      const bannedUntil = new Date()
      bannedUntil.setDate(bannedUntil.getDate() + (banDuration || 7))
      
      batch.update(userRef, {
        accountStatus: 'banned',
        banned: true,
        bannedUntil: bannedUntil,
        bannedReason: adminNote || 'ละเมิดกฎชุมชน',
        bannedBy: token.uid
      })
    }

    await batch.commit()

    // 📝 Log admin activity
    try {
      if (action === 'delete') {
        await logActivity(
          token.uid,
          'delete_content',
          `🗑️ ลบเนื้อหา\n• ประเภท: ${targetType === 'review' ? 'รีวิว' : 'ความคิดเห็น'}\n• เจ้าของ: ${targetName}\n• เหตุผล: ${reportReason || '-'}\n• รหัสรายงาน: ${reportId}\n• หมายเหตุ: ${adminNote || '-'}`,
          { reportId, action, targetType, targetId, targetUserId, adminNote, affectedUserId: targetUserId, targetName, reason: reportReason }
        )
      } else if (action === 'ban') {
        await logActivity(
          token.uid,
          'ban_user',
          `🚫 แบนผู้ใช้\n• ผู้ใช้: ${targetName}\n• ระยะเวลา: ${banDuration || 7} วัน\n• เหตุผล: ${reportReason || '-'}\n• รหัสรายงาน: ${reportId}\n• หมายเหตุ: ${adminNote || '-'}`,
          { reportId, action, targetType, targetId, targetUserId, banDuration, adminNote, affectedUserId: targetUserId, targetName, reason: reportReason }
        )
      } else {
        await logActivity(
          token.uid,
          'process_report',
          `ดำเนินการรายงาน: ${targetType} ID: ${targetId}`,
          { reportId, action, targetType, targetId, targetUserId, adminNote, affectedUserId: targetUserId, targetName }
        )
      }
    } catch (logError) {
      console.error("Error logging admin activity:", logError)
    }

    return NextResponse.json({ success: true, message: 'ดำเนินการรายงานเรียบร้อยแล้ว' })

  } catch (error: any) {
    console.error('Error processing report:', error)
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถดำเนินการรายงานได้' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = token.uid
    const userName = token.name || 'Anonymous'

    const body = await request.json()
    const { targetType, targetId, reason, description } = body

    if (!targetType || !['review', 'comment'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType' },
        { status: 400 }
      )
    }

    if (!targetId || !reason) {
      return NextResponse.json(
        { error: 'targetId and reason are required' },
        { status: 400 }
      )
    }

    // Get target data
    let targetData: any = null
    if (targetType === 'review') {
      // Check shopReviews first
      let doc = await adminDb.collection('shopReviews').doc(targetId).get()
      if (!doc.exists) {
        // Check productReviews
        doc = await adminDb.collection('productReviews').doc(targetId).get()
      }
      if (doc.exists) targetData = doc.data()
    } else if (targetType === 'comment') {
      // Check shopComments first
      let doc = await adminDb.collection('shopComments').doc(targetId).get()
      if (!doc.exists) {
        // Check productComments
        doc = await adminDb.collection('productComments').doc(targetId).get()
      }
      if (doc.exists) targetData = doc.data()
    }

    if (!targetData) {
      return NextResponse.json(
        { error: `${targetType} not found` },
        { status: 404 }
      )
    }

    // Check duplicate report
    const existing = await adminDb
      .collection('reports')
      .where('reporterId', '==', userId)
      .where('targetId', '==', targetId)
      .where('status', '==', 'pending')
      .get()

    if (!existing.empty) {
      return NextResponse.json(
        { error: 'คุณได้รายงานเนื้อหานี้แล้ว' },
        { status: 400 }
      )
    }

    // Create report
    const reportData = {
      targetType,
      targetId,
      targetUserId: targetData.userId,
      targetUserName: targetData.userName || 'Anonymous',
      targetContent: targetData.text || '',
      reporterId: userId,
      reporterName: userName,
      reason,
      description: description || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const reportRef = await adminDb.collection('reports').add(reportData)

    // Notify user
    await createNotification(
      userId,
      'report',
      '✅ ส่งรายงานสำเร็จ',
      'ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง',
      '/profile?tab=my-reports'
    )

    return NextResponse.json({
      success: true,
      reportId: reportRef.id,
      message: 'รายงานของคุณถูกส่งแล้ว'
    })
  } catch (error: any) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create report' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await verifyIdTokenString(authHeader.substring(7))

    const snapshot = await adminDb.collection('reports').orderBy('createdAt', 'desc').get()
    
    const reports = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data()
      let targetUserViolations = 0
      let targetUserBanned = false

      if (data.targetUserId) {
        const userDoc = await adminDb.collection('users').doc(data.targetUserId).get()
        if (userDoc.exists) {
          const userData = userDoc.data()
          targetUserViolations = userData?.violations || 0
          targetUserBanned = userData?.accountStatus === 'banned' || userData?.banned === true
        }
      }

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        targetUserViolations,
        targetUserBanned
      }
    }))

    return NextResponse.json({ reports })
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถดึงข้อมูลรายงานได้' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reportId, adminNote } = body

    if (!reportId) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    const reportRef = adminDb.collection('reports').doc(reportId)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'ไม่พบรายงาน' }, { status: 404 })
    }

    const reportData = reportDoc.data()
    
    if (reportData?.status !== 'resolved') {
      return NextResponse.json({ error: 'รายงานนี้ยังไม่ได้รับการตัดสิน' }, { status: 400 })
    }

    const batch = adminDb.batch()

    // Reset report status
    batch.update(reportRef, {
      status: 'pending',
      resolution: admin.firestore.FieldValue.delete(),
      adminNote: adminNote || '',
      resolvedAt: admin.firestore.FieldValue.delete(),
      resolvedBy: admin.firestore.FieldValue.delete(),
      reversedAt: new Date(),
      reversedBy: token.uid
    })

    // If user was banned/warned by this report, reverse it
    if (reportData.targetUserId && reportData.resolution) {
      const userRef = adminDb.collection('users').doc(reportData.targetUserId)
      const userDoc = await userRef.get()
      
      if (userDoc.exists) {
        const userData = userDoc.data()
        
        if (reportData.resolution === 'ban') {
          // Unban user
          batch.update(userRef, {
            accountStatus: 'active',
            banned: false,
            bannedUntil: admin.firestore.FieldValue.delete(),
            bannedReason: admin.firestore.FieldValue.delete(),
            bannedBy: admin.firestore.FieldValue.delete()
          })
        } else if (reportData.resolution === 'warn') {
          // Reduce violation count
          const currentViolations = userData?.violations || 0
          if (currentViolations > 0) {
            batch.update(userRef, {
              violations: currentViolations - 1
            })
          }
        }
      }
    }

    await batch.commit()

    // 📝 Log admin activity
    try {
      const actionText = reportData.resolution === 'ban' ? 'ยกเลิกแบน' : reportData.resolution === 'warn' ? 'ลดการเตือน' : 'ย้อนกลับ'
      await logActivity(
        token.uid,
        'reverse_report_decision',
        `${actionText} การตัดสินรายงาน: ${reportData.targetType} ID: ${reportData.targetId}`,
        { reportId, originalResolution: reportData.resolution, targetUserId: reportData.targetUserId, adminNote, affectedUserId: reportData.targetUserId }
      )
    } catch (logError) {
      console.error("Error logging admin activity:", logError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'ยกเลิกการตัดสินเรียบร้อยแล้ว' 
    })

  } catch (error: any) {
    console.error('Error reversing report decision:', error)
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถยกเลิกการตัดสินได้' },
      { status: 500 }
    )
  }
}
