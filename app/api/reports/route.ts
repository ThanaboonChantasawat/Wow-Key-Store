import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { verifyIdTokenString } from '@/lib/auth-helpers'
import { createNotification } from '@/lib/notification-service'
import { logAdminActivity } from '@/lib/admin-activity-service'

/**
 * GET /api/reports
 * Get all reports (admin only) or user's own reports
 * Query: ?status=pending|approved|rejected&type=review|comment
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const userId = token.uid
    
    // Get user role from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userRole = userData?.role || 'buyer'

    console.log('🔍 GET /api/reports - User:', userId, 'Role:', userRole)

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query: any = adminDb.collection('reports')

    // If not admin, only show user's own reports
    if (!['admin', 'superadmin'].includes(userRole)) {
      console.log('⚠️  User is not admin, filtering by reporterId:', userId)
      query = query.where('reporterId', '==', userId)
    } else {
      console.log('✅ User is admin, fetching all reports')
    }

    // Filter by status
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.where('status', '==', status)
      console.log('🔍 Filtering by status:', status)
    }

    // Filter by type
    if (type && ['review', 'comment'].includes(type)) {
      query = query.where('targetType', '==', type)
      console.log('🔍 Filtering by type:', type)
    }

    // Don't use orderBy to avoid index requirement - sort in memory instead
    const snapshot = await query.get()

    console.log('📊 Query returned', snapshot.docs.length, 'documents')

    // Get reports with target user violations count
    const reportsPromises = snapshot.docs.map(async (doc: any) => {
      const reportData = doc.data()
      
      // Fetch target user's violation count
      let targetUserViolations = 0
      let targetUserBanned = false
      
      if (reportData.targetUserId) {
        try {
          const targetUserDoc = await adminDb.collection('users').doc(reportData.targetUserId).get()
          const targetUserData = targetUserDoc.data()
          targetUserViolations = targetUserData?.violations || 0
          targetUserBanned = targetUserData?.banned || false
          console.log('🔍 Target user:', reportData.targetUserName, 'violations:', targetUserViolations, 'banned:', targetUserBanned)
        } catch (error) {
          console.error('Error fetching target user violations:', error)
        }
      }

      return {
        id: doc.id,
        ...reportData,
        targetUserViolations,
        targetUserBanned,
        createdAt: reportData.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: reportData.updatedAt?.toDate?.()?.toISOString() || null
      }
    })

    const reports = await Promise.all(reportsPromises)

    // Sort by createdAt in memory (newest first)
    reports.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    console.log('✅ Returning', reports.length, 'reports')

    return NextResponse.json({ reports })
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reports
 * Create a new report
 * Body: { targetType: 'review' | 'comment', targetId, reason, description? }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const userId = token.uid
    const userName = token.name || 'Anonymous'

    const body = await request.json()
    const { targetType, targetId, reason, description } = body

    // Validation
    if (!targetType || !['review', 'comment'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType. Must be "review" or "comment"' },
        { status: 400 }
      )
    }

    if (!targetId) {
      return NextResponse.json(
        { error: 'targetId is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    // Check if target exists
    let targetData: any = null
    let targetCollection = targetType === 'review' ? 'reviews' : null
    let relatedShop: any = null
    let relatedProduct: any = null

    if (targetType === 'comment') {
      // Try both shopComments and productComments
      const shopComment = await adminDb.collection('shopComments').doc(targetId).get()
      if (shopComment.exists) {
        targetData = shopComment.data()
        targetCollection = 'shopComments'
        
        // Get shop data for ownerId
        if (targetData.shopId) {
          const shopDoc = await adminDb.collection('shops').doc(targetData.shopId).get()
          if (shopDoc.exists) {
            relatedShop = shopDoc.data()
          }
        }
      } else {
        const productComment = await adminDb.collection('productComments').doc(targetId).get()
        if (productComment.exists) {
          targetData = productComment.data()
          targetCollection = 'productComments'
          
          // Get product data for shopId and ownerId
          if (targetData.productId) {
            const productDoc = await adminDb.collection('products').doc(targetData.productId).get()
            if (productDoc.exists) {
              relatedProduct = productDoc.data()
              
              // Get shop data for ownerId
              if (relatedProduct.shopId) {
                const shopDoc = await adminDb.collection('shops').doc(relatedProduct.shopId).get()
                if (shopDoc.exists) {
                  relatedShop = shopDoc.data()
                }
              }
            }
          }
        }
      }
    } else {
      const review = await adminDb.collection('reviews').doc(targetId).get()
      if (review.exists) {
        targetData = review.data()
        
        // Get shop data for ownerId
        if (targetData.shopId) {
          const shopDoc = await adminDb.collection('shops').doc(targetData.shopId).get()
          if (shopDoc.exists) {
            relatedShop = shopDoc.data()
          }
        }
        
        // Get product data if it's a product review
        if (targetData.productId) {
          const productDoc = await adminDb.collection('products').doc(targetData.productId).get()
          if (productDoc.exists) {
            relatedProduct = productDoc.data()
          }
        }
      }
    }

    if (!targetData) {
      return NextResponse.json(
        { error: `${targetType} not found` },
        { status: 404 }
      )
    }

    // Check if user already reported this content
    const existingReport = await adminDb
      .collection('reports')
      .where('reporterId', '==', userId)
      .where('targetId', '==', targetId)
      .where('status', '==', 'pending')
      .get()

    if (!existingReport.empty) {
      return NextResponse.json(
        { error: 'คุณได้รายงานเนื้อหานี้แล้ว' },
        { status: 400 }
      )
    }

    // Create report
    const reportData = {
      targetType,
      targetId,
      targetCollection,
      targetUserId: targetData.userId,
      targetUserName: targetData.userName || 'Anonymous',
      targetContent: targetData.text || targetData.comment || '',
      targetOriginalContent: targetData.originalText || targetData.text || targetData.comment || '', // Save original uncensored content for admin
      productId: targetData.productId || relatedProduct?.id || null,
      productName: targetData.productName || relatedProduct?.name || null,
      shopId: targetData.shopId || relatedShop?.id || null,
      shopName: targetData.shopName || relatedShop?.name || null,
      shopOwnerId: relatedShop?.ownerId || null,
      reporterId: userId,
      reporterName: userName,
      reason,
      description: description || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      adminNote: ''
    }

    const reportRef = await adminDb.collection('reports').add(reportData)

    // Translate reason to Thai
    const reasonText: Record<string, string> = {
      spam: 'สแปม/โฆษณา',
      offensive: 'คำหยาบ/ไม่เหมาะสม',
      fake: 'รีวิวปลอม/ข้อมูลเท็จ',
      misinformation: 'ข้อมูลเท็จ',
      harassment: 'ล่วงละเมิด/คุกคาม',
      other: 'อื่นๆ',
    }

    const translatedReason = reasonText[reason] || reason
    const targetTypeText = targetType === 'review' ? 'รีวิว' : 'ความคิดเห็น'
    const targetInfo = reportData.productName 
      ? `ในสินค้า "${reportData.productName}"`
      : reportData.shopName 
      ? `ในร้าน "${reportData.shopName}"`
      : ''

    // Notify the reporter (person who submitted the report)
    await createNotification(
      userId,
      'report',
      '✅ ส่งรายงานสำเร็จ',
      `คุณได้รายงาน${targetTypeText}โดย ${reportData.targetUserName} ${targetInfo}\nเหตุผล: ${translatedReason}\n\nทีมงานจะตรวจสอบภายใน 24 ชั่วโมง`,
      '/profile?tab=my-reports',
      {
        reportId: reportRef.id,
        targetType,
        targetUserName: reportData.targetUserName,
        reason: translatedReason,
        productName: reportData.productName,
        shopName: reportData.shopName,
      }
    )

    // Notify all admins about new report
    const adminsSnapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'superadmin'])
      .get()

    const notificationPromises = adminsSnapshot.docs.map((doc) =>
      createNotification(
        doc.id,
        'report',
        '🚨 รายงานใหม่',
        `${userName} รายงาน${targetTypeText}โดย ${reportData.targetUserName} ${targetInfo}\nเหตุผล: ${translatedReason}`,
        `/admin?section=reports`,
        {
          reportId: reportRef.id,
          reporterName: userName,
          targetType,
          targetUserName: reportData.targetUserName,
          reason: translatedReason,
          productName: reportData.productName,
          shopName: reportData.shopName,
        }
      )
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      reportId: reportRef.id,
      message: 'รายงานของคุณถูกส่งแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด'
    })
  } catch (error: any) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create report' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/reports
 * Update report status (admin only)
 * Body: { reportId, action: 'approve' | 'reject' | 'delete' | 'ban', adminNote?, banDuration? }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const userId = token.uid
    const userName = token.name || 'Admin'

    // Get user role from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userRole = userData?.role || 'buyer'

    console.log('🔍 PATCH /api/reports - User:', userId, 'Role:', userRole)

    // Check admin permission
    if (!['admin', 'superadmin'].includes(userRole)) {
      console.log('❌ Forbidden: User is not admin')
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { reportId, action, adminNote, banDuration } = body

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
    }

    if (!action || !['approve', 'reject', 'delete', 'ban'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve", "reject", "delete", or "ban"' },
        { status: 400 }
      )
    }

    // ✅ บังคับให้กรอกเหตุผลสำหรับการลบและแบน
    if ((action === 'delete' || action === 'ban') && (!adminNote || adminNote.trim() === '')) {
      return NextResponse.json(
        { error: 'adminNote is required for delete and ban actions' },
        { status: 400 }
      )
    }

    // ✅ บังคับให้กรอกเหตุผลสำหรับการปฏิเสธ (เพื่อป้องกันการปฏิเสธรายงานที่ถูกต้อง)
    if (action === 'reject' && (!adminNote || adminNote.trim() === '')) {
      return NextResponse.json(
        { error: 'adminNote is required for reject action to prevent abuse' },
        { status: 400 }
      )
    }

    // Get report
    const reportDoc = await adminDb.collection('reports').doc(reportId).get()
    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const reportData = reportDoc.data()!
    let message = ''

    // Perform action
    switch (action) {
      case 'approve':
        // Mark as approved but don't delete content
        await adminDb.collection('reports').doc(reportId).update({
          status: 'approved',
          reviewedBy: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          adminNote: adminNote || 'รายงานถูกต้อง แต่ยังไม่ได้ลบเนื้อหา'
        })

        // ✅ Log admin activity
        await logAdminActivity(
          userId,
          userName,
          userData.email || 'unknown@email.com',
          'approve_report',
          'report',
          reportId,
          `Report by ${reportData.reporterName}`,
          `Approved report against ${reportData.targetUserName}: ${adminNote || 'No note provided'}`,
          reportData.targetUserId // ✅ เพิ่ม affectedUserId เพื่อให้ query หาประวัติการละเมิดได้ง่าย
        )

        message = 'รายงานได้รับการอนุมัติ'
        break

      case 'reject':
        // Mark as rejected
        await adminDb.collection('reports').doc(reportId).update({
          status: 'rejected',
          reviewedBy: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          adminNote: adminNote || 'รายงานไม่ถูกต้อง'
        })

        // ✅ Log admin activity - สำคัญมาก! เพื่อตรวจสอบว่ามีการปฏิเสธรายงานที่ถูกต้องหรือไม่
        await logAdminActivity(
          userId,
          userName,
          userData.email || 'unknown@email.com',
          'reject_report',
          'report',
          reportId,
          `${reportData.targetType === 'review' ? 'รีวิว' : 'ความคิดเห็น'}ของ ${reportData.targetUserName}`,
          `❌ ปฏิเสธรายงาน\n\n` +
          `� ผู้ถูกรายงาน:\n` +
          `• ชื่อ: ${reportData.targetUserName}\n` +
          `• เนื้อหาที่ถูกรายงาน: ${reportData.targetType === 'review' ? 'รีวิวสินค้า' : 'ความคิดเห็นร้านค้า'}\n` +
          `• เนื้อหา: ${reportData.targetContent ? reportData.targetContent.substring(0, 100) : 'ไม่ระบุ'}${reportData.targetContent && reportData.targetContent.length > 100 ? '...' : ''}\n\n` +
          `📢 ผู้รายงาน:\n` +
          `• ชื่อ: ${reportData.reporterName}\n` +
          `• เหตุผลที่รายงาน: ${reportData.reason}\n\n` +
          `📝 เหตุผลในการปฏิเสธ:\n${adminNote}\n\n` +
          `✅ ผลลัพธ์: รายงานถูกปฏิเสธ ${reportData.targetUserName} ไม่ถูกดำเนินการใดๆ`,
          reportData.targetUserId // ✅ เพิ่ม affectedUserId เพื่อให้ query หาประวัติการละเมิดได้ง่าย
        )

        message = 'รายงานถูกปฏิเสธ'
        break

      case 'delete':
        // Delete the reported content
        const collection = reportData.targetCollection || 
          (reportData.targetType === 'review' ? 'reviews' : 'shopComments')
        
        await adminDb.collection(collection).doc(reportData.targetId).delete()

        // Increment user violations
        const deleteUserDoc = await adminDb.collection('users').doc(reportData.targetUserId).get()
        const deleteUserViolations = deleteUserDoc.data()?.violations || 0
        
        await adminDb.collection('users').doc(reportData.targetUserId).update({
          violations: deleteUserViolations + 1,
          lastViolation: new Date()
        })
        
        await adminDb.collection('reports').doc(reportId).update({
          status: 'approved',
          reviewedBy: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          adminNote: adminNote || 'เนื้อหาถูกลบแล้ว'
        })

        // Notify the content owner with Thai reason and details
        const reasonTextMap: Record<string, string> = {
          spam: 'สแปม',
          offensive: 'เนื้อหาไม่เหมาะสม',
          'false-information': 'ข้อมูลเท็จ',
          inappropriate: 'ไม่เหมาะสม',
          harassment: 'การคุกคาม',
          other: 'อื่นๆ'
        }
        const reasonText = reasonTextMap[reportData.reason] || reportData.reason
        
        // Build detailed message (using deleteUserViolations from above)
        let detailedMessage = `${reportData.targetType === 'review' ? 'รีวิว' : 'ความคิดเห็น'}ของคุณถูกลบเนื่องจาก: ${reasonText}`
        
        // Add content preview if available
        if (reportData.targetContent) {
          const preview = reportData.targetContent.length > 50 
            ? reportData.targetContent.substring(0, 50) + '...' 
            : reportData.targetContent
          detailedMessage += `\n\nเนื้อหาที่ถูกลบ: "${preview}"`
        }
        
        // Add location info
        if (reportData.productName) {
          detailedMessage += `\n📦 สินค้า: ${reportData.productName}`
        } else if (reportData.shopName) {
          detailedMessage += `\n🏪 ร้านค้า: ${reportData.shopName}`
        }
        
        // Add admin note if provided
        if (adminNote && adminNote !== 'เนื้อหาถูกลบแล้ว') {
          detailedMessage += `\n\n💬 หมายเหตุจากแอดมิน: ${adminNote}`
        }
        
        // Add violation warning
        if (deleteUserViolations >= 2) {
          detailedMessage += `\n\n⚠️ คุณมีประวัติการละเมิดแล้ว ${deleteUserViolations + 1} ครั้ง กรุณาปฏิบัติตามกฎระเบียบเพื่อหลีกเลี่ยงการถูกแบน`
        } else if (deleteUserViolations === 1) {
          detailedMessage += `\n\n⚠️ นี่เป็นการเตือนครั้งที่ ${deleteUserViolations + 1} กรุณาอ่านกฎและข้อกำหนดของเรา`
        }
        
        await createNotification(
          reportData.targetUserId,
          'warning',
          '⚠️ เนื้อหาของคุณถูกลบ',
          detailedMessage,
          '/notifications' // ไปหน้าแจ้งเตือนเพื่ออ่านรายละเอียด
        )

        // ✅ Log admin activity - การลบเนื้อหา
        await logAdminActivity(
          userId,
          userName,
          userData.email || 'unknown@email.com',
          'delete_content',
          reportData.targetType,
          reportData.targetId,
          reportData.targetUserName,
          `Deleted ${reportData.targetType} from report ${reportId}. Reason: ${reportData.reason}. Admin note: ${adminNote}. User violations: ${deleteUserViolations + 1}`,
          reportData.targetUserId // ✅ เพิ่ม affectedUserId เพื่อให้ query หาประวัติการละเมิดได้ง่าย
        )

        message = 'ลบเนื้อหาเรียบร้อยแล้ว'
        break

      case 'ban':
        // Ban the user
        const duration = banDuration || 7 // Default 7 days
        const bannedUntil = new Date()
        bannedUntil.setDate(bannedUntil.getDate() + duration)

        // Get current violations count
        const userDoc = await adminDb.collection('users').doc(reportData.targetUserId).get()
        const currentViolations = userDoc.data()?.violations || 0

        await adminDb.collection('users').doc(reportData.targetUserId).update({
          banned: true,
          bannedUntil: bannedUntil,
          bannedReason: reportData.reason,
          bannedBy: userId,
          violations: currentViolations + 1,
          lastViolation: new Date()
        })

        // Delete the content too
        const targetCollection = reportData.targetCollection || 
          (reportData.targetType === 'review' ? 'reviews' : 'shopComments')
        
        await adminDb.collection(targetCollection).doc(reportData.targetId).delete()

        await adminDb.collection('reports').doc(reportId).update({
          status: 'approved',
          reviewedBy: userId,
          reviewedByName: userName,
          reviewedAt: new Date(),
          adminNote: adminNote || `ผู้ใช้ถูกแบน ${duration} วัน`
        })

        // Notify the banned user with Thai reason and details
        const banReasonTextMap: Record<string, string> = {
          spam: 'สแปม',
          offensive: 'เนื้อหาไม่เหมาะสม',
          'false-information': 'ข้อมูลเท็จ',
          inappropriate: 'ไม่เหมาะสม',
          harassment: 'การคุกคาม',
          other: 'อื่นๆ'
        }
        const banReasonText = banReasonTextMap[reportData.reason] || reportData.reason
        
        // Build detailed ban message
        let banMessage = `🚫 บัญชีของคุณถูกระงับเป็นเวลา ${duration} วัน เนื่องจาก: ${banReasonText}`
        
        // Add content that was deleted
        if (reportData.targetContent) {
          const preview = reportData.targetContent.length > 50 
            ? reportData.targetContent.substring(0, 50) + '...' 
            : reportData.targetContent
          banMessage += `\n\nเนื้อหาที่ถูกลบ: "${preview}"`
        }
        
        // Add location info
        if (reportData.productName) {
          banMessage += `\n📦 สินค้า: ${reportData.productName}`
        } else if (reportData.shopName) {
          banMessage += `\n🏪 ร้านค้า: ${reportData.shopName}`
        }
        
        // Add ban until date
        banMessage += `\n\n⏰ แบนจนถึง: ${bannedUntil.toLocaleDateString('th-TH', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`
        
        // Add admin note if provided
        if (adminNote && adminNote !== `ผู้ใช้ถูกแบน ${duration} วัน`) {
          banMessage += `\n\n💬 หมายเหตุจากแอดมิน: ${adminNote}`
        }
        
        // Add violation count warning
        const newViolations = currentViolations + 1
        if (newViolations >= 3) {
          banMessage += `\n\n🔴 คำเตือนสุดท้าย: คุณมีประวัติการละเมิด ${newViolations} ครั้งแล้ว การละเมิดครั้งต่อไปอาจทำให้บัญชีถูกระงับถาวร`
        } else if (newViolations >= 2) {
          banMessage += `\n\n⚠️ คำเตือน: นี่เป็นการละเมิดครั้งที่ ${newViolations} กรุณาปฏิบัติตามกฎระเบียบ`
        }
        
        await createNotification(
          reportData.targetUserId,
          'warning',
          '🚫 บัญชีของคุณถูกระงับ',
          banMessage,
          '/notifications' // ไปหน้าแจ้งเตือนเพื่ออ่านรายละเอียดการแบน
        )

        // ✅ Log admin activity - การแบนผู้ใช้ (สำคัญมาก!)
        await logAdminActivity(
          userId,
          userName,
          userData.email || 'unknown@email.com',
          'ban_user',
          'user',
          reportData.targetUserId,
          reportData.targetUserName,
          `Banned user for ${duration} days from report ${reportId}. Reason: ${reportData.reason}. Admin note: ${adminNote}. User violations: ${newViolations}. Banned until: ${bannedUntil.toISOString()}`,
          reportData.targetUserId // ✅ เพิ่ม affectedUserId เพื่อให้ query หาประวัติการละเมิดได้ง่าย
        )

        message = `แบนผู้ใช้เป็นเวลา ${duration} วันเรียบร้อยแล้ว`
        break
    }

    // Notify reporter
    await createNotification(
      reportData.reporterId,
      'info',
      '✅ รายงานของคุณได้รับการตรวจสอบแล้ว',
      message,
      '/profile?tab=my-reports'
    )

    return NextResponse.json({
      success: true,
      message
    })
  } catch (error: any) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update report' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/reports
 * Reverse a report decision (undo approval/rejection)
 * Body: { reportId, adminNote }
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await verifyIdTokenString(authHeader.substring(7))
    const userId = token.uid
    const userName = token.name || 'Admin'

    // Get user from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    
    // Check admin permission
    if (!['admin', 'superadmin'].includes(userData?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { reportId, adminNote } = body

    if (!reportId || !adminNote?.trim()) {
      return NextResponse.json(
        { error: 'reportId and adminNote are required' },
        { status: 400 }
      )
    }

    // Get report
    const reportRef = adminDb.collection('reports').doc(reportId)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const reportData = reportDoc.data()!

    // Check if report can be reversed
    if (reportData.status === 'pending') {
      return NextResponse.json(
        { error: 'Cannot reverse a pending report' },
        { status: 400 }
      )
    }

    const oldStatus = reportData.status
    const oldAdminNote = reportData.adminNote || 'ไม่มีหมายเหตุ'
    const oldReviewedBy = reportData.reviewedByName || 'Unknown Admin'

    console.log('🔄 Reversing report decision:', {
      reportId,
      oldStatus,
      targetUserId: reportData.targetUserId,
      targetUserName: reportData.targetUserName,
    })

    // If it was approved, reduce violation count and unban if needed
    if (oldStatus === 'approved') {
      const targetUserRef = adminDb.collection('users').doc(reportData.targetUserId)
      const targetUserDoc = await targetUserRef.get()
      
      if (targetUserDoc.exists) {
        const targetUserData = targetUserDoc.data()!
        const currentViolations = targetUserData.violations || 0
        const newViolations = Math.max(0, currentViolations - 1)

        console.log('📉 Reducing violations:', {
          userId: reportData.targetUserId,
          currentViolations,
          newViolations,
        })

        // Update user violations
        await targetUserRef.update({
          violations: newViolations,
        })

        // If user is banned, check if we should unban them
        if (targetUserData.banned) {
          const bannedUntil = targetUserData.bannedUntil?.toDate()
          const now = new Date()

          // Unban if the ban was from this report (within reasonable time frame)
          // or if violations drop below threshold
          if (newViolations < 3) {
            await targetUserRef.update({
              banned: false,
              bannedUntil: null,
            })

            console.log('✅ User unbanned:', reportData.targetUserId)

            // Notify user
            await createNotification(
              reportData.targetUserId,
              'success',
              '✅ บัญชีของคุณถูกปลดแบนแล้ว',
              `หลังจากตรวจสอบอุทธรณ์ของคุณอีกครั้ง แอดมินได้ตัดสินใจยกเลิกการแบนบัญชีของคุณ\n\nเหตุผล: ${adminNote}\n\nจำนวนการละเมิด: ${currentViolations} → ${newViolations} ครั้ง`,
              '/notifications'
            )
          }
        }

        // Notify user about violation reduction
        await createNotification(
          reportData.targetUserId,
          'info',
          '📋 การตัดสินรายงานถูกยกเลิก',
          `แอดมินได้ทบทวนรายงานและยกเลิกการตัดสินเดิม\n\nเหตุผล: ${adminNote}\n\nจำนวนการละเมิด: ${currentViolations} → ${newViolations} ครั้ง\n\n⚠️ หมายเหตุ: เนื้อหาที่ถูกลบไปแล้วจะไม่สามารถกู้คืนได้`,
          '/profile?tab=violation-history'
        )
      }
    }

    // Update report status back to pending
    await reportRef.update({
      status: 'pending',
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      adminNote: `[UNDO] การตัดสินเดิมถูกยกเลิกโดย ${userName}\n\nสถานะเดิม: ${oldStatus === 'approved' ? 'ดำเนินการแล้ว' : 'ปฏิเสธรายงาน'}\nตัดสินโดย: ${oldReviewedBy}\nหมายเหตุเดิม: ${oldAdminNote}\n\nเหตุผลในการยกเลิก: ${adminNote}`,
      updatedAt: new Date(),
    })

    // Log admin activity
    await logAdminActivity(
      userId,
      userName,
      userData.email || 'unknown@email.com',
      'reverse_report_decision',
      'report',
      reportId,
      `รายงานโดย ${reportData.reporterName}`,
      `🔄 ยกเลิกการตัดสินรายงาน\n\n` +
      `📌 รายละเอียด:\n` +
      `• สถานะเดิม: ${oldStatus === 'approved' ? '✅ ดำเนินการแล้ว' : '❌ ปฏิเสธรายงาน'}\n` +
      `• ตัดสินโดย: ${oldReviewedBy}\n` +
      `• หมายเหตุเดิม: ${oldAdminNote}\n\n` +
      `🔍 เหตุผลในการยกเลิก:\n${adminNote}\n\n` +
      `✨ สถานะใหม่: ⏳ รอดำเนินการ (จะมีการพิจารณาใหม่)\n` +
      `👤 ผู้ถูกรายงาน: ${reportData.targetUserName} (ID: ${reportData.targetUserId})`,
      reportData.targetUserId
    )

    // Notify reporter
    await createNotification(
      reportData.reporterId,
      'info',
      '🔄 รายงานของคุณกำลังถูกตรวจสอบอีกครั้ง',
      `แอดมินได้ทบทวนรายงานของคุณและยกเลิกการตัดสินเดิม รายงานจะถูกพิจารณาใหม่\n\nเหตุผล: ${adminNote}`,
      '/profile?tab=my-reports'
    )

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกการตัดสินเรียบร้อยแล้ว รายงานกลับสู่สถานะรอดำเนินการ',
    })
  } catch (error: any) {
    console.error('Error reversing report decision:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reverse decision' },
      { status: 500 }
    )
  }
}
