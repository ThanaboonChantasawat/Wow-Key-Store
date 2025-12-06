import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { Resend } from 'resend'

// Initialize Resend
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// GET - Fetch all replies for a support message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params

    // Fetch replies subcollection
    const repliesSnapshot = await adminDb
      .collection('support_messages')
      .doc(messageId)
      .collection('replies')
      .orderBy('createdAt', 'asc')
      .get()

    const replies = repliesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({ replies }, { status: 200 })
  } catch (error) {
    console.error('❌ Error fetching replies:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}

// POST - Add a new reply to the conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { message, isAdmin } = await request.json()
    const { id: messageId } = await params

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'กรุณาใส่ข้อความ' },
        { status: 400 }
      )
    }

    // Get user info from auth token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    let authorEmail = 'Anonymous'
    let authorName = 'Anonymous'
    let authorId = null

    if (token) {
      try {
        const admin = require('firebase-admin')
        const decodedToken = await admin.auth().verifyIdToken(token)
        authorEmail = decodedToken.email || 'Anonymous'
        authorName = decodedToken.name || decodedToken.email || 'User'
        authorId = decodedToken.uid
      } catch (error) {
        console.error('Error verifying token:', error)
      }
    }

    // Get original message details for email notification
    const messageDoc = await adminDb
      .collection('support_messages')
      .doc(messageId)
      .get()

    if (!messageDoc.exists) {
      return NextResponse.json(
        { error: 'ไม่พบข้อความนี้' },
        { status: 404 }
      )
    }

    const messageData = messageDoc.data()

    // Create reply document
    const replyData = {
      message: message.trim(),
      isAdmin: isAdmin || false,
      authorEmail,
      authorName,
      authorId,
      createdAt: new Date().toISOString(),
    }

    const replyRef = await adminDb
      .collection('support_messages')
      .doc(messageId)
      .collection('replies')
      .add(replyData)

    // Update parent message
    await adminDb
      .collection('support_messages')
      .doc(messageId)
      .update({
        updatedAt: new Date().toISOString(),
        lastReplyAt: new Date().toISOString(),
        lastReplyBy: authorEmail,
        status: isAdmin ? 'in-progress' : messageData?.status || 'pending',
      })

    // Send email notification to the other party
    if (resend && messageData) {
      try {
        // If admin replied, notify customer
        // If customer replied, notify admin (you can set this up later)
        const recipientEmail = isAdmin 
          ? messageData.email // notify customer
          : process.env.ADMIN_EMAIL || 'admin@wowkeystore.com' // notify admin

        const subject = isAdmin
          ? `💬 การตอบกลับใหม่: ${messageData.subject}`
          : `💬 ลูกค้าตอบกลับ: ${messageData.subject}`

        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipientEmail,
          subject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; }
                  .reply-box { background: ${isAdmin ? '#f0f7ff' : '#fff3e0'}; border-left: 4px solid ${isAdmin ? '#2196f3' : '#ff9800'}; padding: 20px; margin: 20px 0; border-radius: 5px; }
                  .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
                  .button { display: inline-block; background: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎮 WOW Key Store</h1>
                    <p>${isAdmin ? 'ทีมงานได้ตอบกลับข้อความของคุณแล้ว' : 'ลูกค้าได้ตอบกลับแล้ว'}</p>
                  </div>
                  <div class="content">
                    <p>สวัสดีครับ,</p>
                    <p>มีข้อความใหม่ในการสนทนาเรื่อง: <strong>${messageData.subject}</strong></p>
                    
                    <div class="reply-box">
                      <strong>${isAdmin ? '💼' : '👤'} ${authorName}:</strong>
                      <p style="margin-top: 10px; white-space: pre-wrap;">${message.trim()}</p>
                    </div>

                    <center>
                      <a href="${SITE_URL}/support" class="button">ดูการสนทนาทั้งหมด</a>
                    </center>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} WOW Key Store. All rights reserved.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })

        console.log(`✅ Reply notification email sent to ${recipientEmail}`)
      } catch (emailError: any) {
        console.error('❌ Error sending notification email:', emailError)
        // Don't fail the request if email fails
      }
    }

    console.log(`✅ Reply added to message ${messageId} by ${authorEmail}`)

    return NextResponse.json(
      {
        success: true,
        message: 'ส่งข้อความสำเร็จ',
        reply: {
          id: replyRef.id,
          ...replyData
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error adding reply:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งข้อความ' },
      { status: 500 }
    )
  }
}
