# การตั้งค่า Stripe Connect (Test Mode) - Thailand 🇹🇭

## ⚠️ สำคัญสำหรับประเทศไทย

Stripe Connect ในประเทศไทยมีข้อจำกัดพิเศษ:
- ✅ ใช้ **Standard Accounts** แทน Express
- ✅ ใช้ **Direct Charges** (เงินไปหาผู้ขายโดยตรง)
- ❌ ไม่รองรับ **Loss-liable Platform** (Platform รับความเสี่ยง)

ระบบนี้ตั้งค่าให้เหมาะสมกับข้อกำหนดของ Stripe Thailand แล้ว

---

## ขั้นตอนการติดตั้ง

### 1. สร้างบัญชี Stripe (ถ้ายังไม่มี)
- ไปที่ https://dashboard.stripe.com/register
- สมัครบัญชีใหม่

### 2. เปิดใช้งาน Test Mode
- เข้าสู่ Stripe Dashboard
- ตรวจสอบให้แน่ใจว่าสวิตช์ **"Test mode"** เปิดอยู่ (มุมบนขวา)

### 3. รับ API Keys
1. ไปที่ https://dashboard.stripe.com/test/apikeys
2. คัดลอก **Publishable key** (ขึ้นต้นด้วย `pk_test_`)
3. คัดลอก **Secret key** (ขึ้นต้นด้วย `sk_test_`)
   - คลิก "Reveal test key" เพื่อดู Secret key

### 4. เพิ่ม API Keys ลงใน .env.local
เปิดไฟล์ `.env.local` และแก้ไขดังนี้:

```bash
# Stripe API Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook Secret (ตอนนี้ข้ามไปก่อน จะตั้งค่าทีหลังเมื่อทำ webhook)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Your domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. รีสตาร์ท Development Server
```bash
# หยุด server ที่กำลังทำงาน (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

## ขั้นตอนการทดสอบ

### 1. เข้าสู่ Seller Dashboard
1. เข้าสู่ระบบด้วยบัญชีผู้ขาย
2. ไปที่หน้า "Seller Dashboard"
3. คลิกที่เมนู **"บัญชีรับเงิน"** (ไอคอน Wallet)

### 2. เชื่อมต่อบัญชี Stripe
1. คลิกปุ่ม **"เชื่อมต่อบัญชี Stripe"**
2. ระบบจะพาคุณไปยังหน้า Stripe Onboarding
3. ใช้ข้อมูลทดสอบ (Test Data) ตามที่ Stripe แนะนำ

### 3. ข้อมูลทดสอบ Stripe Connect

#### ข้อมูลธุรกิจ
- ชื่อธุรกิจ: ใช้ชื่ออะไรก็ได้
- ที่อยู่: ใช้ที่อยู่จริงในประเทศไทย
- เบอร์โทร: `0812345678` หรือเบอร์จริง
- เว็บไซต์: `https://example.com` หรือข้ามไปได้

#### ข้อมูลธนาคาร
- หมายเลขบัญชี: `000123456789` (Stripe จะยอมรับในโหมดทดสอบ)
- ใช้ข้อมูลจริงของคุณสำหรับส่วนอื่นๆ

#### หมายเลขบัตรทดสอบ
เมื่อทดสอบการชำระเงิน ใช้:
- หมายเลขบัตร: `4242 4242 4242 4242`
- วันหมดอายุ: เดือน/ปีใดก็ได้ในอนาคต (เช่น 12/25)
- CVC: รหัส 3 หลักใดก็ได้ (เช่น 123)

### 4. ตรวจสอบสถานะ
หลังจาก onboarding เสร็จสิ้น:
- ✅ สถานะ Charges: เปิดใช้งาน
- ✅ สถานะ Payouts: เปิดใช้งาน
- ✅ รายละเอียด: ส่งข้อมูลครบถ้วน

### 5. เข้าถึง Stripe Dashboard (ของผู้ขาย)
คลิกปุ่ม **"เปิด Stripe Dashboard"** เพื่อจัดการบัญชีรับเงิน

## โครงสร้างที่สร้างแล้ว

### ไฟล์คอนฟิก
- `lib/stripe-config.ts` - การตั้งค่า Stripe และ Connect
- `.env.local` - API Keys และ environment variables

