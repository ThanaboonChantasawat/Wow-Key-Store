# การแก้ปัญหา Stripe Connect

## ❌ Error: "Failed to create Stripe Connect account"

### วิธีแก้ปัญหาทีละขั้นตอน:

---

## ✅ 1. ตรวจสอบ Environment Variables

### เช็คว่า API Keys ถูกต้อง:
```bash
# เปิดไฟล์ .env.local และตรวจสอบ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
```

### ⚠️ ข้อควรระวัง:
- **ห้าม** มีช่องว่างหรือขึ้นบรรทัดใหม่ในค่า API Key
- API Key ต้องอยู่บรรทัดเดียวทั้งหมด
- ตรวจสอบว่าคัดลอกครบทุกตัวอักษร

### ตัวอย่างที่ถูกต้อง:
```bash
# ✅ ถูกต้อง - API Key อยู่บรรทัดเดียว
STRIPE_SECRET_KEY=sk_test_51SHlguJyotIoJDUXfQYKPzjxV5daAyJL8u9jwLOOhfszSrvIB7EQ2LETkh8yJJRsRoKuFxVzSqpRrqUkMcPSRHgW00aN4LPguD
```

### ตัวอย่างที่ผิด:
```bash
# ❌ ผิด - API Key ขึ้นบรรทัดใหม่
STRIPE_SECRET_KEY=sk_test_51SHlguJyotIoJDUXfQYKPzjxV5daAyJL8u9jwLOOhfszSrvIB7EQ2LETkh8yJ
JRsRoKuFxVzSqpRrqUkMcPSRHgW00aN4LPguD
```

---

## ✅ 2. Restart Development Server

**สำคัญมาก!** หลังแก้ไข `.env.local` ต้อง restart server:

```bash
# หยุด server (Ctrl+C)
# รันใหม่
npm run dev
```

ไม่งั้น environment variables เก่าจะยังคงใช้อยู่!

---

## ✅ 3. ตรวจสอบ Stripe Dashboard

### เข้าไปที่ Stripe Dashboard:
1. ไปที่ https://dashboard.stripe.com/test/apikeys
2. ตรวจสอบว่าเปิด **Test Mode** อยู่ (สวิตช์มุมบนขวา)
3. ตรวจสอบว่า API Keys ตรงกับที่ใส่ใน `.env.local`

### ตรวจสอบ Connect Settings:
1. ไปที่ https://dashboard.stripe.com/test/settings/applications
2. ตรวจสอบว่า "Connect" เปิดใช้งานแล้ว
3. ดูว่ามี redirect URLs ที่ถูกต้อง

---

## ✅ 4. ตรวจสอบว่ามีร้านค้าหรือยัง

### ต้องสร้างร้านค้าก่อน!
ผู้ใช้ต้อง**สร้างร้านค้า**ก่อนจึงจะสามารถเชื่อมต่อ Stripe ได้:

1. ไปที่ Seller Dashboard
2. กรอกข้อมูลร้านค้า
3. รอ Admin อนุมัติ
4. หลังอนุมัติแล้ว → ไปที่เมนู "บัญชีรับเงิน"

---

## ✅ 5. เช็ค Console Logs

### เปิด Browser Console (F12):
```javascript
// ดูว่ามี error อะไร
// ระบบจะแสดง:
// - Received request: { userId, email, shopName }
// - Creating Stripe Connect account for: ...
// - Stripe account created: acct_xxx
```

### เปิด Terminal (Dev Server):
ดู logs ฝั่ง server:
```bash
Creating Stripe Connect account for: { userId: 'xxx', email: 'xxx', shopName: 'xxx' }
Stripe account created: acct_xxxxxxxxxxxxx
Account link created: https://connect.stripe.com/setup/...
```

---

## ✅ 6. ตรวจสอบ Email

Email ที่ส่งไปต้อง:
- ✅ เป็น email จริง (มี @ และ domain)
- ✅ ไม่ใช่ email ว่างเปล่า
- ✅ ตรงกับ email ที่ล็อกอินอยู่

---

## ✅ 7. ตรวจสอบ Firestore Rules

ต้องมีสิทธิ์ในการอ่าน/เขียน `shops` collection:

```javascript
// Firestore Rules
match /shops/{shopId} {
  allow read: if true; // หรือตามกฎที่ตั้งไว้
  allow write: if request.auth != null;
  allow update: if request.auth.uid == resource.data.ownerId;
}
```

---

## 🔍 Common Errors และวิธีแก้

### Error: "No such API key"
```
❌ Your API key is invalid or no longer exists
```
**วิธีแก้**: 
- ไปที่ Stripe Dashboard → API Keys
- สร้าง Secret Key ใหม่
- อัพเดทใน `.env.local`
- Restart server

---

### Error: "Invalid country"
```
❌ Invalid country: TH is not supported
```
**วิธีแก้**: 
ตรวจสอบว่า Stripe รองรับประเทศไทยในบัญชีของคุณ:
- ไปที่ Stripe Dashboard → Settings → Account
- เช็คว่า country = Thailand
- ถ้าไม่ใช่ ให้สร้างบัญชี Stripe ใหม่

---

### Error: "Account cannot be created"
```
❌ Cannot create account for this user
```
**วิธีแก้**: 
- ตรวจสอบว่า email ถูกต้อง
- ลองใช้ email อื่น
- เช็คว่าไม่มีบัญชี Stripe ซ้ำกับ email นี้แล้ว

---

### Error: "Missing required fields"
```
❌ Missing required fields
```
**วิธีแก้**: 
ตรวจสอบว่าส่งครบทั้ง 3 ค่า:
- `userId` (user.uid)
- `email` (user.email)
- `shopName` (shop.shopName)

---

## 🛠️ วิธีทดสอบ API ด้วย curl (ขั้นสูง)

### ทดสอบสร้างบัญชี:
```bash
curl -X POST http://localhost:3000/api/stripe/create-connect-account \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com",
    "shopName": "Test Shop"
  }'
```

ถ้าสำเร็จจะได้:
```json
{
  "success": true,
  "accountId": "acct_xxxxxxxxxxxxx",
  "onboardingUrl": "https://connect.stripe.com/setup/..."
}
```

---

## 📋 Checklist ก่อนทดสอบ

- [ ] ✅ Stripe API Keys ถูกต้องและครบถ้วน
- [ ] ✅ ไฟล์ `.env.local` ไม่มี line breaks ใน API Keys
- [ ] ✅ Restart dev server แล้ว
- [ ] ✅ เปิด Test Mode ใน Stripe Dashboard
- [ ] ✅ สร้างร้านค้าแล้วและได้รับการอนุมัติ
- [ ] ✅ Email ที่ใช้ถูกต้อง
- [ ] ✅ เช็ค Console และ Terminal logs

---

## 🆘 ยังแก้ไม่ได้?

1. **ลบ node_modules และติดตั้งใหม่**:
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

2. **Clear Next.js cache**:
```bash
Remove-Item -Recurse -Force .next
npm run dev
```

3. **ตรวจสอบ Stripe Status**:
ไปที่ https://status.stripe.com/ ดูว่า Stripe ทำงานปกติหรือไม่

4. **ดู Stripe Logs**:
ไปที่ https://dashboard.stripe.com/test/logs เพื่อดู API requests

---

## 📞 ติดต่อขอความช่วยเหลือ

ถ้ายังแก้ไม่ได้ ให้แนบข้อมูลเหล่านี้:
- Browser Console logs (F12)
- Terminal logs (จาก npm run dev)
- Stripe Dashboard logs
- Error message ที่แสดงบนหน้าจอ
