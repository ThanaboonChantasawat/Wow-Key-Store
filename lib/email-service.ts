// Email service using Resend
import { Resend } from 'resend';

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'WowKeyStore <noreply@wowkeystore.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

// Email templates
const EMAIL_TEMPLATES = {
  shop_approved: {
    subject: '🎉 ร้านค้าของคุณได้รับการอนุมัติแล้ว!',
    getHtml: (data: { shopName: string; shopId: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">ยินดีด้วย! 🎉</h2>
        <p>ร้านค้า <strong>${data.shopName}</strong> ของคุณได้รับการอนุมัติจากทีมงานแล้ว</p>
        <p>คุณสามารถเริ่มเพิ่มสินค้าและขายได้ทันที</p>
        <a href="${SITE_URL}/seller" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          ไปที่ Seller Dashboard
        </a>
      </div>
    `
  },
  
  shop_rejected: {
    subject: 'แจ้งเตือน: ร้านค้าของคุณไม่ได้รับการอนุมัติ',
    getHtml: (data: { shopName: string; reason: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">ร้านค้าไม่ได้รับการอนุมัติ</h2>
        <p>ร้านค้า <strong>${data.shopName}</strong> ของคุณไม่ได้รับการอนุมัติ</p>
        <p><strong>เหตุผล:</strong> ${data.reason}</p>
        <p>คุณสามารถแก้ไขข้อมูลและส่งคำขออีกครั้งได้</p>
        <a href="${SITE_URL}/seller" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          แก้ไขข้อมูลร้านค้า
        </a>
      </div>
    `
  },

  new_order: {
    subject: '🛒 มีคำสั่งซื้อใหม่!',
    getHtml: (data: { shopName: string; orderId: string; total: number; buyerName: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">มีคำสั่งซื้อใหม่! 🛒</h2>
        <p>ร้านค้า <strong>${data.shopName}</strong> ของคุณมีคำสั่งซื้อใหม่</p>
        <p><strong>หมายเลขคำสั่งซื้อ:</strong> ${data.orderId}</p>
        <p><strong>ผู้ซื้อ:</strong> ${data.buyerName}</p>
        <p><strong>ยอดรวม:</strong> ฿${data.total.toLocaleString()}</p>
        <a href="${SITE_URL}/seller" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          ดูคำสั่งซื้อ
        </a>
      </div>
    `
  },

  order_confirmed: {
    subject: '✅ คำสั่งซื้อของคุณได้รับการยืนยันแล้ว',
    getHtml: (data: { orderId: string; total: number; shopName: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">คำสั่งซื้อได้รับการยืนยันแล้ว ✅</h2>
        <p><strong>หมายเลขคำสั่งซื้อ:</strong> ${data.orderId}</p>
        <p><strong>ร้านค้า:</strong> ${data.shopName}</p>
        <p><strong>ยอดรวม:</strong> ฿${data.total.toLocaleString()}</p>
        <p>ผู้ขายกำลังจัดเตรียมสินค้าให้คุณ</p>
        <a href="${SITE_URL}/profile" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          ดูคำสั่งซื้อของฉัน
        </a>
      </div>
    `
  },

  order_delivered: {
    subject: '📦 สินค้าของคุณถูกส่งแล้ว!',
    getHtml: (data: { orderId: string; shopName: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">สินค้าถูกส่งแล้ว! 📦</h2>
        <p><strong>หมายเลขคำสั่งซื้อ:</strong> ${data.orderId}</p>
        <p><strong>ร้านค้า:</strong> ${data.shopName}</p>
        <p>ผู้ขายได้ส่งสินค้าให้คุณแล้ว กรุณาตรวจสอบและยืนยันการได้รับสินค้า</p>
        <a href="${SITE_URL}/profile" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          ยืนยันการได้รับสินค้า
        </a>
      </div>
    `
  },

  payment_received: {
    subject: '💰 ได้รับการชำระเงินแล้ว',
    getHtml: (data: { orderId: string; amount: number }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">ได้รับการชำระเงินแล้ว 💰</h2>
        <p><strong>หมายเลขคำสั่งซื้อ:</strong> ${data.orderId}</p>
        <p><strong>จำนวนเงิน:</strong> ฿${data.amount.toLocaleString()}</p>
        <p>ระบบได้รับการชำระเงินจากผู้ซื้อแล้ว กรุณาจัดส่งสินค้า</p>
        <a href="${SITE_URL}/seller" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          จัดการคำสั่งซื้อ
        </a>
      </div>
    `
  },

  shop_suspended: {
    subject: '⚠️ ร้านค้าของคุณถูกระงับการใช้งาน',
    getHtml: (data: { shopName: string; reason: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">ร้านค้าถูกระงับการใช้งาน ⚠️</h2>
        <p>ร้านค้า <strong>${data.shopName}</strong> ของคุณถูกระงับการใช้งานชั่วคราว</p>
        <p><strong>เหตุผล:</strong> ${data.reason}</p>
        <p>กรุณาติดต่อทีมงานเพื่อขอข้อมูลเพิ่มเติม</p>
        <a href="${SITE_URL}/support" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          ติดต่อฝ่ายสนับสนุน
        </a>
      </div>
    `
  },

  welcome: {
    subject: 'ยินดีต้อนรับสู่ WowKeyStore! 🎮',
    getHtml: (data: { displayName: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">ยินดีต้อนรับ ${data.displayName}! 🎮</h2>
        <p>ขอบคุณที่เข้าร่วมกับ WowKeyStore - แพลตฟอร์มซื้อขายเกมและไอเทมเกมออนไลน์</p>
        <p>คุณสามารถ:</p>
        <ul>
          <li>เลือกซื้อสินค้าจากร้านค้าต่างๆ</li>
          <li>สร้างร้านค้าของคุณเองและเริ่มขาย</li>
          <li>ติดตามคำสั่งซื้อของคุณ</li>
        </ul>
        <a href="${SITE_URL}" style="display: inline-block; background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
          เริ่มช้อปปิ้ง
        </a>
      </div>
    `
  }
};

export interface SendEmailParams {
  to: string;
  template: keyof typeof EMAIL_TEMPLATES;
  data: Record<string, any>;
}

export async function sendEmail({ to, template, data }: SendEmailParams) {
  try {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('⚠️ RESEND_API_KEY not configured, skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    const emailTemplate = EMAIL_TEMPLATES[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: emailTemplate.subject,
      html: emailTemplate.getHtml(data as any), // Cast to any to allow flexible data
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error };
    }

    console.log('✅ Email sent successfully:', emailData?.id);
    return { success: true, data: emailData };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error };
  }
}

// Send bulk emails
export async function sendBulkEmails(emails: SendEmailParams[]) {
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );
  
  return results;
}