### Service Layer
- `lib/stripe-service.ts` - ฟังก์ชันทั้งหมดสำหรับจัดการ Stripe Connect
  - `createStripeConnectAccount()` - สร้างบัญชี Connect
  - `getStripeAccountInfo()` - ดึงข้อมูลบัญชี
  - `createAccountLink()` - สร้าง onboarding link
  - `createLoginLink()` - สร้าง dashboard link
  - `updateShopStripeStatus()` - อัพเดทสถานะใน Firestore
  - `canReceivePayments()` - ตรวจสอบว่ารับเงินได้หรือไม่

### API Routes
- `app/api/stripe/create-connect-account/route.ts` - POST: สร้างบัญชี
- `app/api/stripe/get-account-status/route.ts` - GET: ดึงสถานะ
- `app/api/stripe/create-account-link/route.ts` - POST: สร้าง onboarding link
- `app/api/stripe/create-dashboard-link/route.ts` - POST: สร้าง dashboard link

### UI Components
- `components/sellerdashboard/seller-payment-settings.tsx` - หน้า UI สำหรับจัดการบัญชีรับเงิน
- `components/sellerdashboard/seller-sidebar.tsx` - เพิ่มเมนู "บัญชีรับเงิน"
- `components/sellerdashboard/seller-dashboard.tsx` - เพิ่ม routing สำหรับ payment section

## ฟีเจอร์ที่พร้อมใช้งาน

✅ สร้างบัญชี Stripe Connect Standard (เหมาะกับประเทศไทย)
✅ Direct Charges (เงินไปหาผู้ขายโดยตรง)
✅ Onboarding flow สำหรับผู้ขาย
✅ ตรวจสอบสถานะบัญชี (charges, payouts, details)
✅ เข้าถึง Stripe Dashboard
✅ ระบบ re-onboarding สำหรับบัญชีที่ยังไม่สมบูรณ์
✅ บันทึก Stripe Account ID ใน Firestore

## 🇹🇭 ข้อมูลเพิ่มเติมสำหรับประเทศไทย

### ทำไมใช้ Standard Account?
- **Express Account**: ไม่รองรับในไทย (loss-liable ไม่อนุญาต)
- **Standard Account**: ✅ รองรับเต็มรูปแบบ, ผู้ขายจัดการบัญชีเอง

### Direct Charges คืออะไร?
- เงินจากลูกค้าไปยังบัญชีผู้ขายโดยตรง
- Platform (คุณ) เก็บค่าธรรมเนียมผ่าน Application Fee
- ผู้ขายมีอิสระในการจัดการเงินของตัวเอง

### Application Fee (ค่าธรรมเนียม Platform)
เมื่อทำระบบรับเงินจริง คุณสามารถหักค่าธรรมเนียมได้:
```typescript
// ตัวอย่าง: หักค่าธรรมเนียม 10%
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'thb',
  application_fee_amount: 100, // 10%
  transfer_data: {
    destination: connectedAccountId,
  },
});
```

## สิ่งที่ต้องทำต่อ (อนาคต)

🔲 Webhook handler สำหรับ account.updated events
🔲 ระบบรับชำระเงินจากลูกค้า (Payment Intents)
🔲 ระบบโอนเงินให้ผู้ขาย (Transfers/Payouts)
🔲 หน้าประวัติธุรกรรม
🔲 หน้า Admin สำหรับดูบัญชี Stripe ทั้งหมด
🔲 คำนวณค่าธรรมเนียม platform (platform fee)

## ทรัพยากรเพิ่มเติม

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Thailand Support](https://support.stripe.com/questions/stripe-thailand-support-for-marketplaces)
- [Direct Charges](https://stripe.com/docs/connect/direct-charges)
- [Standard Accounts](https://stripe.com/docs/connect/standard-accounts)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe API Reference](https://stripe.com/docs/api)

## ⚠️ สำคัญ

- **ห้าม** commit ไฟล์ `.env.local` ขึ้น Git
- ใช้ Test Mode เท่านั้นในระหว่างพัฒนา
- ก่อน deploy production ต้องเปลี่ยนเป็น Live Mode API Keys
- ตรวจสอบว่า `.env.local` อยู่ใน `.gitignore` แล้ว
