# Stripe Connect สำหรับประเทศไทย 🇹🇭

## 🚨 ข้อจำกัดของ Stripe ในประเทศไทย

Stripe มีนโยบายพิเศษสำหรับประเทศไทยเพื่อควบคุมความเสี่ยง:

### ❌ สิ่งที่ไม่รองรับ:
- **Express Accounts** - ไม่สามารถใช้ได้กับ Platform ในไทย
- **Loss-liable Platform** - Platform ไม่สามารถรับความเสี่ยงแทนผู้ขาย
- **Destination Charges with Transfers** - ไม่สามารถโอนเงินในภายหลังได้

### ✅ สิ่งที่รองรับ:
- **Standard Accounts** - บัญชีมาตรฐานที่ผู้ขายจัดการเอง
- **Direct Charges** - เงินไปหาผู้ขายโดยตรง
- **Application Fees** - Platform หักค่าธรรมเนียมได้

---

## 📊 เปรียบเทียบ Express vs Standard

| คุณสมบัติ | Express Account | Standard Account |
|-----------|----------------|------------------|
| **Onboarding** | ง่าย (ใช้ Stripe UI) | ซับซ้อนกว่า (ต้องกรอกเอง) |
| **Dashboard** | Express Dashboard | Full Stripe Dashboard |
| **ความยืดหยุ่น** | จำกัด | สูง |
| **รองรับในไทย** | ❌ ไม่รองรับ (Platform) | ✅ รองรับเต็มรูปแบบ |
| **Branding** | Stripe branding | Custom branding |
| **การจัดการ** | Stripe จัดการให้ | ผู้ขายจัดการเอง |

---

## 🔄 Flow การทำงาน (Direct Charges)

### ก่อนหน้า (Loss-liable - ไม่รองรับในไทย):
```
┌─────┐      ┌──────────┐      ┌────────┐
│ ลูกค้า│ ──→  │ Platform │ ──→  │ ผู้ขาย  │
└─────┘      └──────────┘      └────────┘
              ↓
         ความเสี่ยงอยู่กับ Platform
         (ถ้าผู้ขายโกง Platform รับผิดชอบ)
```

### ปัจจุบัน (Direct Charges - รองรับในไทย):
```
┌─────┐                         ┌────────┐
│ ลุกค้า│ ────────────────────→  │ ผู้ขาย  │
└─────┘                         └────────┘
              ↓                      ↓
         จ่ายเงินตรงไปหา      ผู้ขายรับเงินเลย
                             ความเสี่ยงอยู่กับผู้ขาย
                                    ↓
                             หักค่าธรรมเนียมให้ Platform
```

---

## 💰 การทำงานของ Application Fee

### วิธีหักค่าธรรมเนียม:

```typescript
// สร้าง Payment Intent แบบ Direct Charge
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,              // ราคาสินค้า 10,000 บาท
  currency: 'thb',
  application_fee_amount: 500, // หักค่าธรรมเนียม 500 บาท (5%)
  on_behalf_of: 'acct_seller', // บัญชีผู้ขาย
  transfer_data: {
    destination: 'acct_seller', // เงินไปหาผู้ขาย
  },
}, {
  stripeAccount: 'acct_seller', // Charge ในนามผู้ขาย
});
```

### ผลลัพธ์:
- **ลูกค้า**: จ่าย 10,000 บาท
- **ผู้ขาย**: ได้รับ 9,500 บาท (หลังหักค่าธรรมเนียม)
- **Platform (คุณ)**: ได้ 500 บาท
- **Stripe**: หักค่าธรรมเนียมจากผู้ขาย (~2.95% + 11 THB)

---

## 🛠️ สิ่งที่ปรับใน Code

### 1. เปลี่ยน Account Type
```typescript
// Before (ไม่รองรับ):
accountType: 'express'

// After (รองรับ):
accountType: 'standard'
```

### 2. ปรับ Capabilities
```typescript
// ต้องมีทั้ง 2 capabilities:
capabilities: {
  card_payments: { requested: true }, // รับชำระเงินด้วยบัตร
  transfers: { requested: true },      // โอนเงินได้
}
```

**หมายเหตุ**: แม้จะใช้ Direct Charges แต่ก็ยังต้องมี `transfers` capability ไว้
เพราะ Stripe กำหนดว่า `card_payments` ต้องมาคู่กับ `transfers` เสมอ

สิ่งที่แตกต่างคือ**วิธีการโอนเงิน**:
- ❌ **Loss-liable**: Platform รับความเสี่ยง (ไม่รองรับในไทย)
- ✅ **Direct Charges**: ผู้ขายรับความเสี่ยงเอง (รองรับในไทย)
```

### 3. ใช้ Direct Charges (on_behalf_of)
```typescript
// เมื่อสร้าง Payment Intent ใช้ on_behalf_of
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,
  currency: 'thb',
  on_behalf_of: sellerAccountId, // ✅ Charge ในนามผู้ขาย (Direct)
  application_fee_amount: 500,    // Platform หักค่าธรรมเนียม
  transfer_data: {
    destination: sellerAccountId,
  },
});

