# Stripe Thailand - Quick Fix ⚡

## ปัญหาที่เจอ:

### 1. ⚠️ "Platforms in TH cannot create accounts where the platform is loss-liable"
**สาเหตุ**: ใช้ Express account (ไม่รองรับในไทย)
**แก้ไข**: ✅ เปลี่ยนเป็น Standard account

### 2. ⚠️ "card_payments requires transfers capability"
**สาเหตุ**: ลบ transfers ออกไป (คิดว่าเป็น loss-liable)
**แก้ไข**: ✅ เพิ่ม transfers กลับมา แต่ใช้แบบ direct charges

---

## ✅ สิ่งที่ต้องมี (Standard Account สำหรับไทย):

```typescript
const account = await stripe.accounts.create({
  type: 'standard',           // ✅ MUST: Standard (ไม่ใช่ express)
  country: 'TH',              // ✅ Thailand
  email: sellerEmail,
  capabilities: {
    card_payments: { requested: true },  // ✅ MUST: รับชำระด้วยบัตร
    transfers: { requested: true },      // ✅ MUST: ต้องมีด้วย!
  },
});
```

---

## 🎯 สิ่งที่ทำให้ "ไม่เป็น loss-liable":

### ไม่ใช่ที่ Capabilities - แต่เป็นที่วิธีการ Charge!

### ❌ Loss-liable (ไม่รองรับในไทย):
```typescript
// Charge ในนาม Platform
const charge = await stripe.charges.create({
  amount: 10000,
  currency: 'thb',
  source: tokenFromCustomer,
  // Platform รับความเสี่ยง - ห้ามใช้ในไทย!
});

// แล้วค่อยโอนให้ผู้ขาย
await stripe.transfers.create({
  amount: 9500,
  currency: 'thb',
  destination: sellerAccount,
});
```

### ✅ Direct Charges (รองรับในไทย):
```typescript
// Charge ในนาม ผู้ขาย (on_behalf_of)
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,
  currency: 'thb',
  on_behalf_of: sellerAccountId,        // ✅ Key: Charge ในนามผู้ขาย
  application_fee_amount: 500,          // Platform หักค่าธรรมเนียม
  transfer_data: {
    destination: sellerAccountId,
  },
});

// ผู้ขายรับความเสี่ยงเอง - อนุญาตในไทย!
```

---

## 📋 Checklist:

- [x] ✅ Account Type: `standard`
- [x] ✅ Country: `TH`
- [x] ✅ Capability: `card_payments: true`
- [x] ✅ Capability: `transfers: true`
- [ ] 🔜 เมื่อสร้าง Payment: ใช้ `on_behalf_of`
- [ ] 🔜 เมื่อสร้าง Payment: ใช้ `application_fee_amount`

---

## 🚀 ทดสอบทันที:

```bash
# 1. Restart dev server (ถ้ายังไม่ได้)
npm run dev

# 2. ไปที่ Seller Dashboard → บัญชีรับเงิน
# 3. คลิก "เชื่อมต่อบัญชี Stripe"
# 4. ควรทำงานแล้ว! ✅
```

---

## 💡 สรุปง่ายๆ:

**Q**: ต้องมี `transfers` capability หรือไม่?
**A**: ✅ **ต้องมี!** Stripe กำหนดว่า `card_payments` ต้องมาคู่กับ `transfers`

**Q**: แล้วจะไม่เป็น loss-liable หรือ?
**A**: ✅ **ไม่เป็น!** เพราะเราจะใช้ `on_behalf_of` ตอนสร้าง Payment Intent (เงินไปหาผู้ขายโดยตรง)

**Q**: Standard account ยุ่งยากกว่า Express ไหม?
**A**: ใช่ นิดหน่อย - ผู้ขายต้องกรอกข้อมูลมากกว่า แต่เป็นทางเดียวที่ใช้ได้ในไทย

---

## 📚 เอกสารเพิ่มเติม:

- [STRIPE_THAILAND.md](./STRIPE_THAILAND.md) - รายละเอียดครบถ้วน
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - คู่มือการตั้งค่า
- [Stripe Docs](https://stripe.com/docs/connect/direct-charges) - Direct Charges

---

**ลองใหม่ได้เลย! ครั้งนี้ควรจะผ่านแล้ว** 🎉
