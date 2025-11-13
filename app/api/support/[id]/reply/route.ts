import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-config'
import { Resend } from 'resend'

// Initialize Resend
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'WOW Key Store <noreply@wowkeystore.com>'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { reply, userEmail, userName, subject } = await request.json()
    const { id: messageId } = await params

    // Validation
    if (!reply || !reply.trim()) {
      return NextResponse.json(
        { error: 'กรุณาใส่ข้อความตอบกลับ' },
        { status: 400 }
      )
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'ไม่พบอีเมลของผู้รับ' },
        { status: 400 }
      )
    }

    // Get admin info from auth token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    let adminEmail = 'Admin'
    if (token) {
      try {
        const admin = require('firebase-admin')
        const decodedToken = await admin.auth().verifyIdToken(token)
        adminEmail = decodedToken.email || 'Admin'
      } catch (error) {
        console.error('Error verifying token:', error)
      }
    }

    // Update document in Firestore
    await adminDb.collection('supportMessages').doc(messageId).update({
      adminReply: reply.trim(),
      repliedAt: new Date().toISOString(),
      repliedBy: adminEmail,
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    })

    // Send email notification
    if (resend) {
      try {
        console.log(`📧 Attempting to send email to ${userEmail}...`)
        console.log(`📧 From: ${FROM_EMAIL}`)
        
        const emailResult = await resend.emails.send({
          from: FROM_EMAIL,
          to: userEmail,
          subject: `✅ ตอบกลับ: ${subject}`,
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
                  .reply-box { background: #f0f7ff; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 5px; }
                  .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
                  .button { display: inline-block; background: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎮 Wow Key Store</h1>
                    <p>ทีมงานได้ตอบกลับข้อความของคุณแล้ว</p>
                  </div>
                  <div class="content">
                    <p>สวัสดีคุณ ${userName},</p>
                    <p>ขอบคุณที่ติดต่อเรา ทีมงานได้ตรวจสอบและตอบกลับข้อความของคุณแล้ว:</p>
                    
                    <div class="reply-box">
                      <strong>📧 การตอบกลับจากทีมงาน:</strong>
                      <p style="margin-top: 10px; white-space: pre-wrap;">${reply.trim()}</p>
                    </div>

                    <p><strong>หัวข้อ:</strong> ${subject}</p>
                    <p><strong>ตอบกลับโดย:</strong> ${adminEmail}</p>
                    
                    <p>หากคุณมีคำถามเพิ่มเติม สามารถติดต่อเราได้ทาง:</p>
                    <ul>
                      <li>💬 หน้าติดต่อทีมงาน: <a href="${SITE_URL}/support">คลิกที่นี่</a></li>
                    </ul>

                    <center>
                      <a href="${SITE_URL}/support" class="button">ติดต่อทีมงานอีกครั้ง</a>
                    </center>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} WOW Key Store. All rights reserved.</p>
                    <p>อีเมลนี้ส่งมาจากระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        
        console.log(`✅ Email sent successfully!`)
        // Log entire response to inspect message id and metadata
        try {
          console.log('📧 Resend response:', JSON.stringify(emailResult, null, 2))
        } catch (e) {
          console.log('📧 Resend response (raw):', emailResult)
        }
        // Some SDKs return id under different paths; try common ones
        const possibleId = emailResult?.data?.id || 'unknown'

        console.log(`📧 Email ID: ${possibleId}`)
        console.log(`📧 To: ${userEmail}`)
      } catch (emailError: any) {
        console.error('❌ Error sending reply email:', emailError)
        console.error('❌ Error details:', JSON.stringify(emailError, null, 2))
        // Don't fail the request if email fails
      }
    } else {
      console.warn('⚠️ Resend not configured, email not sent')
    }

    console.log(`✅ Support message ${messageId} replied by ${adminEmail}`)

    return NextResponse.json(
      {
        success: true,
        message: 'ส่งการตอบกลับสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error sending reply:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งการตอบกลับ' },
      { status: 500 }
    )
  }
}
