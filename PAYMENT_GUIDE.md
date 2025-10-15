# 💳 คู่มือระบบชำระเงิน Stripe Payment System

## 📋 สารบัญ
1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การทดสอบระบบ](#การทดสอบระบบ)
3. [Payment Flow](#payment-flow)
4. [API Endpoints](#api-endpoints)
5. [Components](#components)
6. [การนำไปใช้จริง](#การนำไปใช้จริง)

---

## 🎯 ภาพรวมระบบ

ระบบชำระเงินใช้ **Stripe Connect** แบบ **Direct Charges** ซึ่งเหมาะกับ Marketplace:

### โครงสร้าง:
```
ลูกค้า → แพลตฟอร์ม (Platform) → ผู้ขาย (Connected Account)
       💳 ชำระเงิน              ✂️ หักค่าธรรมเนียม 10%
```

### ข้อดี:
- ✅ ลูกค้าชำระเงินผ่านแพลตฟอร์ม (ปลอดภัย)
- ✅ แพลตฟอร์มหักค่าธรรมเนียม 10% อัตโนมัติ
- ✅ เงินโอนตรงไปยังผู้ขาย (ผ่าน Stripe)
- ✅ รองรับ Thailand (TH)

---

## 🧪 การทดสอบระบบ

### 1. เตรียมผู้ขาย (Seller)
1. ผู้ขายต้องไปที่ **Seller Dashboard > บัญชีรับเงิน**
2. คลิก **"เชื่อมต่อ Stripe"**
3. กรอกข้อมูลจนครบ (ใน Test Mode ใช้ข้อมูลจำลอง)
4. รอสักครู่จน **Payouts Enabled = ✅**

### 2. ทดสอบการชำระเงิน
1. เข้าไปที่ `/payment/test`
2. กรอกข้อมูล:
   - **Seller User ID**: UID ของผู้ขาย (หาได้จาก Firestore)
   - **ชื่อสินค้า**: เช่น "Game Key - Valorant"
   - **จำนวนเงิน (สตางค์)**: เช่น 10000 = ฿100
   - **อีเมลผู้ซื้อ**: อีเมลของคุณ
3. คลิก **"เริ่มทดสอบการชำระเงิน"**
4. ใช้บัตรทดสอบ:

#### 🔢 บัตรทดสอบ Stripe
```
✅ ชำระสำเร็จ:
   หมายเลข: 4242 4242 4242 4242
   MM/YY:    12/34 (เดือน/ปีอนาคตใดก็ได้)
   CVC:      123 (3 หลักใดก็ได้)
   ZIP:      10110 (5 หลักใดก็ได้)

❌ ถูกปฏิเสธ:
   หมายเลข: 4000 0000 0000 0002

⚠️ ต้อง 3D Secure:
   หมายเลข: 4000 0025 0000 3155
```

5. คลิก **"ชำระเงิน"**
6. ถ้าสำเร็จ จะพาไปหน้า Success ✅

### 3. ตรวจสอบผลลัพธ์

#### A) ในระบบเรา:
- **Seller Dashboard > ประวัติการขาย**: จะเห็นรายการขายใหม่
- **Seller Dashboard > รายได้ของฉัน**: ยอดเงินเพิ่มขึ้น

#### B) ใน Stripe Dashboard:
1. เปิด https://dashboard.stripe.com/test
2. ไปที่ **Payments**: จะเห็นรายการ Payment
3. ไปที่ **Connect > Accounts**: เลือกบัญชีผู้ขาย
4. คลิก **View Dashboard**: จะเห็นเงินเข้าบัญชีผู้ขาย

---

## 🔄 Payment Flow

### ขั้นตอนการชำระเงิน:

```
1️⃣ ลูกค้าเลือกสินค้า
   ↓
2️⃣ คลิก "ซื้อเลย"
   ↓
3️⃣ ระบบสร้าง Payment Intent
   - เรียก API: /api/stripe/create-payment-intent
   - ส่งข้อมูล: amount, sellerId, productName, etc.
   - คำนวณค่าธรรมเนียม 10%
   ↓
4️⃣ แสดงหน้าชำระเงิน (Payment Checkout)
   - ลูกค้ากรอกข้อมูลบัตร
   - Stripe ตรวจสอบบัตร
   ↓
5️⃣ ชำระเงินสำเร็จ
   - เงินถูกหักจากบัตร
   - Stripe โอนเงินให้ผู้ขาย (หักค่าธรรมเนียม 10%)
   - Platform ได้ค่าธรรมเนียม 10%
   ↓
6️⃣ Redirect ไปหน้า Success
   - แสดงข้อมูลคำสั่งซื้อ
   - ส่งอีเมลยืนยัน
```

### การคำนวณเงิน:

```
ราคาสินค้า:      ฿100.00
ค่าธรรมเนียม 10%: ฿ 10.00
ผู้ขายได้รับ:     ฿ 90.00
```

---

## 🛠️ API Endpoints

### 1. สร้าง Payment Intent
```typescript
POST /api/stripe/create-payment-intent

Body:
{
  amount: number,              // in satang (10000 = ฿100)
  currency: string,            // "thb"
  sellerId: string,            // Seller User ID
  orderId: string,             // Order ID
  productName: string,         // Product name
  buyerEmail: string           // Buyer email
}

Response:
{
  success: true,
  clientSecret: string,        // ส่งให้ Stripe Elements
  paymentIntentId: string,     // เก็บไว้ใน Order
  platformFee: number          // ค่าธรรมเนียม
}
```

### 2. ดูสถานะ Payment
```typescript
GET /api/stripe/payment-intent?paymentIntentId=pi_xxx

Response:
{
  success: true,
  paymentIntent: {
    id: string,
    amount: number,
    currency: string,
    status: string,            // "succeeded", "pending", etc.
    created: number,
    metadata: object
  }
}
```

### 3. คืนเงิน (Refund)
```typescript
POST /api/stripe/refund

Body:
{
  paymentIntentId: string,
  amount?: number,             // optional (full refund if omitted)
  reason?: string              // "requested_by_customer", etc.
}

Response:
{
  success: true,
  refundId: string,
  amount: number,
  status: string
}
```

### 4. ดูยอดเงิน (Balance)
```typescript
GET /api/stripe/balance

Response:
{
  available: [{ amount: number, currency: string }],
  pending: [{ amount: number, currency: string }],
  currency: string
}
```

### 5. ประวัติการขาย (Charges)
```typescript
GET /api/stripe/charges?limit=20

Response:
{
  charges: Array<{
    id: string,
    amount: number,
    currency: string,
    status: string,
    created: number,
    description: string,
    receipt_url: string,
    paid: boolean,
    refunded: boolean
  }>,
  has_more: boolean
}
```

### 6. การโอนเงิน (Payouts)
```typescript
GET /api/stripe/payouts

Response:
{
  payouts: Array<{
    id: string,
    amount: number,
    currency: string,
    status: string,
    arrival_date: number,
    created: number
  }>
}
```

---

## 🎨 Components

### 1. PaymentCheckout
```tsx
import PaymentCheckout from "@/components/payment/payment-checkout"

<PaymentCheckout
  amount={10000}                    // ฿100 in satang
  currency="thb"
  sellerId="user123"
  orderId="ORDER-001"
  productName="Game Key"
  buyerEmail="buyer@example.com"
  onSuccess={() => router.push('/payment/success')}
  onCancel={() => router.back()}
/>
```

### 2. SellerEarnings
```tsx
import SellerEarnings from "@/components/sellerdashboard/seller-earnings"

<SellerEarnings />
```
แสดง:
- ยอดเงินพร้อมโอน / รอดำเนินการ / รวม
- รอบโอนเงินถัดไป
- สถิติ: วันนี้ / สัปดาห์นี้ / เดือนนี้

### 3. SellerSalesHistory
```tsx
import SellerSalesHistory from "@/components/sellerdashboard/seller-sales-history"

<SellerSalesHistory />
```
แสดง:
- รายการธุรกรรมทั้งหมด
- สถานะ: สำเร็จ / คืนเงิน / รอดำเนินการ
- ข้อมูลบัตร, ใบเสร็จ

### 4. SellerPayouts
```tsx
import SellerPayouts from "@/components/sellerdashboard/seller-payouts"

<SellerPayouts />
```
แสดง:
- ประวัติการโอนเงิน
- วันที่โอน, จำนวนเงิน, สถานะ

---

## 🚀 การนำไปใช้จริง

### ขั้นตอนการใช้งานจริง (Live Mode):

#### 1. เปลี่ยนเป็น Live Keys
ใน `.env.local`:
```env
# เปลี่ยนจาก test keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
```

#### 2. เปิด Live Mode ใน Stripe
1. เข้า https://dashboard.stripe.com
2. สลับจาก "Test Mode" → "Live Mode"
3. ไปที่ **Settings > Connect**
4. เปิดใช้งาน Connect

#### 3. ผู้ขายต้องทำ Onboarding จริง
- ใช้ข้อมูลจริง (ชื่อ, ที่อยู่, บัญชีธนาคาร)
- Stripe จะตรวจสอบข้อมูล (1-2 วัน)
- หลังผ่านการตรวจสอบ จะเปิด Payouts

#### 4. ใช้บัตรจริง
- ลูกค้าใช้บัตรเครดิต/เดบิตจริง
- เงินจะถูกหักจริง
- Stripe จะเรียกเก็บค่าธรรมเนียม (2.95% + ฿10/รายการ)

#### 5. ตั้งค่า Webhook (สำคัญ!)
1. ไปที่ Stripe Dashboard > **Developers > Webhooks**
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. เลือก events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
   - `payout.paid`

#### 6. อัปเดตข้อมูล Order ใน Firestore
เมื่อ `payment_intent.succeeded`:
- เปลี่ยนสถานะ Order เป็น "paid"
- ส่ง Game Key ให้ลูกค้า
- ส่งอีเมลยืนยัน

---

## 📊 ค่าธรรมเนียม

### Stripe Fees (Thailand):
- **2.95% + ฿10** ต่อรายการ (บัตรไทย)
- **3.95% + ฿10** ต่อรายการ (บัตรต่างประเทศ)

### Platform Fee (แพลตฟอร์มเรา):
- **10%** ของยอดขาย

### ตัวอย่างการคำนวณ:
```
ราคาสินค้า:             ฿100.00
Platform Fee (10%):     -฿ 10.00
ผู้ขายได้รับ:            ฿ 90.00

Stripe Fee (2.95% + ฿10):
  - ฿100 × 2.95% =      -฿  2.95
  - Fixed Fee =         -฿ 10.00
  - Total Stripe Fee =  -฿ 12.95

ผู้ขายได้รับสุทธิ:       ฿ 77.05
Platform ได้รับสุทธิ:    ฿ 10.00
```

---

## 🔐 ความปลอดภัย

### Best Practices:
1. ✅ ใช้ HTTPS เท่านั้น
2. ✅ ตรวจสอบ Webhook signatures
3. ✅ Validate ข้อมูลทุกครั้งก่อนสร้าง Payment Intent
4. ✅ เก็บ Payment Intent ID ใน Order
5. ✅ อย่าเก็บข้อมูลบัตรเครดิต (ให้ Stripe จัดการ)
6. ✅ Log ทุก transaction
7. ✅ Monitor suspicious activities

---

## 🐛 Troubleshooting

### ปัญหาที่พบบ่อย:

#### 1. "Seller has not connected Stripe account"
**แก้ไข:** ผู้ขายต้องเชื่อมต่อ Stripe ก่อน

#### 2. "Seller's Stripe account is not fully set up"
**แก้ไข:** รอให้ Payouts Enabled = true (10-30 นาที ใน Test Mode)

#### 3. "Payment failed - card declined"
**แก้ไข:** ใช้บัตรทดสอบที่ถูกต้อง (4242 4242 4242 4242)

#### 4. "Platform fee too high"
**แก้ไข:** ตรวจสอบ `calculatePlatformFee()` ใน `lib/payment-service.ts`

#### 5. ไม่เห็นข้อมูลใน Seller Dashboard
**แก้ไข:** รอสักครู่ แล้วคลิก "รีเฟรช" หรือ F5

---

## 📚 เอกสารเพิ่มเติม

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Testing Cards](https://stripe.com/docs/testing)
- [Webhooks](https://stripe.com/docs/webhooks)

---

## ✅ Checklist ก่อนเปิดใช้งานจริง

- [ ] เปลี่ยนเป็น Live Keys
- [ ] ตั้งค่า Webhook
- [ ] ทดสอบ Payment Flow ให้ครบทุกกรณี
- [ ] ทำ Error Handling ให้ครบ
- [ ] เพิ่ม Email Notifications
- [ ] ทดสอบ Refund
- [ ] ตั้งค่า Rate Limiting
- [ ] เพิ่ม Logging
- [ ] ทำ Load Testing
- [ ] เตรียม Customer Support

---

**🎉 ขอให้ขายได้ดีมีกำไร!**