// วิธีนี้จะทำให้:
// - เงินไปหาผู้ขายโดยตรง
// - ผู้ขายรับความเสี่ยงเอง (ไม่ใช่ Platform)
// - Platform หักค่าธรรมเนียมผ่าน application_fee_amount
```

---

## 📝 Onboarding Process

### Standard Account Onboarding ต้องกรอกข้อมูล:

1. **ข้อมูลส่วนตัว**:
   - ชื่อ-นามสกุล
   - วันเกิด
   - เลขประจำตัวประชาชน
   - ที่อยู่

2. **ข้อมูลธนาคาร**:
   - ธนาคาร
   - สาขา
   - เลขที่บัญชี
   - ชื่อบัญชี

3. **ข้อมูลธุรกิจ** (ถ้ามี):
   - ชื่อธุรกิจ
   - ที่อยู่ธุรกิจ
   - เลขทะเบียนนิติบุคคล

4. **เอกสารยืนยันตัวตน** (บางกรณี):
   - สำเนาบัตรประชาชน
   - หนังสือรับรองบริษัท

---

## ⚡ Testing

### ข้อมูลทดสอบสำหรับ Standard Account:

#### บัตรเครดิต/เดบิต:
```
หมายเลขบัตร: 4242 4242 4242 4242
วันหมดอายุ: 12/25 (ใดก็ได้ในอนาคต)
CVC: 123 (รหัส 3 หลักใดก็ได้)
```

#### PromptPay:
Stripe จะสร้าง QR Code ให้ทดสอบอัตโนมัติในโหมด Test

#### ข้อมูลธนาคาร:
```
เลขที่บัญชี: 000123456789
ธนาคาร: ใดก็ได้
สาขา: ใดก็ได้
```

---

## 🔍 การตรวจสอบสถานะ

### ตรวจสอบว่าบัญชีพร้อมรับเงิน:

```typescript
const account = await stripe.accounts.retrieve('acct_xxx');

console.log({
  chargesEnabled: account.charges_enabled,     // ✅ รับชำระเงินได้
  payoutsEnabled: account.payouts_enabled,     // ✅ ถอนเงินได้
  detailsSubmitted: account.details_submitted, // ✅ กรอกข้อมูลครบ
});
```

ต้องเป็น `true` ทั้ง 3 ค่าจึงจะรับเงินได้!

---

## 🚀 Next Steps (อนาคต)

### 1. สร้างระบบชำระเงิน:
```typescript
// หน้าสินค้า → สร้าง Payment Intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: productPrice,
  currency: 'thb',
  application_fee_amount: Math.floor(productPrice * 0.05), // 5% fee
  payment_method_types: ['card', 'promptpay'],
  on_behalf_of: sellerAccountId,
  transfer_data: {
    destination: sellerAccountId,
  },
}, {
  stripeAccount: sellerAccountId, // Direct charge
});
```

### 2. Webhook Handler:
```typescript
// api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, secret);
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // อัพเดท order status
      break;
    case 'account.updated':
      // อัพเดทสถานะบัญชีผู้ขาย
      break;
  }
}
```

### 3. Payout Tracking:
```typescript
// ติดตามการถอนเงินของผู้ขาย
const payouts = await stripe.payouts.list({
  limit: 10,
}, {
  stripeAccount: sellerAccountId,
});
```

---

## 📚 เอกสารอ้างอิง

- **Official Guide**: https://support.stripe.com/questions/stripe-thailand-support-for-marketplaces
- **Direct Charges**: https://stripe.com/docs/connect/direct-charges
- **Standard Accounts**: https://stripe.com/docs/connect/standard-accounts
- **Application Fees**: https://stripe.com/docs/connect/direct-charges#collecting-fees

---

## ❓ FAQ

### Q: ทำไมไม่ใช้ Express Account?
**A**: Stripe ไม่อนุญาตให้ Platform ในไทยใช้ Express เพราะข้อจำกัด loss-liable

### Q: ผู้ขายจะรับเงินเมื่อไหร่?
**A**: ตั้งค่าเป็น manual payout - ผู้ขายถอนเงินเองได้ทันทีที่มียอด

### Q: Platform จะได้เงินค่าธรรมเนียมเมื่อไหร่?
**A**: ได้ทันทีเมื่อลูกค้าชำระเงินสำเร็จ (ผ่าน application_fee_amount)

### Q: PromptPay QR ใช้ได้จริงหรือ?
**A**: ใช้ได้! Stripe รองรับ PromptPay สำหรับประเทศไทย

### Q: ถ้าผู้ขายโกง Platform รับผิดชอบไหม?
**A**: ไม่! เพราะใช้ Direct Charges - ความเสี่ยงอยู่กับผู้ขาย (ตามนโยบาย Stripe)

---

## ✅ Checklist

- [x] เปลี่ยนเป็น Standard Account
- [x] ใช้ Direct Charges
- [x] ตั้งค่า Manual Payouts
- [x] เอา Transfers capability ออก
- [x] เพิ่มคำอธิบายในเอกสาร
- [ ] ทดสอบ Onboarding flow
- [ ] ทดสอบ Payment flow
- [ ] ตั้งค่า Webhooks
- [ ] ทดสอบ PromptPay

---

**หมายเหตุ**: การเปลี่ยนแปลงนี้จำเป็นเพื่อให้ระบบทำงานได้ในประเทศไทย ตามนโยบาย Stripe 🇹🇭
